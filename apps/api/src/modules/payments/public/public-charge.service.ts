import { Inject, Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner, UuidV7 } from '@wattwisely/db';
import {
  AccountStatusPolicy,
  ChargeKey,
  HoldAuthoriser,
  HoldCreated,
  PaidSessionOpener,
  PAYMENT_GATEWAY,
  PaymentAccountRow,
  PaymentAccountStore,
  PaymentGateway,
  PaymentGatewayError,
  PaymentStore,
} from '@wattwisely/payments';
import { SessionRow } from '@wattwisely/session-engine';
import { PaymentErrors } from '../payment-errors';
import { ChargeKeyResolver } from './charge-key.resolver';
import { ChargePlaceLookup, PublicCharger, PublicConnector } from './charge-place.lookup';
import { ChargeViewBuilder } from './charge-view.builder';
import { ChargeDto } from './dto/charge.dto';
import { StartChargeRequestDto } from './dto/start-charge-request.dto';

/**
 * A driver's paid charge, with no login (Stripe Payments design, "Paid charge flow"): the
 * session opens at `authorising`, a hold for the company's hold amount is created on
 * its connected account, and the page confirms it with the card form. The hold's result
 * reaches us by webhook, or by the page asking to check, whichever comes first.
 */
@Injectable()
export class PublicChargeService {
  private readonly accounts = new PaymentAccountStore();
  private readonly payments = new PaymentStore();
  private readonly keys = new ChargeKeyResolver();
  private readonly opener = new PaidSessionOpener();
  private readonly authoriser = new HoldAuthoriser();

  constructor(
    private readonly runner: TransactionRunner,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    private readonly places: ChargePlaceLookup,
    private readonly views: ChargeViewBuilder,
  ) {}

  async start(body: StartChargeRequestDto): Promise<ChargeDto> {
    if (!this.gateway.isEnabled) {
      throw PaymentErrors.fromGateway(PaymentGatewayError.unavailable());
    }
    const charger = await this.runner.run(
      DatabaseSession.forChargerIdentity(body.charger_identity),
      (tx) => this.places.charger(tx, body.charger_identity),
    );
    if (!charger) {
      throw PaymentErrors.chargerNotFound();
    }
    return this.runner.run(DatabaseSession.forTenant(charger.tenantId), async (tx) => {
      const account = await this.requireActiveAccount(tx);
      const connector = await this.requireFreeConnector(tx, charger.id, body.ocpp_connector_id);
      return this.open(tx, { charger, connector, account });
    });
  }

  async status(key: string): Promise<ChargeDto> {
    const parsed = this.keys.parse(key);
    return this.runner.run(DatabaseSession.forTenant(parsed.tenantId), async (tx) => {
      const payment = await this.keys.resolve(tx, parsed);
      return this.views.build(tx, payment, key);
    });
  }

  /** The page confirmed the card: look at the hold now instead of waiting for the webhook. */
  async check(key: string): Promise<ChargeDto> {
    const parsed = this.keys.parse(key);
    return this.runner.run(DatabaseSession.forTenant(parsed.tenantId), async (tx) => {
      const payment = await this.keys.resolve(tx, parsed, true);
      if (payment.status === 'pending') {
        const hold = await this.gateway.getHold(
          payment.providerAccountId,
          payment.providerPaymentId,
        );
        await this.authoriser.apply(tx, payment, hold, new Date());
      }
      const current = await this.payments.findById(tx, payment.id);
      return this.views.build(tx, current ?? payment, key);
    });
  }

  private async open(
    tx: Transaction,
    at: { charger: PublicCharger; connector: PublicConnector; account: PaymentAccountRow },
  ): Promise<ChargeDto> {
    const now = new Date();
    const place = {
      tenantId: at.charger.tenantId,
      chargerId: at.charger.id,
      connectorId: at.connector.id,
    };
    const session = await this.opener.open(tx, place, now);
    if (!session.tariffVersionId || !session.currency) {
      throw PaymentErrors.noTariff();
    }
    const hold = await this.hold(at, session.id, { currency: session.currency, ...place });
    const { payment, key } = await this.recordHold(tx, at, session, hold);
    return this.views.build(tx, payment, key, hold.clientSecret);
  }

  /** The payment row for a new hold, and the key the driver's page follows it with. */
  private async recordHold(
    tx: Transaction,
    at: { charger: PublicCharger; account: PaymentAccountRow },
    session: SessionRow,
    hold: HoldCreated,
  ) {
    const paymentId = UuidV7.create();
    const { key, hash } = ChargeKey.issue(at.charger.tenantId, paymentId);
    const payment = await this.payments.insert(tx, {
      id: paymentId,
      tenantId: at.charger.tenantId,
      sessionId: session.id,
      currency: session.currency ?? '',
      holdAmount: at.account.holdAmount,
      provider: this.gateway.provider,
      providerAccountId: at.account.providerAccountId,
      providerPaymentId: hold.providerPaymentId,
      accessKeyHash: hash,
    });
    return { payment, key };
  }

  private async hold(
    at: { charger: PublicCharger; connector: PublicConnector; account: PaymentAccountRow },
    sessionId: string,
    details: { currency: string; tenantId: string; chargerId: string; connectorId: string },
  ) {
    try {
      return await this.gateway.createHold({
        accountId: at.account.providerAccountId,
        amount: at.account.holdAmount,
        currency: details.currency,
        description: `EV charging at ${at.charger.identity} ${at.connector.label}`,
        metadata: { sessionId, ...details },
        idempotencyKey: `hold:${sessionId}`,
      });
    } catch (error) {
      throw PaymentErrors.fromGateway(error);
    }
  }

  private async requireActiveAccount(tx: Transaction): Promise<PaymentAccountRow> {
    const account = await this.accounts.findCurrent(tx);
    if (!account || !AccountStatusPolicy.canTakePayments(account.status)) {
      throw PaymentErrors.paymentsNotAccepted();
    }
    return account;
  }

  private async requireFreeConnector(tx: Transaction, chargerId: string, ocppConnectorId: number) {
    const connector = await this.places.connector(tx, chargerId, ocppConnectorId);
    if (!connector) {
      throw PaymentErrors.connectorNotFound();
    }
    if (await this.places.isBusy(tx, connector.id)) {
      throw PaymentErrors.connectorBusy();
    }
    return connector;
  }
}

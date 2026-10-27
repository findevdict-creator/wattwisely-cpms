import { eq, sql } from 'drizzle-orm';
import { chargingSessions, Transaction, UuidV7 } from '@wattwisely/db';
import { SessionRow, SessionStates } from '@wattwisely/session-engine';
import { ChargeKey } from '../gateway/charge-key';
import { HoldState, PaymentGateway } from '../gateway/payment-gateway';
import { PaymentGatewayError } from '../gateway/payment-gateway.error';
import { UsableSavedCard } from '../rules/saved-card.lookup';
import { PaymentAccountRow, PaymentRow } from '../store/payment-rows';
import { PaymentStore } from '../store/payment-store';
import { CommandQueuer } from './command-queuer';
import { HoldAuthoriser } from './hold-authoriser';
import { SessionAnnouncer } from './session-announcer';

/** A hold to take from a saved card for one session. */
export interface SavedCardHold {
  session: SessionRow;
  account: PaymentAccountRow;
  card: UsableSavedCard;
  holdAmount: number;
  description: string;
}

/** A paid session that cannot be paid: no saved card, no payment account, or the bank said no. */
export interface HoldRefusal {
  session: SessionRow;
  account: PaymentAccountRow | null;
  holdAmount: number;
  message: string;
}

/** The payment row written, and the key the driver's page may follow it with. */
export interface PlacedHold {
  payment: PaymentRow;
  chargeKey: string;
  hold: HoldState;
}

/**
 * Takes the hold for a paid session from the driver's saved card (module 19), with no page
 * to confirm it: for a start from the app the session is still `authorising`, and a
 * confirmed hold sends RemoteStart as the card form would have; for a card tap at the
 * charger the session is already running, and a refused hold stops it at once. The
 * payment row carries a charge key, so the same page follows it. A provider outage is
 * thrown for the caller to try again; a refusal is final.
 */
export class SavedCardHoldPlacer {
  static readonly REFUSED_FLAG = 'hold_refused';

  private readonly payments = new PaymentStore();
  private readonly authoriser = new HoldAuthoriser();
  private readonly commands = new CommandQueuer();
  private readonly announcer = new SessionAnnouncer();

  constructor(private readonly gateway: PaymentGateway) {}

  async place(tx: Transaction, request: SavedCardHold, now: Date): Promise<PlacedHold> {
    const hold = await this.hold(request);
    const paymentId = UuidV7.create();
    const { key, hash } = ChargeKey.issue(request.session.tenantId, paymentId);
    const payment = await this.payments.insert(tx, {
      id: paymentId,
      tenantId: request.session.tenantId,
      sessionId: request.session.id,
      currency: request.session.currency ?? '',
      holdAmount: request.holdAmount,
      provider: this.gateway.provider,
      providerAccountId: request.account.providerAccountId,
      providerPaymentId: hold.providerPaymentId,
      paymentMethodId: request.card.card.id,
      cardBrand: request.card.card.brand,
      cardLast4: request.card.card.last4,
      accessKeyHash: hash,
    });
    await this.authoriser.apply(tx, payment, hold, now);
    if (hold.status === 'failed') {
      await this.stopRunning(tx, request.session);
    }
    const current = await this.payments.findById(tx, paymentId);
    return { payment: current ?? payment, chargeKey: key, hold };
  }

  /**
   * No hold can be taken at all: the session gets a failed payment row, so it is not tried
   * again and the portal shows why, and a running charge is stopped.
   */
  async refuse(tx: Transaction, refusal: HoldRefusal, now: Date): Promise<PaymentRow> {
    const payment = await this.payments.insert(tx, {
      id: UuidV7.create(),
      tenantId: refusal.session.tenantId,
      sessionId: refusal.session.id,
      status: 'failed',
      currency: refusal.session.currency ?? '',
      holdAmount: refusal.holdAmount,
      provider: this.gateway.provider,
      providerAccountId: refusal.account?.providerAccountId ?? 'none',
      providerPaymentId: `refused:${refusal.session.id}`,
      failureCode: 'no_payment_method',
      failureMessage: refusal.message,
      failedAt: now,
      accessKeyHash: ChargeKey.issue(refusal.session.tenantId, refusal.session.id).hash,
    });
    await this.stopRunning(tx, refusal.session);
    return payment;
  }

  /** The provider's answer; a card refusal becomes a failed hold rather than an error. */
  private async hold(request: SavedCardHold): Promise<HoldState> {
    const { session, card } = request;
    try {
      return await this.gateway.createSavedCardHold({
        accountId: request.account.providerAccountId,
        customerId: card.customerId,
        providerPaymentMethodId: card.card.providerPaymentMethodId,
        amount: request.holdAmount,
        currency: session.currency ?? '',
        description: request.description,
        metadata: SavedCardHoldPlacer.metadataOf(session),
        idempotencyKey: `hold:${session.id}`,
      });
    } catch (error) {
      if (error instanceof PaymentGatewayError && error.code === 'card_declined') {
        return SavedCardHoldPlacer.refused(session.id, error.message);
      }
      throw error;
    }
  }

  /** A session the charger already runs cannot be declined into not_started: it is stopped and flagged. */
  private async stopRunning(tx: Transaction, session: SessionRow): Promise<void> {
    if (!SessionStates.isActive(session.status) || session.ocppTransactionId === null) {
      return;
    }
    await this.commands.remoteStop(tx, session, session.ocppTransactionId);
    await tx
      .update(chargingSessions)
      .set({
        reviewFlags: sql`${chargingSessions.reviewFlags} || ${JSON.stringify([SavedCardHoldPlacer.REFUSED_FLAG])}::jsonb`,
        updatedAt: new Date(),
      })
      .where(eq(chargingSessions.id, session.id));
    await this.announcer.announce(tx, session, { status: session.status, paymentStatus: 'failed' });
  }

  private static metadataOf(session: SessionRow): Record<string, string> {
    return {
      sessionId: session.id,
      tenantId: session.tenantId,
      chargerId: session.chargerId,
      connectorId: session.connectorId,
    };
  }

  private static refused(sessionId: string, message: string): HoldState {
    return {
      providerPaymentId: `refused:${sessionId}`,
      status: 'failed',
      amount: 0,
      amountCapturable: null,
      amountCaptured: null,
      card: null,
      failure: { code: 'card_declined', message },
      clientSecret: null,
    };
  }
}

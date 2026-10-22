import { Inject, Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { PAYMENT_GATEWAY, PaymentGateway, PaymentRow } from '@wattwisely/payments';
import { SessionStore } from '@wattwisely/session-engine';
import { PaymentErrors } from '../payment-errors';
import { ChargePlaceLookup } from './charge-place.lookup';
import { ChargeReceiptLookup } from './charge-receipt.lookup';
import { ChargeDto } from './dto/charge.dto';
import { StopCommandLookup } from './stop-command.lookup';

/**
 * Puts together what the driver's page sees for one payment: the session, where it
 * happens, the receipt once priced, and the provider's client secret while the card
 * form still waits.
 */
@Injectable()
export class ChargeViewBuilder {
  private readonly sessions = new SessionStore();
  private readonly receipts = new ChargeReceiptLookup();
  private readonly stops = new StopCommandLookup();

  constructor(
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    private readonly places: ChargePlaceLookup,
  ) {}

  /** The client secret is passed in right after the hold was created; otherwise it is re-read. */
  async build(
    tx: Transaction,
    payment: PaymentRow,
    chargeKey: string,
    clientSecret: string | null = null,
  ): Promise<ChargeDto> {
    const session = await this.sessions.findById(tx, payment.sessionId);
    if (!session) {
      throw PaymentErrors.notFound();
    }
    const isWaiting = payment.status === 'pending';
    return new ChargeDto(payment, session, {
      chargeKey,
      ...(await this.places.placeOf(tx, session.connectorId)),
      outcome: await this.receipts.of(tx, session.id),
      isStopRequested: await this.stops.isPending(tx, session.id),
      clientSecret: isWaiting ? (clientSecret ?? (await this.clientSecret(payment))) : null,
      publishableKey: isWaiting ? this.gateway.publishableKey() : null,
    });
  }

  /** Re-reads the hold for its client secret when the page comes back before confirming. */
  private async clientSecret(payment: PaymentRow): Promise<string | null> {
    try {
      const hold = await this.gateway.getHold(payment.providerAccountId, payment.providerPaymentId);
      return hold.clientSecret;
    } catch {
      return null;
    }
  }
}

import { Transaction } from '@wattwisely/db';
import {
  ChargerEventNotifier,
  SessionEventData,
  SessionRow,
  SessionState,
} from '@wattwisely/session-engine';
import { PaymentStatus } from '../store/payment-rows';

/** Tells the live stream that a paid session or its payment moved on, as session.updated. */
export class SessionAnnouncer {
  constructor(private readonly notifier = new ChargerEventNotifier()) {}

  async announce(
    tx: Transaction,
    session: SessionRow,
    change: { status: SessionState; paymentStatus: PaymentStatus | null },
  ): Promise<void> {
    const data = SessionEventData.of(session, {
      status: change.status,
      energyWh: session.energyWh,
      grossAmount: session.grossAmount,
    });
    await this.notifier.publish(
      tx,
      { id: session.chargerId, tenantId: session.tenantId },
      'session.updated',
      { ...data, payment_status: change.paymentStatus },
    );
  }
}

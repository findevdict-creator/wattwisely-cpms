import { chargingSessions, SessionPaymentRule, Transaction, UuidV7 } from '@wattwisely/db';
import { RemoteStartTag } from '@wattwisely/ocpp-contracts';
import {
  SessionColumns,
  SessionRow,
  SessionTransitions,
  TariffVersionStore,
} from '@wattwisely/session-engine';
import { PaymentRules } from '../rules/payment-rule';

/** Where a session started from a page or the app is about to happen, and for whom. */
export interface PaidSessionPlace {
  tenantId: string;
  chargerId: string;
  connectorId: string;
  /** The driver record behind a start from the app (module 19); null for an anonymous guest. */
  driverId?: string | null;
  /** How it is started: the QR page's card by default, a chat, or a login in the app. */
  startSource?: 'guest_card' | 'chat' | 'account';
  /** The rule that decided who pays; a guest always pays. */
  paymentRule?: SessionPaymentRule;
}

/**
 * Opens a session started away from the charger at `authorising`, before any card hold
 * exists (Stripe Payments design, "Paid charge flow", step 2). Like the gateway does for a
 * card start, it copies the site's time zone and the tariff version in force, so later
 * edits never change the price. The idTag is the platform's own remote start tag; the
 * charger will present it back. A free start from the app (module 19) opens the same way
 * and is moved on at once, with no hold.
 */
export class PaidSessionOpener {
  constructor(
    private readonly tariffs = new TariffVersionStore(),
    private readonly transitions = new SessionTransitions(),
  ) {}

  async open(tx: Transaction, place: PaidSessionPlace, now: Date): Promise<SessionRow> {
    const snapshot = await this.tariffs.snapshotForCharger(tx, place.chargerId);
    if (!snapshot) {
      throw new Error(`Charger ${place.chargerId} has no site`);
    }
    const rule = place.paymentRule ?? PaymentRules.GUEST;
    const rows = await tx
      .insert(chargingSessions)
      .values({
        id: UuidV7.create(),
        tenantId: place.tenantId,
        chargerId: place.chargerId,
        connectorId: place.connectorId,
        driverId: place.driverId ?? null,
        ...snapshot,
        idTag: RemoteStartTag.generate(),
        status: 'authorising',
        startedAt: now,
        lastEventAt: now,
        isPaid: rule.outcome === 'pay',
        startSource: place.startSource ?? 'guest_card',
        paymentRule: rule,
      })
      .returning(SessionColumns.SELECT);
    const session = rows[0] as SessionRow;
    await this.transitions.created(tx, session, 'hold_requested', now);
    return session;
  }
}

import { chargingSessions, Transaction, UuidV7 } from '@wattwisely/db';
import { RemoteStartTag } from '@wattwisely/ocpp-contracts';
import {
  SessionColumns,
  SessionRow,
  SessionTransitions,
  TariffVersionStore,
} from '@wattwisely/session-engine';

/** Where a paid session is about to happen. */
export interface PaidSessionPlace {
  tenantId: string;
  chargerId: string;
  connectorId: string;
}

/**
 * Opens a paid session at `authorising`, before any card hold exists (Stripe Payments
 * design, "Paid charge flow", step 2). Like the gateway does for a free session, it copies
 * the site's time zone and the tariff version in force, so later edits never change the
 * price. The idTag is the platform's own remote start tag; the charger will present it back.
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
    const rows = await tx
      .insert(chargingSessions)
      .values({
        id: UuidV7.create(),
        ...place,
        ...snapshot,
        idTag: RemoteStartTag.generate(),
        status: 'authorising',
        startedAt: now,
        lastEventAt: now,
        isPaid: true,
      })
      .returning(SessionColumns.SELECT);
    const session = rows[0] as SessionRow;
    await this.transitions.created(tx, session, 'hold_requested', now);
    return session;
  }
}

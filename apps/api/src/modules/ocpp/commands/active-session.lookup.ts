import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { chargingSessions, Transaction, UuidV7 } from '@wattwisely/db';

/** The running session a remote stop names, with the OCPP transaction id the charger knows it by. */
export interface ActiveSessionRef {
  id: string;
  ocppTransactionId: number;
}

/** Finds the running session on a charger for RemoteStopTransaction. */
@Injectable()
export class ActiveSessionLookup {
  async find(
    tx: Transaction,
    chargerId: string,
    sessionId: string,
  ): Promise<ActiveSessionRef | null> {
    if (!UuidV7.isUuid(sessionId)) {
      return null;
    }
    const rows = await tx
      .select({ id: chargingSessions.id, ocppTransactionId: chargingSessions.ocppTransactionId })
      .from(chargingSessions)
      .where(
        and(
          eq(chargingSessions.id, sessionId),
          eq(chargingSessions.chargerId, chargerId),
          eq(chargingSessions.status, 'charging'),
        ),
      );
    return rows[0] ?? null;
  }
}

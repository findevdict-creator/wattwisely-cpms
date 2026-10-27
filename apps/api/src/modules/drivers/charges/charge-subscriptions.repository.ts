import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { sessionSubscriptions, Transaction, UuidV7 } from '@wattwisely/db';

/** What a driver asked to hear about one charge. */
export interface ChargeSubscription {
  email: string;
  wantsStarted: boolean;
  wantsNearlyFull: boolean;
  wantsFinished: boolean;
  wantsIdleWarning: boolean;
  isUndeliverable: boolean;
}

/** Reads and writes the e-mail subscription of one session. One per session. */
@Injectable()
export class ChargeSubscriptionsRepository {
  async find(tx: Transaction, sessionId: string): Promise<ChargeSubscription | null> {
    const [row] = await tx
      .select({
        email: sessionSubscriptions.email,
        wantsStarted: sessionSubscriptions.wantsStarted,
        wantsNearlyFull: sessionSubscriptions.wantsNearlyFull,
        wantsFinished: sessionSubscriptions.wantsFinished,
        wantsIdleWarning: sessionSubscriptions.wantsIdleWarning,
        isUndeliverable: sessionSubscriptions.isUndeliverable,
      })
      .from(sessionSubscriptions)
      .where(eq(sessionSubscriptions.sessionId, sessionId));
    return row ?? null;
  }

  /** A new address is tried afresh, even if the old one bounced. */
  async save(
    tx: Transaction,
    at: { tenantId: string; sessionId: string },
    wanted: Omit<ChargeSubscription, 'isUndeliverable'>,
  ): Promise<void> {
    await tx
      .insert(sessionSubscriptions)
      .values({ id: UuidV7.create(), ...at, ...wanted })
      .onConflictDoUpdate({
        target: [sessionSubscriptions.tenantId, sessionSubscriptions.sessionId],
        set: {
          ...wanted,
          isUndeliverable: sql`${sessionSubscriptions.isUndeliverable} and ${sessionSubscriptions.email} = excluded.email`,
          version: sql`${sessionSubscriptions.version} + 1`,
          updatedAt: new Date(),
        },
      });
  }

  async remove(tx: Transaction, sessionId: string): Promise<void> {
    await tx.delete(sessionSubscriptions).where(eq(sessionSubscriptions.sessionId, sessionId));
  }
}

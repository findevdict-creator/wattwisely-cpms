import { Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { driverDevices, pushDeliveries, Transaction, UuidV7 } from '@wattwisely/db';
import { PushTarget } from '@wattwisely/push';

/** One push claimed for a session. */
export interface PushClaim {
  tenantId: string;
  sessionId: string;
  kind: string;
  driverAccountId: string;
}

/** The pushes sent about sessions, and the phones they go to (module 34). */
@Injectable()
export class PushDeliveriesRepository {
  /** The new delivery's id, or null when this push was claimed before: each goes once. */
  async claim(tx: Transaction, claim: PushClaim): Promise<string | null> {
    const rows = await tx
      .insert(pushDeliveries)
      .values({ id: UuidV7.create(), ...claim })
      .onConflictDoNothing()
      .returning({ id: pushDeliveries.id });
    return rows[0]?.id ?? null;
  }

  async finish(tx: Transaction, id: string, error: string | null): Promise<void> {
    await tx
      .update(pushDeliveries)
      .set({ sentAt: error ? null : new Date(), lastError: error, updatedAt: new Date() })
      .where(eq(pushDeliveries.id, id));
  }

  async devices(tx: Transaction, driverAccountId: string): Promise<PushTarget[]> {
    return tx
      .select({ platform: driverDevices.platform, token: driverDevices.token })
      .from(driverDevices)
      .where(
        and(eq(driverDevices.driverAccountId, driverAccountId), isNull(driverDevices.invalidAt)),
      );
  }

  /** The service said the app is gone from the phone. */
  async markInvalid(tx: Transaction, token: string): Promise<void> {
    await tx
      .update(driverDevices)
      .set({ invalidAt: new Date(), updatedAt: new Date() })
      .where(eq(driverDevices.token, token));
  }
}

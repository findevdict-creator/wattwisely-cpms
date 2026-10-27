import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { memberNotificationSettings, Transaction, UuidV7 } from '@wattwisely/db';

/** A member's quiet hours, as saved. */
export interface QuietHoursRecord {
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timeZone: string;
}

/** Reads and saves a member's notification settings. One row per membership. */
@Injectable()
export class NotificationSettingsRepository {
  async find(tx: Transaction, membershipId: string): Promise<QuietHoursRecord | null> {
    const [row] = await tx
      .select({
        quietHoursStart: memberNotificationSettings.quietHoursStart,
        quietHoursEnd: memberNotificationSettings.quietHoursEnd,
        timeZone: memberNotificationSettings.timeZone,
      })
      .from(memberNotificationSettings)
      .where(eq(memberNotificationSettings.membershipId, membershipId));
    return row ?? null;
  }

  async save(tx: Transaction, tenantId: string, membershipId: string, settings: QuietHoursRecord) {
    await tx
      .insert(memberNotificationSettings)
      .values({ id: UuidV7.create(), tenantId, membershipId, ...settings })
      .onConflictDoUpdate({
        target: [memberNotificationSettings.tenantId, memberNotificationSettings.membershipId],
        set: {
          ...settings,
          version: sql`${memberNotificationSettings.version} + 1`,
          updatedAt: new Date(),
        },
      });
  }
}

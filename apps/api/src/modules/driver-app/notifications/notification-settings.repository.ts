import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { driverAccounts, Transaction } from '@wattwisely/db';

/** What a driver hears about their charges, and how (module 34, NTF-01). */
export interface NotificationSettings {
  wantsStarted: boolean;
  wantsNearlyFull: boolean;
  wantsFinished: boolean;
  wantsIdleWarning: boolean;
  isPushEnabled: boolean;
  isEmailEnabled: boolean;
}

/** The settings with the address the e-mails go to. */
export interface NotificationSettingsRow extends NotificationSettings {
  email: string;
}

/** Reads and writes the notification columns of driver_accounts. */
@Injectable()
export class NotificationSettingsRepository {
  async find(tx: Transaction, accountId: string): Promise<NotificationSettingsRow | null> {
    const [row] = await tx
      .select({
        email: driverAccounts.email,
        wantsStarted: driverAccounts.wantsStarted,
        wantsNearlyFull: driverAccounts.wantsNearlyFull,
        wantsFinished: driverAccounts.wantsFinished,
        wantsIdleWarning: driverAccounts.wantsIdleWarning,
        isPushEnabled: driverAccounts.isPushEnabled,
        isEmailEnabled: driverAccounts.isEmailEnabled,
      })
      .from(driverAccounts)
      .where(eq(driverAccounts.id, accountId));
    return row ?? null;
  }

  async update(tx: Transaction, accountId: string, settings: NotificationSettings): Promise<void> {
    await tx
      .update(driverAccounts)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(driverAccounts.id, accountId));
  }
}

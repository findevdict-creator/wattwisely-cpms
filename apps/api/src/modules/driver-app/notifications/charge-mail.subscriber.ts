import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { ChargeSubscriptionsRepository } from '../../drivers/charges/charge-subscriptions.repository';
import { NotificationSettingsRepository } from './notification-settings.repository';

/**
 * E-mails about a charge started from the app (module 34): when the driver turned e-mail on,
 * the charge gets the same subscription the QR page gives a guest, with the login's address
 * and the driver's choices, and the worker's driver e-mails do the rest (module 11).
 */
@Injectable()
export class ChargeMailSubscriber {
  private readonly settings = new NotificationSettingsRepository();
  private readonly subscriptions = new ChargeSubscriptionsRepository();

  /** Runs inside the session's tenant. */
  async subscribe(
    tx: Transaction,
    accountId: string,
    at: { tenantId: string; sessionId: string },
  ): Promise<void> {
    const settings = await this.settings.find(tx, accountId);
    if (!settings?.isEmailEnabled) {
      return;
    }
    await this.subscriptions.save(tx, at, {
      email: settings.email,
      wantsStarted: settings.wantsStarted,
      wantsNearlyFull: settings.wantsNearlyFull,
      wantsFinished: settings.wantsFinished,
      wantsIdleWarning: settings.wantsIdleWarning,
    });
  }
}

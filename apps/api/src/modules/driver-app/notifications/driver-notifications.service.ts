import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { RequestAuth } from '../../../common/request/request-auth';
import { DriverDevicesRepository } from './driver-devices.repository';
import { NotificationSettingsDto } from './dto/notification-settings.dto';
import { RegisterDeviceRequestDto } from './dto/register-device-request.dto';
import { UpdateNotificationSettingsRequestDto } from './dto/update-notification-settings-request.dto';
import { NotificationSettingsRepository } from './notification-settings.repository';

/**
 * The driver's notifications (module 34): which charge events they hear about, by push to
 * the phones they are signed in on and by e-mail, and the phones themselves. The worker sends.
 */
@Injectable()
export class DriverNotificationsService {
  private readonly settings = new NotificationSettingsRepository();

  constructor(
    private readonly runner: TransactionRunner,
    private readonly devices: DriverDevicesRepository,
  ) {}

  get(auth: RequestAuth): Promise<NotificationSettingsDto> {
    return this.run((tx) => this.describe(tx, auth.requireDriver().id));
  }

  update(
    auth: RequestAuth,
    body: UpdateNotificationSettingsRequestDto,
  ): Promise<NotificationSettingsDto> {
    const accountId = auth.requireDriver().id;
    return this.run(async (tx) => {
      await this.settings.update(tx, accountId, {
        wantsStarted: body.started,
        wantsNearlyFull: body.nearly_full,
        wantsFinished: body.finished,
        wantsIdleWarning: body.idle_warning,
        isPushEnabled: body.is_push_enabled,
        isEmailEnabled: body.is_email_enabled,
      });
      return this.describe(tx, accountId);
    });
  }

  async register(auth: RequestAuth, body: RegisterDeviceRequestDto): Promise<void> {
    const device = { platform: body.platform, token: body.token.trim() };
    await this.run((tx) => this.devices.register(tx, auth.requireDriver().id, device));
  }

  async unregister(auth: RequestAuth, token: string): Promise<void> {
    await this.run((tx) => this.devices.remove(tx, auth.requireDriver().id, token));
  }

  private async describe(tx: Transaction, accountId: string): Promise<NotificationSettingsDto> {
    const row = await this.settings.find(tx, accountId);
    if (!row) {
      throw new Error(`driver account ${accountId} vanished`);
    }
    return new NotificationSettingsDto(row, await this.devices.count(tx, accountId));
  }

  private run<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.runner.run(DatabaseSession.anonymous(), work);
  }
}

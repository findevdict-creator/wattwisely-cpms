import { Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { ChargeKeyResolver } from '../../payments/public/charge-key.resolver';
import { ChargeSubscriptionsRepository } from './charge-subscriptions.repository';
import { ChargeNotificationsDto } from './dto/charge-notifications.dto';
import { UpdateChargeNotificationsRequestDto } from './dto/update-charge-notifications-request.dto';

/**
 * The driver's e-mail updates for one charge (story NTF-01), from the page that holds the
 * charge key: no account, the address is kept with the session only. The worker sends.
 */
@Injectable()
export class ChargeNotificationsService {
  private readonly keys = new ChargeKeyResolver();

  constructor(
    private readonly runner: TransactionRunner,
    private readonly subscriptions: ChargeSubscriptionsRepository,
  ) {}

  async get(key: string): Promise<ChargeNotificationsDto> {
    const parsed = this.keys.parse(key);
    return this.runner.run(DatabaseSession.forTenant(parsed.tenantId), async (tx) => {
      const payment = await this.keys.resolve(tx, parsed);
      return new ChargeNotificationsDto(await this.subscriptions.find(tx, payment.sessionId));
    });
  }

  async update(
    key: string,
    request: UpdateChargeNotificationsRequestDto,
  ): Promise<ChargeNotificationsDto> {
    const parsed = this.keys.parse(key);
    return this.runner.run(DatabaseSession.forTenant(parsed.tenantId), async (tx) => {
      const payment = await this.keys.resolve(tx, parsed);
      await this.subscriptions.save(
        tx,
        { tenantId: parsed.tenantId, sessionId: payment.sessionId },
        {
          email: request.email.trim(),
          wantsStarted: request.started,
          wantsNearlyFull: request.nearly_full,
          wantsFinished: request.finished,
          wantsIdleWarning: request.idle_warning,
        },
      );
      return new ChargeNotificationsDto(await this.subscriptions.find(tx, payment.sessionId));
    });
  }

  /** No more e-mails about this charge, not even the receipt. */
  async remove(key: string): Promise<ChargeNotificationsDto> {
    const parsed = this.keys.parse(key);
    return this.runner.run(DatabaseSession.forTenant(parsed.tenantId), async (tx) => {
      const payment = await this.keys.resolve(tx, parsed);
      await this.subscriptions.remove(tx, payment.sessionId);
      return new ChargeNotificationsDto(null);
    });
  }
}

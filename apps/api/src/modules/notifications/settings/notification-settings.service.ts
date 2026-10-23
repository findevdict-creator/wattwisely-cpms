import { HttpStatus, Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { ProblemException } from '../../../common/problem/problem.exception';
import { TenantAccess } from '../../../common/tenant/tenant-access';
import { NotificationSettingsDto } from './dto/notification-settings.dto';
import { UpdateNotificationSettingsRequestDto } from './dto/update-notification-settings-request.dto';
import { NotificationSettingsRepository } from './notification-settings.repository';

/** The caller's own quiet hours in the chosen tenant (story NTF-03). */
@Injectable()
export class NotificationSettingsService {
  static readonly NONE = { quietHoursStart: null, quietHoursEnd: null, timeZone: 'UTC' };

  constructor(
    private readonly runner: TransactionRunner,
    private readonly settings: NotificationSettingsRepository,
  ) {}

  async get(access: TenantAccess): Promise<NotificationSettingsDto> {
    const saved = await this.runner.run(DatabaseSession.forTenant(access.tenant.id), (tx) =>
      this.settings.find(tx, access.membershipId),
    );
    return new NotificationSettingsDto(saved ?? NotificationSettingsService.NONE);
  }

  async update(
    access: TenantAccess,
    request: UpdateNotificationSettingsRequestDto,
  ): Promise<NotificationSettingsDto> {
    const start = request.quiet_hours_start ?? null;
    const end = request.quiet_hours_end ?? null;
    if ((start === null) !== (end === null) || (start !== null && start === end)) {
      throw new ProblemException(
        HttpStatus.BAD_REQUEST,
        'validation_failed',
        'Give quiet hours a start and a different end, or leave both empty.',
      );
    }
    const settings = { quietHoursStart: start, quietHoursEnd: end, timeZone: request.time_zone };
    await this.runner.run(DatabaseSession.forTenant(access.tenant.id), (tx) =>
      this.settings.save(tx, access.tenant.id, access.membershipId, settings),
    );
    return new NotificationSettingsDto(settings);
  }
}

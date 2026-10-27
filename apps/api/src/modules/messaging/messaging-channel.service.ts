import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { ApiConfig } from '../../config/api.config';
import { SitePermissionChecker } from '../../common/permissions/site-permission.checker';
import { RequestAuth } from '../../common/request/request-auth';
import { TenantAccess } from '../../common/tenant/tenant-access';
import { ChannelWriter } from './channel.writer';
import { MessagingChannelDto } from './dto/messaging-channel.dto';
import { UpdateMessagingChannelRequestDto } from './dto/update-messaging-channel-request.dto';
import { ChannelRecord } from './messaging-record';
import { MessagingRepository } from './messaging.repository';

/**
 * A tenant's WhatsApp channel (module 17): the number drivers write to, read and saved by
 * someone with messaging:manage for the whole company.
 */
@Injectable()
export class MessagingChannelService {
  static readonly WEBHOOK_PATH = '/v1/public/messaging/whatsapp';

  constructor(
    private readonly runner: TransactionRunner,
    private readonly repository: MessagingRepository,
    private readonly writer: ChannelWriter,
    private readonly config: ApiConfig,
  ) {}

  async get(access: TenantAccess): Promise<MessagingChannelDto> {
    MessagingChannelService.requireManage(access);
    const record = await this.run(access, (tx) => this.repository.findChannel(tx));
    return this.dto(record);
  }

  async update(
    auth: RequestAuth,
    version: number,
    request: UpdateMessagingChannelRequestDto,
  ): Promise<MessagingChannelDto> {
    const access = MessagingChannelService.requireManage(auth.requireAccess());
    const record = await this.run(access, (tx) => this.writer.save(tx, auth, { version, request }));
    return this.dto(record);
  }

  dto(record: ChannelRecord | null): MessagingChannelDto {
    return new MessagingChannelDto(record, {
      webhookUrl: `${this.config.apiUrl.replace(/\/+$/, '')}${MessagingChannelService.WEBHOOK_PATH}`,
      isPlatformTokenConfigured: this.config.whatsappAccessToken.length > 0,
    });
  }

  static requireManage(access: TenantAccess): TenantAccess {
    SitePermissionChecker.requireWholeTenant(access, 'messaging:manage');
    return access;
  }

  private run<T>(access: TenantAccess, work: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.runner.run(DatabaseSession.forTenant(access.tenant.id), work);
  }
}

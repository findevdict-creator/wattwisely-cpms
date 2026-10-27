import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { TenantEntitlementsRepository } from '../../common/entitlements/tenant-entitlements.repository';
import { ChannelRecord } from './messaging-record';
import { MessagingRepository } from './messaging.repository';

/**
 * From the number a message came to, to the tenant whose channel it is (module 17). The lookup
 * runs before the tenant is known, under the phone-number RLS policy; whether the tenant has the
 * add-on is checked inside its own transaction afterwards.
 */
@Injectable()
export class ChannelResolver {
  static readonly MODULE_KEY = 'messaging_charging';

  constructor(
    private readonly runner: TransactionRunner,
    private readonly channels: MessagingRepository,
    private readonly entitlements: TenantEntitlementsRepository,
  ) {}

  /** The active channel behind the provider's number id, or null. */
  async resolve(phoneNumberId: string): Promise<ChannelRecord | null> {
    const channel = await this.runner.run(
      DatabaseSession.forMessagingPhoneNumber(phoneNumberId),
      (tx) => this.channels.findChannel(tx),
    );
    return channel?.isActive ? channel : null;
  }

  async isEntitled(tx: Transaction, tenantId: string): Promise<boolean> {
    const entitlements = await this.entitlements.load(tx, tenantId);
    return entitlements.isModuleEnabled(ChannelResolver.MODULE_KEY);
  }
}

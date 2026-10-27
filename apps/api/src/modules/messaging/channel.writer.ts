import { Injectable } from '@nestjs/common';
import { Transaction, UuidV7 } from '@wattwisely/db';
import { AuditRecorder } from '../../common/audit/audit.recorder';
import { RequestAuth } from '../../common/request/request-auth';
import { VersionConflict } from '../../common/problem/version-conflict';
import { UpdateMessagingChannelRequestDto } from './dto/update-messaging-channel-request.dto';
import { MessagingErrors } from './messaging-errors';
import { ChannelRecord } from './messaging-record';
import { ChannelWrite, MessagingRepository } from './messaging.repository';

/** Saves a tenant's channel, once or again, and writes the audit entry (module 17). */
@Injectable()
export class ChannelWriter {
  constructor(
    private readonly repository: MessagingRepository,
    private readonly audit: AuditRecorder,
  ) {}

  /** Returns the channel as saved. */
  async save(
    tx: Transaction,
    auth: RequestAuth,
    change: { version: number; request: UpdateMessagingChannelRequestDto },
  ): Promise<ChannelRecord> {
    const before = await this.repository.findChannel(tx);
    const write = ChannelWriter.writeOf(change.request, before);
    const isSaved = await this.write(tx, auth, before, { ...change, write });
    if (!isSaved) {
      throw VersionConflict.exception();
    }
    const after = (await this.repository.findChannel(tx)) as ChannelRecord;
    await this.record(tx, auth, before, after);
    return after;
  }

  private static writeOf(
    request: UpdateMessagingChannelRequestDto,
    before: ChannelRecord | null,
  ): ChannelWrite {
    return {
      phoneNumberId: request.phone_number_id.trim(),
      displayPhoneNumber: request.display_phone_number.trim(),
      accessToken: request.access_token?.trim(),
      greeting: request.greeting?.trim() ?? before?.greeting ?? '',
      isActive: request.is_active ?? before?.isActive ?? true,
    };
  }

  private async write(
    tx: Transaction,
    auth: RequestAuth,
    before: ChannelRecord | null,
    change: { version: number; write: ChannelWrite },
  ): Promise<boolean> {
    const accountId = auth.requireAccount().id;
    try {
      if (before) {
        return await this.repository.updateChannel(
          tx,
          { id: before.id, accountId },
          change.write,
          change.version,
        );
      }
      if (change.version !== 0) {
        return false;
      }
      const tenantId = auth.requireAccess().tenant.id;
      await this.repository.insertChannel(
        tx,
        { id: UuidV7.create(), tenantId, accountId },
        change.write,
      );
      return true;
    } catch (error) {
      throw ChannelWriter.translate(error);
    }
  }

  /** The unique index on the number becomes a readable problem. */
  private static translate(error: unknown): unknown {
    const cause = (error as { cause?: { code?: string; constraint?: string } }).cause;
    return cause?.code === '23505' && String(cause.constraint ?? '').includes('phone_number')
      ? MessagingErrors.numberTaken()
      : error;
  }

  private record(
    tx: Transaction,
    auth: RequestAuth,
    before: ChannelRecord | null,
    after: ChannelRecord,
  ): Promise<void> {
    const snapshot = (record: ChannelRecord | null) =>
      record && {
        phone_number_id: record.phoneNumberId,
        display_phone_number: record.displayPhoneNumber,
        has_access_token: record.hasAccessToken,
        greeting: record.greeting,
        is_active: record.isActive,
      };
    return this.audit.record(tx, auth, {
      action: before ? 'messaging.channel_updated' : 'messaging.channel_created',
      targetType: 'messaging_channel',
      targetId: after.id,
      targetLabel: after.displayPhoneNumber,
      before: snapshot(before),
      after: snapshot(after),
    });
  }
}

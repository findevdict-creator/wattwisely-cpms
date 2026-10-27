import { HttpStatus, Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner, UuidV7 } from '@wattwisely/db';
import { PageRequest } from '../../common/paging/page-request';
import { ProblemException } from '../../common/problem/problem.exception';
import { TenantAccess } from '../../common/tenant/tenant-access';
import { InboxItemDto } from './dto/inbox-item.dto';
import { InboxPageDto } from './dto/inbox-page.dto';
import { ListInboxQueryDto } from './dto/list-inbox-query.dto';
import { MarkedReadDto } from './dto/marked-read.dto';
import { InboxRepository } from './inbox.repository';

/**
 * The portal inbox behind the bell (story NTF-03, "in-portal"): what the worker told this
 * member about, e.g. an alert that opened or an export that is ready. Each member sees
 * only their own lines.
 */
@Injectable()
export class InboxService {
  constructor(
    private readonly runner: TransactionRunner,
    private readonly inbox: InboxRepository,
  ) {}

  async list(access: TenantAccess, query: ListInboxQueryDto): Promise<InboxPageDto> {
    const page = PageRequest.from(query);
    return this.runner.run(DatabaseSession.forTenant(access.tenant.id), async (tx) => {
      const rows = await this.inbox.findPage(
        tx,
        access.membershipId,
        { isUnreadOnly: query.unread === 'true', cursor: page.cursor },
        page.fetchSize,
      );
      const { items, nextCursor } = page.cut(rows, (row) => row.createdAt.toISOString());
      const unread = await this.inbox.countUnread(tx, access.membershipId);
      return new InboxPageDto(
        items.map((item) => new InboxItemDto(item)),
        nextCursor,
        unread,
      );
    });
  }

  /** Marks one line read, or all of them when `id` is null. */
  async markRead(access: TenantAccess, id: string | null): Promise<MarkedReadDto> {
    if (id !== null && !UuidV7.isUuid(id)) {
      throw new ProblemException(
        HttpStatus.NOT_FOUND,
        'notification_not_found',
        'This notification does not exist.',
      );
    }
    return this.runner.run(DatabaseSession.forTenant(access.tenant.id), async (tx) => {
      const marked = await this.inbox.markRead(tx, access.membershipId, id);
      return new MarkedReadDto(marked, await this.inbox.countUnread(tx, access.membershipId));
    });
  }
}

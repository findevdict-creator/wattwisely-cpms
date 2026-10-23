import { Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { staffNotifications, Transaction } from '@wattwisely/db';
import { ListCursor } from '../../common/paging/list-cursor';

/** One line in a member's portal inbox. */
export interface InboxRecord {
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  alertId: string | null;
  readAt: Date | null;
  createdAt: Date;
}

/** Reads and marks a member's own inbox. RLS keeps it in the tenant, the membership to the person. */
@Injectable()
export class InboxRepository {
  static readonly COLUMNS = {
    id: staffNotifications.id,
    kind: staffNotifications.kind,
    title: staffNotifications.title,
    body: staffNotifications.body,
    link: staffNotifications.link,
    alertId: staffNotifications.alertId,
    readAt: staffNotifications.readAt,
    createdAt: staffNotifications.createdAt,
  };

  async findPage(
    tx: Transaction,
    membershipId: string,
    query: { isUnreadOnly: boolean; cursor: ListCursor | null },
    limit: number,
  ): Promise<InboxRecord[]> {
    const table = staffNotifications;
    return tx
      .select(InboxRepository.COLUMNS)
      .from(table)
      .where(
        and(
          eq(table.membershipId, membershipId),
          query.isUnreadOnly ? isNull(table.readAt) : undefined,
          query.cursor
            ? sql`(${table.createdAt}, ${table.id}) < (${query.cursor.key}::timestamptz, ${query.cursor.id}::uuid)`
            : undefined,
        ),
      )
      .orderBy(desc(table.createdAt), desc(table.id))
      .limit(limit);
  }

  async countUnread(tx: Transaction, membershipId: string): Promise<number> {
    const [row] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(staffNotifications)
      .where(
        and(eq(staffNotifications.membershipId, membershipId), isNull(staffNotifications.readAt)),
      );
    return row?.count ?? 0;
  }

  /** Marks one line, or all of them when `id` is null. Returns how many were unread. */
  async markRead(tx: Transaction, membershipId: string, id: string | null): Promise<number> {
    const rows = await tx
      .update(staffNotifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(staffNotifications.membershipId, membershipId),
          isNull(staffNotifications.readAt),
          id ? eq(staffNotifications.id, id) : undefined,
        ),
      )
      .returning({ id: staffNotifications.id });
    return rows.length;
  }
}

import { and, asc, eq, exists, gt, isNull, or, sql, SQL } from 'drizzle-orm';
import { accessGroupMembers, drivers } from '@wattwisely/db';
import { ListCursor } from '../../../common/paging/list-cursor';

/** How the drivers list is narrowed. Deleted drivers never show. */
export interface DriverFilter {
  /** Matches the name, e-mail or reference, case-insensitively. */
  q?: string;
  status?: 'active' | 'blocked';
  groupId?: string;
}

/** The filter as a WHERE condition, and the order by name. */
export class DriverConditions {
  static readonly ORDER = [asc(sql`lower(${drivers.name})`), asc(drivers.id)];

  static of(filter: DriverFilter, cursor: ListCursor | null = null): SQL | undefined {
    return and(
      isNull(drivers.deletedAt),
      filter.status ? eq(drivers.status, filter.status) : undefined,
      filter.q ? DriverConditions.matches(filter.q) : undefined,
      filter.groupId ? DriverConditions.inGroup(filter.groupId) : undefined,
      cursor
        ? gt(sql`(lower(${drivers.name}), ${drivers.id})`, sql`(${cursor.key}, ${cursor.id}::uuid)`)
        : undefined,
    );
  }

  private static matches(q: string): SQL | undefined {
    const pattern = `%${q.toLowerCase().replace(/[%_\\]/g, '\\$&')}%`;
    return or(
      sql`lower(${drivers.name}) like ${pattern}`,
      sql`lower(${drivers.email}) like ${pattern}`,
      sql`lower(${drivers.reference}) like ${pattern}`,
    );
  }

  private static inGroup(groupId: string): SQL {
    return exists(
      sql`(select 1 from ${accessGroupMembers} gm where gm.driver_id = drivers.id
        and gm.group_id = ${groupId}::uuid)`,
    );
  }
}

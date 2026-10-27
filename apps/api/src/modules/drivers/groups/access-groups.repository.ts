import { Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import {
  accessGroupMembers,
  accessGroups,
  accessGroupSites,
  drivers,
  sites,
  Transaction,
} from '@wattwisely/db';
import { AccessGroupRecord, NamedRow } from './access-group-record';

/** Reads and writes access groups with their sites and members. RLS keeps every query inside the tenant. */
@Injectable()
export class AccessGroupsRepository {
  static readonly COLUMNS = {
    id: accessGroups.id,
    name: accessGroups.name,
    description: accessGroups.description,
    sites: sql<NamedRow[]>`coalesce((select json_agg(json_build_object('id', s.id, 'name', s.name)
      order by lower(s.name)) from ${accessGroupSites} gs join ${sites} s on s.id = gs.site_id
      where gs.group_id = access_groups.id), '[]'::json)`,
    members: sql<NamedRow[]>`coalesce((select json_agg(json_build_object('id', d.id, 'name', d.name)
      order by lower(d.name)) from ${accessGroupMembers} gm join ${drivers} d on d.id = gm.driver_id
      where gm.group_id = access_groups.id and d.deleted_at is null), '[]'::json)`,
    version: accessGroups.version,
    createdAt: accessGroups.createdAt,
    updatedAt: accessGroups.updatedAt,
  };

  /** Every group of the tenant, by name: tenants have a handful, not thousands. */
  async findAll(tx: Transaction): Promise<AccessGroupRecord[]> {
    return this.select(tx).orderBy(asc(sql`lower(${accessGroups.name})`), asc(accessGroups.id));
  }

  async findById(tx: Transaction, id: string): Promise<AccessGroupRecord | null> {
    const rows = await this.select(tx).where(eq(accessGroups.id, id));
    return rows[0] ?? null;
  }

  async insert(tx: Transaction, row: typeof accessGroups.$inferInsert): Promise<void> {
    await tx.insert(accessGroups).values(row);
  }

  /** Applies the changes when the version still matches; false when someone else saved first. */
  async update(
    tx: Transaction,
    id: string,
    version: number,
    changes: Partial<typeof accessGroups.$inferInsert>,
  ): Promise<boolean> {
    const rows = await tx
      .update(accessGroups)
      .set({ ...changes, version: sql`${accessGroups.version} + 1`, updatedAt: new Date() })
      .where(and(eq(accessGroups.id, id), eq(accessGroups.version, version)))
      .returning({ id: accessGroups.id });
    return rows.length === 1;
  }

  /** The sites and members go with it (ON DELETE CASCADE). */
  async remove(tx: Transaction, id: string): Promise<void> {
    await tx.delete(accessGroups).where(eq(accessGroups.id, id));
  }

  /** Replaces the sites a group opens. */
  async setSites(tx: Transaction, tenantId: string, groupId: string, siteIds: string[]) {
    await tx.delete(accessGroupSites).where(eq(accessGroupSites.groupId, groupId));
    if (siteIds.length > 0) {
      await tx
        .insert(accessGroupSites)
        .values(siteIds.map((siteId) => ({ tenantId, groupId, siteId })));
    }
  }

  /** Replaces the drivers in a group. */
  async setMembers(tx: Transaction, tenantId: string, groupId: string, driverIds: string[]) {
    await tx.delete(accessGroupMembers).where(eq(accessGroupMembers.groupId, groupId));
    if (driverIds.length > 0) {
      await tx
        .insert(accessGroupMembers)
        .values(driverIds.map((driverId) => ({ tenantId, groupId, driverId })));
    }
  }

  /** Replaces the groups a driver is in. */
  async setGroupsOf(tx: Transaction, tenantId: string, driverId: string, groupIds: string[]) {
    await tx.delete(accessGroupMembers).where(eq(accessGroupMembers.driverId, driverId));
    if (groupIds.length > 0) {
      await tx
        .insert(accessGroupMembers)
        .values(groupIds.map((groupId) => ({ tenantId, groupId, driverId })));
    }
  }

  /** Which of these ids are groups of the tenant. */
  async findExistingIds(tx: Transaction, ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) {
      return new Set();
    }
    const rows = await tx
      .select({ id: accessGroups.id })
      .from(accessGroups)
      .where(inArray(accessGroups.id, ids));
    return new Set(rows.map((row) => row.id));
  }

  private select(tx: Transaction) {
    return tx.select(AccessGroupsRepository.COLUMNS).from(accessGroups).$dynamic();
  }
}

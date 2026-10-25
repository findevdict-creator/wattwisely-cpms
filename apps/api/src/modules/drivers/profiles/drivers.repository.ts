import { Injectable } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';
import {
  accessGroupMembers,
  accessGroups,
  chargingSessions,
  driverAccounts,
  driverInvitations,
  drivers,
  rfidCards,
  Transaction,
  userAccounts,
} from '@wattwisely/db';
import { ListCursor } from '../../../common/paging/list-cursor';
import { DriverConditions, DriverFilter } from './driver-filter';
import { DriverGroup, DriverRecord, OpenInvitation } from './driver-record';

/** Reads and writes drivers. RLS keeps every query inside the current tenant. */
@Injectable()
export class DriversRepository {
  static readonly COLUMNS = {
    id: drivers.id,
    name: drivers.name,
    email: drivers.email,
    phone: drivers.phone,
    reference: drivers.reference,
    notes: drivers.notes,
    status: drivers.status,
    paymentMode: drivers.paymentMode,
    driverAccountId: drivers.driverAccountId,
    accountEmail: driverAccounts.email,
    linkedAt: drivers.linkedAt,
    invitation: sql<OpenInvitation | null>`(select json_build_object('email', i.email,
      'invitedAt', i.created_at, 'expiresAt', i.expires_at) from ${driverInvitations} i
      where i.driver_id = drivers.id and i.token_hash is not null limit 1)`.mapWith(
      DriversRepository.toInvitation,
    ),
    blockedAt: drivers.blockedAt,
    blockedByName: sql<
      string | null
    >`coalesce(nullif(${userAccounts.name}, ''), ${userAccounts.email})`,
    blockReason: drivers.blockReason,
    isDeleted: sql<boolean>`${drivers.deletedAt} is not null`,
    cardCount: sql<number>`(select count(*) from ${rfidCards} c where c.driver_id = drivers.id)::int`,
    activeCardCount: sql<number>`(select count(*) from ${rfidCards} c
      where c.driver_id = drivers.id and c.status = 'active')::int`,
    lastSessionAt: sql<Date | null>`(select max(s.started_at) from ${chargingSessions} s
      where s.driver_id = drivers.id)`.mapWith(chargingSessions.startedAt),
    version: drivers.version,
    createdAt: drivers.createdAt,
    updatedAt: drivers.updatedAt,
  };

  async findPage(
    tx: Transaction,
    filter: DriverFilter,
    cursor: ListCursor | null,
    limit: number,
  ): Promise<DriverRecord[]> {
    return this.select(tx)
      .where(DriverConditions.of(filter, cursor))
      .orderBy(...DriverConditions.ORDER)
      .limit(limit);
  }

  /** The driver, deleted or not: services decide what a deleted one means. */
  async findById(tx: Transaction, id: string): Promise<DriverRecord | null> {
    const rows = await this.select(tx).where(eq(drivers.id, id));
    return rows[0] ?? null;
  }

  /** Which of these ids are drivers of the tenant that are not deleted. */
  async findExistingIds(tx: Transaction, ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) {
      return new Set();
    }
    const rows = await tx
      .select({ id: drivers.id })
      .from(drivers)
      .where(and(inArray(drivers.id, ids), sql`${drivers.deletedAt} is null`));
    return new Set(rows.map((row) => row.id));
  }

  /** The groups of each driver, by driver id. */
  async findGroupsOf(tx: Transaction, driverIds: string[]): Promise<Map<string, DriverGroup[]>> {
    const groups = new Map<string, DriverGroup[]>();
    if (driverIds.length === 0) {
      return groups;
    }
    const rows = await tx
      .select({
        driverId: accessGroupMembers.driverId,
        id: accessGroups.id,
        name: accessGroups.name,
      })
      .from(accessGroupMembers)
      .innerJoin(accessGroups, eq(accessGroups.id, accessGroupMembers.groupId))
      .where(inArray(accessGroupMembers.driverId, driverIds))
      .orderBy(sql`lower(${accessGroups.name})`);
    for (const row of rows) {
      groups.set(row.driverId, [
        ...(groups.get(row.driverId) ?? []),
        { id: row.id, name: row.name },
      ]);
    }
    return groups;
  }

  async insert(tx: Transaction, row: typeof drivers.$inferInsert): Promise<void> {
    await tx.insert(drivers).values(row);
  }

  /** Applies the changes when the version still matches; false when someone else saved first. */
  async update(
    tx: Transaction,
    id: string,
    version: number,
    changes: Partial<typeof drivers.$inferInsert>,
  ): Promise<boolean> {
    const rows = await tx
      .update(drivers)
      .set({ ...changes, version: sql`${drivers.version} + 1`, updatedAt: new Date() })
      .where(and(eq(drivers.id, id), eq(drivers.version, version)))
      .returning({ id: drivers.id });
    return rows.length === 1;
  }

  /** Sets or clears the driver's own login (module 19); the version moves on, as the page shows the link. */
  async setAccount(tx: Transaction, id: string, driverAccountId: string | null): Promise<boolean> {
    const rows = await tx
      .update(drivers)
      .set({
        driverAccountId,
        linkedAt: driverAccountId ? new Date() : null,
        version: sql`${drivers.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(drivers.id, id))
      .returning({ id: drivers.id });
    return rows.length === 1;
  }

  /** The JSON of the open invitation, with its two dates read as dates. */
  private static toInvitation(
    value: { email: string; invitedAt: string; expiresAt: string } | null,
  ): OpenInvitation | null {
    if (!value) {
      return null;
    }
    return {
      email: value.email,
      invitedAt: new Date(value.invitedAt),
      expiresAt: new Date(value.expiresAt),
    };
  }

  private select(tx: Transaction) {
    return tx
      .select(DriversRepository.COLUMNS)
      .from(drivers)
      .leftJoin(userAccounts, eq(userAccounts.id, drivers.blockedBy))
      .leftJoin(driverAccounts, eq(driverAccounts.id, drivers.driverAccountId))
      .$dynamic();
  }
}

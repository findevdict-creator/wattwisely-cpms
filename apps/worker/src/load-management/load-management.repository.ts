import { Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import {
  chargerCommands,
  chargerConnections,
  chargerLoadAllocations,
  chargerLoadSettings,
  chargers,
  connectors,
  siteLoadPolicies,
  Transaction,
} from '@wattwisely/db';
import { LoadStrategy } from '@wattwisely/load-management';
import { CommandStatus } from '@wattwisely/ocpp-contracts';

/** A site's load policy as the balancer reads it. */
export interface LoadPolicyRow {
  siteId: string;
  isEnabled: boolean;
  limitKw: number;
  minPowerKw: number;
  strategy: LoadStrategy;
}

/** A charger on a managed site, with what the allocator needs to know about it. */
export interface LoadChargerRow {
  id: string;
  isOnline: boolean;
  isCharging: boolean;
  priority: number;
  /** The charger's own ceiling, or the sum of its connectors', in kW; null when unknown. */
  maxPowerKw: number | null;
  lastBootAt: Date | null;
}

/** The cap last given to a charger and how far it got. */
export type AllocationRow = typeof chargerLoadAllocations.$inferSelect;

/** What the balancer wants a charger's allocation row to say. */
export type AllocationWrite = typeof chargerLoadAllocations.$inferInsert;

/** Reads sites, chargers and allocations for load management, and keeps the allocations (module 17). */
@Injectable()
export class LoadManagementRepository {
  /** A car is on the connector in any of these states. */
  static readonly IN_USE_STATUSES = [
    'preparing',
    'charging',
    'suspended_ev',
    'suspended_evse',
    'finishing',
    'occupied',
  ];

  policies(tx: Transaction): Promise<LoadPolicyRow[]> {
    return tx
      .select({
        siteId: siteLoadPolicies.siteId,
        isEnabled: siteLoadPolicies.isEnabled,
        limitKw: siteLoadPolicies.limitKw,
        minPowerKw: siteLoadPolicies.minPowerKw,
        strategy: siteLoadPolicies.strategy,
      })
      .from(siteLoadPolicies);
  }

  chargers(tx: Transaction, siteId: string): Promise<LoadChargerRow[]> {
    const inUse = sql.raw(
      `in (${LoadManagementRepository.IN_USE_STATUSES.map((status) => `'${status}'`).join(', ')})`,
    );
    return tx
      .select({
        id: chargers.id,
        isOnline: sql<boolean>`exists (select 1 from ${chargerConnections}
          where ${chargerConnections.chargerId} = ${chargers.id} and ${chargerConnections.leaseExpiresAt} > now())`,
        isCharging: sql<boolean>`exists (select 1 from ${connectors}
          where ${connectors.chargerId} = ${chargers.id} and ${connectors.status}::text ${inUse})`,
        priority: sql<number>`coalesce(${chargerLoadSettings.priority}, 5)`,
        maxPowerKw: sql<number | null>`coalesce(${chargerLoadSettings.maxPowerKw},
          (select sum(${connectors.maxPowerKw}) from ${connectors} where ${connectors.chargerId} = ${chargers.id}))::float`,
        lastBootAt: chargers.lastBootAt,
      })
      .from(chargers)
      .leftJoin(chargerLoadSettings, eq(chargerLoadSettings.chargerId, chargers.id))
      .where(and(eq(chargers.siteId, siteId), isNull(chargers.deletedAt)))
      .orderBy(chargers.ocppIdentity);
  }

  allocations(tx: Transaction, siteId: string): Promise<AllocationRow[]> {
    return tx
      .select()
      .from(chargerLoadAllocations)
      .where(eq(chargerLoadAllocations.siteId, siteId));
  }

  /** The outcome of the commands the allocations wait for, by command id. */
  async commandOutcomes(
    tx: Transaction,
    commandIds: string[],
  ): Promise<Map<string, { status: CommandStatus; error: string | null }>> {
    if (commandIds.length === 0) {
      return new Map();
    }
    const rows = await tx
      .select({
        id: chargerCommands.id,
        status: chargerCommands.status,
        error: chargerCommands.error,
      })
      .from(chargerCommands)
      .where(inArray(chargerCommands.id, commandIds));
    return new Map(rows.map((row) => [row.id, { status: row.status, error: row.error }]));
  }

  async save(tx: Transaction, row: AllocationWrite): Promise<void> {
    const { id, tenantId, chargerId, ...changes } = row;
    await tx
      .insert(chargerLoadAllocations)
      .values({ id, tenantId, chargerId, ...changes })
      .onConflictDoUpdate({
        target: [chargerLoadAllocations.tenantId, chargerLoadAllocations.chargerId],
        set: { ...changes, updatedAt: sql`now()` },
      });
  }

  async delete(tx: Transaction, id: string): Promise<void> {
    await tx.delete(chargerLoadAllocations).where(eq(chargerLoadAllocations.id, id));
  }
}

import { Injectable } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import {
  chargerLoadAllocations,
  chargerLoadSettings,
  chargers,
  connectors,
  siteLoadPolicies,
  sites,
  Transaction,
} from '@wattwisely/db';
import { ChargerStatus, ChargerStatusSql } from '../assets/chargers/charger-status';
import { LoadChargerRecord, LoadPolicyRecord } from './load-management-record';

/** What PUT writes to the policy. */
export interface LoadPolicyWrite {
  isEnabled: boolean;
  limitKw: number;
  strategy: LoadPolicyRecord['strategy'];
  minPowerKw: number;
}

/** Whose policy, and who saves it. */
export interface PolicyPlace {
  tenantId: string;
  siteId: string;
  accountId: string;
  id: string;
}

/** Reads and writes a site's load policy and its chargers' load settings (module 17). */
@Injectable()
export class LoadManagementRepository {
  /** The site's name, or null when there is no such site in the tenant. */
  async siteName(tx: Transaction, siteId: string): Promise<string | null> {
    const rows = await tx
      .select({ name: sites.name })
      .from(sites)
      .where(and(eq(sites.id, siteId), isNull(sites.deletedAt)));
    return rows[0]?.name ?? null;
  }

  async policy(tx: Transaction, siteId: string): Promise<LoadPolicyRecord | null> {
    const rows = await tx
      .select({
        siteId: siteLoadPolicies.siteId,
        isEnabled: siteLoadPolicies.isEnabled,
        limitKw: siteLoadPolicies.limitKw,
        strategy: siteLoadPolicies.strategy,
        minPowerKw: siteLoadPolicies.minPowerKw,
        version: siteLoadPolicies.version,
        updatedAt: siteLoadPolicies.updatedAt,
      })
      .from(siteLoadPolicies)
      .where(eq(siteLoadPolicies.siteId, siteId));
    return rows[0] ?? null;
  }

  chargers(tx: Transaction, siteId: string): Promise<LoadChargerRecord[]> {
    return tx
      .select({
        id: chargers.id,
        identity: chargers.ocppIdentity,
        status: sql<ChargerStatus>`${ChargerStatusSql.expression()}`,
        isOnline: sql<boolean>`${ChargerStatusSql.isOnline()}`,
        priority: sql<number>`coalesce(${chargerLoadSettings.priority}, 5)`,
        maxPowerKw: chargerLoadSettings.maxPowerKw,
        connectorsMaxKw: sql<
          number | null
        >`(select sum(${connectors.maxPowerKw}) from ${connectors} where ${connectors.chargerId} = ${chargers.id})::float`,
        allocation: sql<
          LoadChargerRecord['allocation']
        >`case when ${chargerLoadAllocations.id} is null then null else json_build_object(
          'limitW', ${chargerLoadAllocations.limitW}, 'reason', ${chargerLoadAllocations.reason},
          'isCharging', ${chargerLoadAllocations.isCharging}, 'isApplied', ${chargerLoadAllocations.isApplied},
          'appliedAt', ${chargerLoadAllocations.appliedAt}, 'lastError', ${chargerLoadAllocations.lastError}) end`,
      })
      .from(chargers)
      .leftJoin(chargerLoadSettings, eq(chargerLoadSettings.chargerId, chargers.id))
      .leftJoin(chargerLoadAllocations, eq(chargerLoadAllocations.chargerId, chargers.id))
      .where(and(eq(chargers.siteId, siteId), isNull(chargers.deletedAt)))
      .orderBy(chargers.ocppIdentity);
  }

  /** Writes the policy; false when `expectedVersion` is not the stored one (0 means none stored). */
  savePolicy(
    tx: Transaction,
    at: PolicyPlace,
    policy: LoadPolicyWrite,
    expectedVersion: number,
  ): Promise<boolean> {
    return expectedVersion === 0
      ? this.insertPolicy(tx, at, policy)
      : this.updatePolicy(tx, at, policy, expectedVersion);
  }

  private async insertPolicy(
    tx: Transaction,
    at: PolicyPlace,
    policy: LoadPolicyWrite,
  ): Promise<boolean> {
    const inserted = await tx
      .insert(siteLoadPolicies)
      .values({
        ...policy,
        id: at.id,
        tenantId: at.tenantId,
        siteId: at.siteId,
        createdBy: at.accountId,
        updatedBy: at.accountId,
      })
      .onConflictDoNothing()
      .returning({ id: siteLoadPolicies.id });
    return inserted.length > 0;
  }

  private async updatePolicy(
    tx: Transaction,
    at: PolicyPlace,
    policy: LoadPolicyWrite,
    expectedVersion: number,
  ): Promise<boolean> {
    const updated = await tx
      .update(siteLoadPolicies)
      .set({
        ...policy,
        updatedBy: at.accountId,
        version: sql`${siteLoadPolicies.version} + 1`,
        updatedAt: sql`now()`,
      })
      .where(
        and(eq(siteLoadPolicies.siteId, at.siteId), eq(siteLoadPolicies.version, expectedVersion)),
      )
      .returning({ id: siteLoadPolicies.id });
    return updated.length > 0;
  }

  async saveChargerSettings(
    tx: Transaction,
    tenantId: string,
    setting: { chargerId: string; priority: number; maxPowerKw: number | null },
  ): Promise<void> {
    await tx
      .insert(chargerLoadSettings)
      .values({ id: sql`gen_random_uuid()`, tenantId, ...setting })
      .onConflictDoUpdate({
        target: [chargerLoadSettings.tenantId, chargerLoadSettings.chargerId],
        set: { priority: setting.priority, maxPowerKw: setting.maxPowerKw, updatedAt: sql`now()` },
      });
  }
}

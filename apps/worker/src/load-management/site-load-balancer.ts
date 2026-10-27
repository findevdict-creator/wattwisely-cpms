import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { LoadAllocation, LoadAllocator, LoadPlan, LoadProfile } from '@wattwisely/load-management';
import { AllocationReconciler, Reconciliation } from './allocation-reconciler';
import { LoadCommandQueue } from './load-command-queue';
import {
  LoadChargerRow,
  LoadManagementRepository,
  LoadPolicyRow,
} from './load-management.repository';

/**
 * One site, one round (module 17): read the chargers, let the allocator share the cap, and
 * reconcile every charger's allocation with the plan. `release` is the other direction: the
 * policy was switched off or the add-on ran out, so every cap is cleared and forgotten.
 */
@Injectable()
export class SiteLoadBalancer {
  private readonly allocator = new LoadAllocator();

  constructor(
    private readonly repository: LoadManagementRepository,
    private readonly reconciler: AllocationReconciler,
    private readonly commands: LoadCommandQueue,
  ) {}

  /** Returns how many commands went out. */
  async balance(
    tx: Transaction,
    tenantId: string,
    policy: LoadPolicyRow,
    now: Date,
  ): Promise<number> {
    const chargers = await this.repository.chargers(tx, policy.siteId);
    const plan = this.plan(policy, chargers);
    const current = await this.repository.allocations(tx, policy.siteId);
    const outcomes = await this.repository.commandOutcomes(
      tx,
      current.map((row) => row.commandId).filter((id): id is string => id !== null),
    );
    let sent = 0;
    for (const charger of chargers) {
      const row = current.find((candidate) => candidate.chargerId === charger.id) ?? null;
      const item: Reconciliation = {
        tenantId,
        siteId: policy.siteId,
        charger,
        planned: SiteLoadBalancer.plannedFor(plan, charger.id),
        current: row,
        outcome: row?.commandId ? (outcomes.get(row.commandId) ?? null) : null,
      };
      sent += (await this.reconciler.reconcile(tx, item, now)) ? 1 : 0;
    }
    const kept = chargers.map((charger) => charger.id);
    return sent + (await this.forget(tx, tenantId, current, kept));
  }

  /** The plan's allocation for a charger; a charger the allocator left out waits with no cap. */
  private static plannedFor(plan: LoadPlan, chargerId: string): LoadAllocation {
    return (
      plan.allocations.find((allocation) => allocation.chargerId === chargerId) ?? {
        chargerId,
        limitW: 0,
        reason: 'waiting',
      }
    );
  }

  private plan(policy: LoadPolicyRow, chargers: LoadChargerRow[]): LoadPlan {
    return this.allocator.allocate(
      {
        limitW: LoadProfile.toWatts(policy.limitKw),
        minPowerW: LoadProfile.toWatts(policy.minPowerKw),
        strategy: policy.strategy,
      },
      chargers.map((charger) => ({
        chargerId: charger.id,
        priority: charger.priority,
        maxPowerW: charger.maxPowerKw === null ? null : LoadProfile.toWatts(charger.maxPowerKw),
        isCharging: charger.isCharging,
      })),
    );
  }

  /** Clears every cap on the site and deletes the allocations. */
  async release(tx: Transaction, tenantId: string, siteId: string): Promise<number> {
    const current = await this.repository.allocations(tx, siteId);
    return this.forget(tx, tenantId, current, []);
  }

  /** Rows for chargers no longer managed: tell the charger to drop the cap, and drop the row. */
  private async forget(
    tx: Transaction,
    tenantId: string,
    rows: { id: string; chargerId: string }[],
    keptChargerIds: string[],
  ): Promise<number> {
    let sent = 0;
    for (const row of rows.filter((candidate) => !keptChargerIds.includes(candidate.chargerId))) {
      await this.commands.clearCap(tx, { tenantId, chargerId: row.chargerId });
      await this.repository.delete(tx, row.id);
      sent += 1;
    }
    return sent;
  }
}

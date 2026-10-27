import { Injectable } from '@nestjs/common';
import { Transaction, UuidV7 } from '@wattwisely/db';
import { LoadAllocation } from '@wattwisely/load-management';
import { CommandStatus } from '@wattwisely/ocpp-contracts';
import { LoadCommandQueue } from './load-command-queue';
import {
  AllocationRow,
  AllocationWrite,
  LoadChargerRow,
  LoadManagementRepository,
} from './load-management.repository';

/** One charger's planned cap next to what it was last told. */
export interface Reconciliation {
  tenantId: string;
  siteId: string;
  charger: LoadChargerRow;
  planned: LoadAllocation;
  current: AllocationRow | null;
  outcome: { status: CommandStatus; error: string | null } | null;
}

/**
 * Brings one charger's allocation row in line with the plan (module 17): settles the command
 * the row waits for, then sends a new cap when the plan changed, the last attempt failed and
 * its wait is over, or the charger booted since the cap was applied. An offline charger only
 * gets its row updated; the cap goes when it is back.
 */
@Injectable()
export class AllocationReconciler {
  /** How long to wait after each failed attempt, in seconds; the last one repeats. */
  static readonly RETRY_SECONDS = [30, 120, 300, 600];
  private static readonly PENDING: CommandStatus[] = ['queued', 'sent'];

  constructor(
    private readonly repository: LoadManagementRepository,
    private readonly commands: LoadCommandQueue,
  ) {}

  /** Returns true when a command was sent. */
  async reconcile(tx: Transaction, item: Reconciliation, now: Date): Promise<boolean> {
    const settled = AllocationReconciler.settle(item, now);
    if (settled.commandId) {
      await this.repository.save(tx, { ...settled, isCharging: item.charger.isCharging });
      return false;
    }
    const isChanged = settled.limitW !== item.planned.limitW;
    const next: AllocationWrite = {
      ...settled,
      limitW: item.planned.limitW,
      reason: item.planned.reason,
      isCharging: item.charger.isCharging,
    };
    if (isChanged || AllocationReconciler.isDue(next, item.charger, now)) {
      if (item.charger.isOnline) {
        next.commandId = await this.commands.setCap(
          tx,
          { tenantId: item.tenantId, chargerId: item.charger.id },
          item.planned.limitW,
        );
        next.isApplied = false;
        next.attempts = (next.attempts ?? 0) + 1;
      } else if (isChanged) {
        next.isApplied = false;
      }
    }
    await this.repository.save(tx, next);
    return next.commandId !== null;
  }

  /** The row to start from: the existing one with its pending command resolved, or a fresh one. */
  private static settle(item: Reconciliation, now: Date): AllocationWrite {
    const row = item.current ?? AllocationReconciler.fresh(item);
    if (!row.commandId || !item.outcome) {
      return row;
    }
    if (AllocationReconciler.PENDING.includes(item.outcome.status)) {
      return row;
    }
    return item.outcome.status === 'accepted'
      ? AllocationReconciler.accepted(row, now)
      : AllocationReconciler.failed(row, item.outcome, now);
  }

  private static accepted(row: AllocationWrite, now: Date): AllocationWrite {
    return {
      ...row,
      commandId: null,
      isApplied: true,
      appliedAt: now,
      lastError: null,
      attempts: 0,
      nextAttemptAt: now,
    };
  }

  private static failed(
    row: AllocationWrite,
    outcome: { status: CommandStatus; error: string | null },
    now: Date,
  ): AllocationWrite {
    const attempts = row.attempts ?? 1;
    const waitS =
      AllocationReconciler.RETRY_SECONDS[
        Math.min(attempts, AllocationReconciler.RETRY_SECONDS.length) - 1
      ];
    return {
      ...row,
      commandId: null,
      isApplied: false,
      lastError: outcome.error ?? `The command ${outcome.status}.`,
      nextAttemptAt: new Date(now.getTime() + waitS * 1000),
    };
  }

  private static isDue(row: AllocationWrite, charger: LoadChargerRow, now: Date): boolean {
    if (!row.isApplied) {
      return (row.nextAttemptAt ?? now).getTime() <= now.getTime();
    }
    const appliedAt = row.appliedAt?.getTime() ?? 0;
    return charger.lastBootAt !== null && charger.lastBootAt.getTime() > appliedAt;
  }

  private static fresh(item: Reconciliation): AllocationWrite {
    return {
      id: UuidV7.create(),
      tenantId: item.tenantId,
      siteId: item.siteId,
      chargerId: item.charger.id,
      limitW: -1,
      reason: item.planned.reason,
      isCharging: item.charger.isCharging,
      commandId: null,
      isApplied: false,
      appliedAt: null,
      lastError: null,
      attempts: 0,
      nextAttemptAt: new Date(0),
    };
  }
}

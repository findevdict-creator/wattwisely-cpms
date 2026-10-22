import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { SessionEventData, SessionRow, SessionStates } from '@wattwisely/session-engine';
import { WorkerConfig } from '../config/worker.config';
import { IntervalJob } from '../jobs/interval-job';
import { SessionBatch } from '../jobs/session-batch';
import { TenantIterator } from '../jobs/tenant-iterator';
import { LiveCostParts } from './live-cost-parts';

/**
 * LiveCostJob (Sessions and Pricing design): every 30 seconds, prices each running
 * session up to now with its own tariff version and announces session.cost_updated
 * when the amount moved, so the portal shows the cost so far. For a paid session it also
 * asks the charger to stop once the cost reaches 90% of the card hold (module 6).
 */
@Injectable()
export class LiveCostJob extends IntervalJob {
  constructor(
    private readonly config: WorkerConfig,
    private readonly tenants: TenantIterator,
    private readonly batch: SessionBatch,
    private readonly parts: LiveCostParts,
  ) {
    super();
  }

  async runOnce(now: Date): Promise<number> {
    let changed = 0;
    for (const tenantId of await this.tenants.ids()) {
      changed += await this.batch.inStates(tenantId, SessionStates.ACTIVE, (tx, session) =>
        this.update(tx, session, now),
      );
    }
    return changed;
  }

  protected intervalMs(): number {
    return this.config.liveCostIntervalMs;
  }

  private async update(tx: Transaction, session: SessionRow, now: Date): Promise<boolean> {
    if (!session.tariffVersionId) {
      return false;
    }
    const priced = await this.parts.pricer.price(tx, session, {
      now,
      isFinal: false,
      idleUntil: null,
    });
    if (priced.kind !== 'priced' || priced.result.grossTotal === session.grossAmount) {
      return false;
    }
    const { result } = priced;
    await this.parts.sessions.saveRunningCost(tx, session.id, {
      netAmount: result.netTotal,
      taxAmount: result.taxTotal,
      grossAmount: result.grossTotal,
    });
    await this.announce(tx, session, result.energyWh, result.grossTotal);
    await this.parts.holds.watch(tx, session, result.grossTotal, now);
    return true;
  }

  private async announce(
    tx: Transaction,
    session: SessionRow,
    energyWh: number,
    grossAmount: number,
  ) {
    await this.parts.notifier.publish(
      tx,
      { id: session.chargerId, tenantId: session.tenantId },
      'session.cost_updated',
      SessionEventData.of(session, { status: session.status, energyWh, grossAmount }),
    );
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { AlertDelivery } from './alert-delivery';
import { AlertFinding } from './alert-finding';
import { AlertStoreRepository, LiveAlert } from './alert-store.repository';
import { AlertDetector } from './detectors/alert-detector';

/** The detectors the tracker runs, in the order their alerts are written. */
export const ALERT_DETECTORS = Symbol('ALERT_DETECTORS');

/** What one scan of a tenant changed. */
export interface AlertScanResult {
  opened: number;
  closed: number;
}

/**
 * Keeps one tenant's alerts in step with its chargers (NTF-04), in one transaction: a new
 * problem opens an alert and tells people, a problem still there updates its alert, one
 * that came back within 15 minutes reopens its alert quietly, and an alert whose problem is
 * gone closes. A tenant is scanned by one worker at a time.
 */
@Injectable()
export class AlertTracker {
  static readonly REOPEN_WITHIN_MS = 15 * 60_000;

  constructor(
    private readonly runner: TransactionRunner,
    private readonly store: AlertStoreRepository,
    private readonly delivery: AlertDelivery,
    @Inject(ALERT_DETECTORS) private readonly detectors: AlertDetector[],
  ) {}

  scan(tenantId: string, now: Date): Promise<AlertScanResult> {
    return this.runner.run(DatabaseSession.forTenant(tenantId), async (tx) => {
      if (!(await AlertTracker.lock(tx, tenantId))) {
        return { opened: 0, closed: 0 };
      }
      const findings: AlertFinding[] = [];
      for (const detector of this.detectors) {
        findings.push(...(await detector.find(tx, now)));
      }
      const live = new Map(
        (await this.store.findLive(tx)).map((alert) => [AlertTracker.key(alert), alert]),
      );
      let opened = 0;
      for (const finding of findings) {
        const alert = live.get(AlertTracker.key(finding));
        live.delete(AlertTracker.key(finding));
        opened += (await this.apply(tx, { tenantId, finding }, alert, now)) ? 1 : 0;
      }
      for (const gone of live.values()) {
        await this.store.close(tx, gone.id, now);
      }
      return { opened, closed: live.size };
    });
  }

  /** True when a new alert opened. */
  private async apply(
    tx: Transaction,
    seen: { tenantId: string; finding: AlertFinding },
    alert: LiveAlert | undefined,
    now: Date,
  ): Promise<boolean> {
    const finding = seen.finding;
    if (alert) {
      await this.store.touch(tx, alert.id, finding, now);
      return false;
    }
    const since = new Date(now.getTime() - AlertTracker.REOPEN_WITHIN_MS);
    const recent = await this.store.findClosedSince(tx, finding, since);
    if (recent) {
      await this.store.reopen(tx, recent, finding, now);
      return false;
    }
    const id = await this.store.open(tx, seen.tenantId, finding, now);
    await this.delivery.deliver(tx, { id, tenantId: seen.tenantId, finding }, now);
    return true;
  }

  private static key(item: { type: string; subjectKey: string }): string {
    return `${item.type}:${item.subjectKey}`;
  }

  /** Another worker scanning the same tenant right now wins; this one skips it. */
  private static async lock(tx: Transaction, tenantId: string): Promise<boolean> {
    const result = await tx.execute<{ is_locked: boolean }>(
      sql`select pg_try_advisory_xact_lock(hashtext(${`alerts:${tenantId}`})) as is_locked`,
    );
    return result.rows[0]?.is_locked === true;
  }
}

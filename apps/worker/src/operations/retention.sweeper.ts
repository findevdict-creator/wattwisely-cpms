import { Injectable, Logger } from '@nestjs/common';
import { inArray } from 'drizzle-orm';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { RetentionRule } from './retention-rule';

/**
 * Deletes the old rows of one rule, in batches of 5,000 rows, each in its own short
 * transaction, so a big backlog never holds locks for long. A run stops after 100 batches
 * and the next run goes on where it stopped.
 */
@Injectable()
export class RetentionSweeper {
  static readonly BATCH = 5_000;
  static readonly MAX_BATCHES = 100;
  static readonly DAY_MS = 86_400_000;

  private readonly logger = new Logger(RetentionSweeper.name);

  constructor(private readonly runner: TransactionRunner) {}

  /** How many rows went. */
  async sweep(session: DatabaseSession, rule: RetentionRule, now: Date): Promise<number> {
    const cutoff = new Date(now.getTime() - rule.days * RetentionSweeper.DAY_MS);
    let deleted = 0;
    for (let batch = 0; batch < RetentionSweeper.MAX_BATCHES; batch += 1) {
      const count = await this.deleteBatch(session, rule, cutoff);
      deleted += count;
      if (count < RetentionSweeper.BATCH) {
        break;
      }
    }
    if (deleted > 0) {
      this.logger.log(`${rule.name}: ${deleted} row(s) older than ${rule.days} days deleted`);
    }
    return deleted;
  }

  private deleteBatch(
    session: DatabaseSession,
    rule: RetentionRule,
    cutoff: Date,
  ): Promise<number> {
    return this.runner.run(session, async (tx) => {
      const old = tx
        .select({ id: rule.id })
        .from(rule.table)
        .where(rule.isOld(cutoff))
        .limit(RetentionSweeper.BATCH);
      const rows = await tx
        .delete(rule.table)
        .where(inArray(rule.id, old))
        .returning({ id: rule.id });
      return rows.length;
    });
  }
}

import { Injectable } from '@nestjs/common';
import { and, isNull, ne } from 'drizzle-orm';
import { DatabaseSession, tenants, TransactionRunner } from '@wattwisely/db';

/**
 * The tenants a job works through, one at a time. Row-level security keeps each
 * tenant's sessions apart, so the jobs run every query inside one tenant's session.
 */
@Injectable()
export class TenantIterator {
  constructor(private readonly runner: TransactionRunner) {}

  async ids(): Promise<string[]> {
    const rows = await this.runner.run(DatabaseSession.anonymous(), (tx) =>
      tx
        .select({ id: tenants.id })
        .from(tenants)
        .where(and(isNull(tenants.deletedAt), ne(tenants.status, 'cancelled'))),
    );
    return rows.map((row) => row.id);
  }
}

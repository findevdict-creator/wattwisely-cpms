import { Injectable } from '@nestjs/common';
import { auditLog, DatabaseSession, Transaction, TransactionRunner, UuidV7 } from '@wattwisely/db';
import { DueService, ManagedServicesDueRepository } from './managed-services-due.repository';

/**
 * Ends one managed service agreement on its date (story MGT-05): every Wattwisely staff
 * member working in the tenant loses their membership, the agreement is marked ended,
 * and the tenant's audit log says so. All in one transaction with platform access in the
 * tenant, since the tenant itself may not touch those memberships.
 */
@Injectable()
export class ManagedServiceEnder {
  static readonly ACTOR_LABEL = 'Wattwisely (automatic)';

  constructor(
    private readonly runner: TransactionRunner,
    private readonly services: ManagedServicesDueRepository,
  ) {}

  /** Every agreement whose end date has passed. */
  due(now: Date): Promise<DueService[]> {
    return this.runner.run(DatabaseSession.forSystem(), (tx) => this.services.findDue(tx, now));
  }

  /** True when the agreement ended in this run. */
  end(service: DueService, now: Date): Promise<boolean> {
    return this.runner.run(DatabaseSession.forSystemInTenant(service.tenantId), async (tx) => {
      if (!(await this.services.end(tx, service.id, now))) {
        return false;
      }
      const operators = await this.services.findOperators(tx, service.id);
      for (const operator of operators) {
        await this.services.removeOperator(tx, operator, now);
      }
      await this.record(tx, service, operators.length, now);
      return true;
    });
  }

  private async record(tx: Transaction, service: DueService, removed: number, now: Date) {
    await tx.insert(auditLog).values({
      id: UuidV7.create(),
      tenantId: service.tenantId,
      actorType: 'system',
      actorId: null,
      actorLabel: ManagedServiceEnder.ACTOR_LABEL,
      action: 'managed_service.ended',
      targetType: 'managed_service',
      targetId: service.id,
      targetLabel: service.agreementReference || null,
      before: { status: 'ending' },
      after: { status: 'ended', ended_at: now.toISOString(), operators_removed: removed },
    });
  }
}

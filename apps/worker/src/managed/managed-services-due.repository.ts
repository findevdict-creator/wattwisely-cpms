import { Injectable } from '@nestjs/common';
import { and, asc, eq, isNull, lte } from 'drizzle-orm';
import {
  managedOperators,
  managedServices,
  membershipRoles,
  tenantMemberships,
  Transaction,
} from '@wattwisely/db';

/** An agreement whose end date has passed. */
export interface DueService {
  id: string;
  tenantId: string;
  agreementReference: string;
}

/** A staff member still working in the tenant when its service ends. */
export interface OperatorToRemove {
  id: string;
  membershipId: string;
  userAccountId: string;
}

/** What the end-of-service job reads and writes, with platform access (worker only). */
@Injectable()
export class ManagedServicesDueRepository {
  /** Agreements in their notice period whose end date has passed. */
  async findDue(tx: Transaction, now: Date): Promise<DueService[]> {
    return tx
      .select({
        id: managedServices.id,
        tenantId: managedServices.tenantId,
        agreementReference: managedServices.agreementReference,
      })
      .from(managedServices)
      .where(and(eq(managedServices.status, 'ending'), lte(managedServices.endsAt, now)))
      .orderBy(asc(managedServices.endsAt));
  }

  async findOperators(tx: Transaction, serviceId: string): Promise<OperatorToRemove[]> {
    return tx
      .select({
        id: managedOperators.id,
        membershipId: managedOperators.membershipId,
        userAccountId: managedOperators.userAccountId,
      })
      .from(managedOperators)
      .where(
        and(eq(managedOperators.managedServiceId, serviceId), isNull(managedOperators.removedAt)),
      );
  }

  /** Ends the membership (the row stays for the audit log), drops its roles and closes the assignment. */
  async removeOperator(tx: Transaction, operator: OperatorToRemove, now: Date): Promise<void> {
    await tx
      .update(tenantMemberships)
      .set({ status: 'removed', removedAt: now, updatedAt: now })
      .where(eq(tenantMemberships.id, operator.membershipId));
    await tx.delete(membershipRoles).where(eq(membershipRoles.membershipId, operator.membershipId));
    await tx
      .update(managedOperators)
      .set({ removedAt: now, updatedAt: now })
      .where(eq(managedOperators.id, operator.id));
  }

  /** Marks the agreement ended, unless something changed it meanwhile. True when it did end. */
  async end(tx: Transaction, serviceId: string, now: Date): Promise<boolean> {
    const rows = await tx
      .update(managedServices)
      .set({ status: 'ended', endedAt: now, updatedAt: now })
      .where(and(eq(managedServices.id, serviceId), eq(managedServices.status, 'ending')))
      .returning({ id: managedServices.id });
    return rows.length === 1;
  }
}

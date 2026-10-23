import { Injectable } from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { managedOperators, platformStaff, Transaction, userAccounts, UuidV7 } from '@wattwisely/db';
import { ManagedOperatorRecord } from './managed-service-record';

/**
 * Reads and writes Managed operator assignments. A tenant reads its own (the portal shows
 * who looks after it); the admin console reads and writes every tenant's, including by
 * person, so removing a staff member can end their work in every tenant.
 */
@Injectable()
export class ManagedOperatorsRepository {
  /** The staff currently working in the tenant, by name. */
  async findActive(tx: Transaction, tenantId: string): Promise<ManagedOperatorRecord[]> {
    return this.select(tx)
      .where(and(eq(managedOperators.tenantId, tenantId), isNull(managedOperators.removedAt)))
      .orderBy(asc(userAccounts.name), asc(userAccounts.email));
  }

  /** Every tenant one person currently works in (platform access only). */
  async findActiveByAccount(
    tx: Transaction,
    userAccountId: string,
  ): Promise<ManagedOperatorRecord[]> {
    return this.select(tx).where(
      and(eq(managedOperators.userAccountId, userAccountId), isNull(managedOperators.removedAt)),
    );
  }

  async insert(
    tx: Transaction,
    row: Omit<typeof managedOperators.$inferInsert, 'id'>,
  ): Promise<string> {
    const id = UuidV7.create();
    await tx.insert(managedOperators).values({ id, ...row });
    return id;
  }

  async markRemoved(tx: Transaction, id: string, removedBy: string | null): Promise<void> {
    await tx
      .update(managedOperators)
      .set({ removedAt: new Date(), removedBy, updatedAt: new Date() })
      .where(eq(managedOperators.id, id));
  }

  private select(tx: Transaction) {
    return tx
      .select({
        id: managedOperators.id,
        tenantId: managedOperators.tenantId,
        managedServiceId: managedOperators.managedServiceId,
        userAccountId: managedOperators.userAccountId,
        membershipId: managedOperators.membershipId,
        staffId: platformStaff.id,
        email: userAccounts.email,
        name: userAccounts.name,
        assignedAt: managedOperators.createdAt,
        removedAt: managedOperators.removedAt,
      })
      .from(managedOperators)
      .innerJoin(userAccounts, eq(userAccounts.id, managedOperators.userAccountId))
      .leftJoin(platformStaff, eq(platformStaff.userAccountId, managedOperators.userAccountId));
  }
}

import { Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { managedServices, platformStaff, Transaction, userAccounts } from '@wattwisely/db';
import {
  ManagedServiceRecord,
  ManagedServiceRow,
  ManagedServiceStatuses,
} from './managed-service-record';

/** A Wattwisely staff member who can be a tenant's account manager. */
export interface AccountManagerRecord {
  staffId: string;
  userAccountId: string;
  name: string;
  email: string;
}

/**
 * Reads and writes managed service agreements. A tenant's own requests see only its rows
 * (and may only update them); admin console requests see every tenant's.
 */
@Injectable()
export class ManagedServicesRepository {
  /** The agreement that is pending, active or ending: a tenant has at most one. */
  async findLive(tx: Transaction, tenantId: string): Promise<ManagedServiceRecord | null> {
    const rows = await this.select(tx)
      .where(
        and(
          eq(managedServices.tenantId, tenantId),
          inArray(managedServices.status, [...ManagedServiceStatuses.LIVE]),
        ),
      )
      .orderBy(desc(managedServices.offeredAt))
      .limit(1);
    return rows.map(ManagedServicesRepository.toRecord)[0] ?? null;
  }

  async findById(tx: Transaction, id: string): Promise<ManagedServiceRecord | null> {
    const rows = await this.select(tx).where(eq(managedServices.id, id));
    return rows.map(ManagedServicesRepository.toRecord)[0] ?? null;
  }

  /** Every agreement the tenant ever had, newest first. */
  async findHistory(tx: Transaction, tenantId: string): Promise<ManagedServiceRecord[]> {
    const rows = await this.select(tx)
      .where(eq(managedServices.tenantId, tenantId))
      .orderBy(desc(managedServices.offeredAt));
    return rows.map(ManagedServicesRepository.toRecord);
  }

  async insert(tx: Transaction, row: typeof managedServices.$inferInsert): Promise<void> {
    await tx.insert(managedServices).values(row);
  }

  /** Applies the change only when the row still has the version the caller saw. True when it did. */
  async update(
    tx: Transaction,
    id: string,
    version: number,
    changes: Partial<ManagedServiceRow>,
  ): Promise<boolean> {
    const rows = await tx
      .update(managedServices)
      .set({ ...changes, version: version + 1, updatedAt: new Date() })
      .where(and(eq(managedServices.id, id), eq(managedServices.version, version)))
      .returning({ id: managedServices.id });
    return rows.length === 1;
  }

  /** A current staff member by their platform_staff id (platform access only). */
  async findAccountManager(tx: Transaction, staffId: string): Promise<AccountManagerRecord | null> {
    const rows = await tx
      .select({
        staffId: platformStaff.id,
        userAccountId: platformStaff.userAccountId,
        name: userAccounts.name,
        email: userAccounts.email,
      })
      .from(platformStaff)
      .innerJoin(userAccounts, eq(userAccounts.id, platformStaff.userAccountId))
      .where(and(eq(platformStaff.id, staffId), isNull(platformStaff.removedAt)));
    return rows[0] ?? null;
  }

  private select(tx: Transaction) {
    return tx
      .select({
        ...ManagedServicesRepository.columns(),
        accountManager: {
          staffId: platformStaff.id,
          name: userAccounts.name,
          email: userAccounts.email,
        },
      })
      .from(managedServices)
      .leftJoin(platformStaff, eq(platformStaff.id, managedServices.accountManagerId))
      .leftJoin(userAccounts, eq(userAccounts.id, platformStaff.userAccountId));
  }

  /** A left-joined manager comes back with null fields once they left Wattwisely. */
  private static toRecord(
    row: ManagedServiceRow & {
      accountManager: { staffId: string | null; name: string | null; email: string | null };
    },
  ): ManagedServiceRecord {
    const manager = row.accountManager;
    return {
      ...row,
      accountManager: manager.staffId
        ? { staffId: manager.staffId, name: manager.name ?? '', email: manager.email ?? '' }
        : null,
    };
  }

  private static columns() {
    return {
      id: managedServices.id,
      tenantId: managedServices.tenantId,
      status: managedServices.status,
      accountManagerId: managedServices.accountManagerId,
      isTariffApprovalRequired: managedServices.isTariffApprovalRequired,
      monthlyFee: managedServices.monthlyFee,
      agreementReference: managedServices.agreementReference,
      notes: managedServices.notes,
      offeredBy: managedServices.offeredBy,
      offeredAt: managedServices.offeredAt,
      acceptedBy: managedServices.acceptedBy,
      acceptedAt: managedServices.acceptedAt,
      noticeGivenBy: managedServices.noticeGivenBy,
      noticeGivenAt: managedServices.noticeGivenAt,
      endsAt: managedServices.endsAt,
      endedAt: managedServices.endedAt,
      version: managedServices.version,
      createdAt: managedServices.createdAt,
      updatedAt: managedServices.updatedAt,
    };
  }
}

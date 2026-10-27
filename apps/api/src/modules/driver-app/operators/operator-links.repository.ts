import { Injectable } from '@nestjs/common';
import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import { drivers, tenants, Transaction } from '@wattwisely/db';
import { OperatorLinkRecord } from './operator-link-record';

/**
 * The drivers rows linked to a driver account (module 19). The transaction must carry the
 * account (DatabaseSession.forDriverAccount): RLS shows the account's own rows and no others.
 */
@Injectable()
export class OperatorLinksRepository {
  static readonly COLUMNS = {
    driverId: drivers.id,
    tenantId: drivers.tenantId,
    operatorName: tenants.name,
    operatorSlug: tenants.slug,
    driverName: drivers.name,
    reference: drivers.reference,
    status: drivers.status,
    paymentMode: drivers.paymentMode,
    linkedAt: drivers.linkedAt,
  };

  /** Every operator the account is linked with, by name; closed tenants are left out. */
  async findAll(tx: Transaction, driverAccountId: string): Promise<OperatorLinkRecord[]> {
    return this.select(tx, driverAccountId).orderBy(sql`lower(${tenants.name})`);
  }

  async findByTenant(
    tx: Transaction,
    driverAccountId: string,
    tenantId: string,
  ): Promise<OperatorLinkRecord | null> {
    const rows = await this.select(tx, driverAccountId).where(eq(drivers.tenantId, tenantId));
    return rows[0] ?? null;
  }

  private select(tx: Transaction, driverAccountId: string) {
    return tx
      .select(OperatorLinksRepository.COLUMNS)
      .from(drivers)
      .innerJoin(tenants, eq(tenants.id, drivers.tenantId))
      .where(
        and(
          eq(drivers.driverAccountId, driverAccountId),
          isNull(drivers.deletedAt),
          isNull(tenants.deletedAt),
          ne(tenants.status, 'cancelled'),
        ),
      )
      .$dynamic();
  }
}

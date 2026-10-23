import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { tenants, Transaction, UuidV7 } from '@wattwisely/db';
import { ManagedServiceErrors } from '../managed-service-errors';

/** The tenant an admin console request names, checked before its agreement is touched. */
@Injectable()
export class ManagedTenantLookup {
  /** The tenant, or 404. */
  async require(tx: Transaction, tenantId: string) {
    const rows = UuidV7.isUuid(tenantId)
      ? await tx
          .select({
            id: tenants.id,
            slug: tenants.slug,
            status: tenants.status,
            deletedAt: tenants.deletedAt,
          })
          .from(tenants)
          .where(eq(tenants.id, tenantId))
      : [];
    if (!rows[0]) {
      throw ManagedServiceErrors.tenantNotFound();
    }
    return rows[0];
  }

  /** The tenant, or 404; 409 when it was deleted. */
  async requireLive(tx: Transaction, tenantId: string) {
    const tenant = await this.require(tx, tenantId);
    if (tenant.deletedAt) {
      throw ManagedServiceErrors.tenantDeleted();
    }
    return tenant;
  }
}

import { Injectable } from '@nestjs/common';
import { and, eq, gt, isNull, or, sql } from 'drizzle-orm';
import { tenantEntitlements, Transaction } from '@wattwisely/db';

/**
 * Whether a tenant has an add-on right now (module 9's tenant_entitlements). Add-ons never
 * come with a plan, so an add-on job checks this before working for a tenant; a row that
 * is switched off or has run out counts as not having it.
 */
@Injectable()
export class AddonEntitlement {
  async has(tx: Transaction, tenantId: string, featureKey: string): Promise<boolean> {
    const rows = await tx
      .select({ id: tenantEntitlements.id })
      .from(tenantEntitlements)
      .where(
        and(
          eq(tenantEntitlements.tenantId, tenantId),
          eq(tenantEntitlements.featureKey, featureKey),
          eq(tenantEntitlements.isEnabled, true),
          or(isNull(tenantEntitlements.endsAt), gt(tenantEntitlements.endsAt, sql`now()`)),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }
}

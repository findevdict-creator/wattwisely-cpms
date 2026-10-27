import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { tenantEntitlements, Transaction, UuidV7 } from '@wattwisely/db';

/** What staff set when they switch a module for one tenant. */
export interface EntitlementChanges {
  source: 'addon' | 'trial' | 'override';
  isEnabled: boolean;
  endsAt: Date | null;
  note: string;
  grantedBy: string;
}

/** Writes tenant_entitlements for the admin console (platform access). One row per tenant and module. */
@Injectable()
export class TenantEntitlementsWriter {
  async upsert(
    tx: Transaction,
    tenantId: string,
    featureKey: string,
    changes: EntitlementChanges,
  ): Promise<void> {
    const [existing] = await tx
      .select({ id: tenantEntitlements.id, version: tenantEntitlements.version })
      .from(tenantEntitlements)
      .where(TenantEntitlementsWriter.ofModule(tenantId, featureKey));
    if (existing) {
      await tx
        .update(tenantEntitlements)
        .set({ ...changes, version: existing.version + 1, updatedAt: new Date() })
        .where(eq(tenantEntitlements.id, existing.id));
      return;
    }
    await tx
      .insert(tenantEntitlements)
      .values({ id: UuidV7.create(), tenantId, featureKey, ...changes });
  }

  /** True when there was a row to remove. */
  async delete(tx: Transaction, tenantId: string, featureKey: string): Promise<boolean> {
    const rows = await tx
      .delete(tenantEntitlements)
      .where(TenantEntitlementsWriter.ofModule(tenantId, featureKey))
      .returning({ id: tenantEntitlements.id });
    return rows.length > 0;
  }

  private static ofModule(tenantId: string, featureKey: string) {
    return and(
      eq(tenantEntitlements.tenantId, tenantId),
      eq(tenantEntitlements.featureKey, featureKey),
    );
  }
}

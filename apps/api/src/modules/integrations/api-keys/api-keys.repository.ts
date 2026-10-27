import { Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { apiKeys, Transaction, userAccounts } from '@wattwisely/db';
import { ApiKeyRecord } from './api-key-record';

/** Reads and writes a tenant's API keys (module 16). RLS shows the current tenant's rows only. */
@Injectable()
export class ApiKeysRepository {
  async findAll(tx: Transaction, keyId?: string): Promise<ApiKeyRecord[]> {
    return tx
      .select({
        id: apiKeys.id,
        tenantId: apiKeys.tenantId,
        name: apiKeys.name,
        description: apiKeys.description,
        keyHint: apiKeys.keyHint,
        permissionKeys: apiKeys.permissionKeys,
        createdBy: apiKeys.createdBy,
        createdByLabel: sql<string>`coalesce(nullif(${userAccounts.name}, ''), ${userAccounts.email})`,
        expiresAt: apiKeys.expiresAt,
        lastUsedAt: apiKeys.lastUsedAt,
        revokedAt: apiKeys.revokedAt,
        version: apiKeys.version,
        createdAt: apiKeys.createdAt,
        updatedAt: apiKeys.updatedAt,
      })
      .from(apiKeys)
      .innerJoin(userAccounts, eq(userAccounts.id, apiKeys.createdBy))
      .where(keyId ? eq(apiKeys.id, keyId) : undefined)
      .orderBy(asc(apiKeys.createdAt), asc(apiKeys.id));
  }

  async findById(tx: Transaction, keyId: string): Promise<ApiKeyRecord | null> {
    return (await this.findAll(tx, keyId))[0] ?? null;
  }

  async insert(tx: Transaction, row: typeof apiKeys.$inferInsert): Promise<void> {
    await tx.insert(apiKeys).values(row);
  }

  /** Applies the changes when the version still matches; false when someone else saved first. */
  async update(
    tx: Transaction,
    keyId: string,
    version: number,
    changes: Partial<typeof apiKeys.$inferInsert>,
  ): Promise<boolean> {
    const rows = await tx
      .update(apiKeys)
      .set({ ...changes, version: sql`${apiKeys.version} + 1`, updatedAt: new Date() })
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.version, version)))
      .returning({ id: apiKeys.id });
    return rows.length === 1;
  }
}

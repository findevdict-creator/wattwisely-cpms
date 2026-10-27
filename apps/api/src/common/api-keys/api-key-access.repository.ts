import { Injectable } from '@nestjs/common';
import { and, eq, isNull, lt, or } from 'drizzle-orm';
import { apiKeys, Transaction, userAccounts } from '@wattwisely/db';

/** An api_keys row with the account of the member who made it, as the lookup reads it. */
export interface ApiKeyLookupRow {
  id: string;
  tenantId: string;
  name: string;
  permissionKeys: string[];
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  account: { id: string; email: string; name: string };
}

/** Reads what ApiKeyAccessResolver needs, inside a session that names the token's hash. */
@Injectable()
export class ApiKeyAccessRepository {
  static readonly TOUCH_EVERY_MS = 60_000;

  async findByHash(tx: Transaction, keyHash: string): Promise<ApiKeyLookupRow | null> {
    const [row] = await tx
      .select({
        id: apiKeys.id,
        tenantId: apiKeys.tenantId,
        name: apiKeys.name,
        permissionKeys: apiKeys.permissionKeys,
        expiresAt: apiKeys.expiresAt,
        revokedAt: apiKeys.revokedAt,
        lastUsedAt: apiKeys.lastUsedAt,
        account: { id: userAccounts.id, email: userAccounts.email, name: userAccounts.name },
      })
      .from(apiKeys)
      .innerJoin(userAccounts, eq(userAccounts.id, apiKeys.createdBy))
      .where(eq(apiKeys.keyHash, keyHash));
    return row ?? null;
  }

  /** Moves last_used_at on, at most once a minute, so a busy key does not write a row per request. */
  async touch(tx: Transaction, keyId: string, now: Date): Promise<void> {
    const since = new Date(now.getTime() - ApiKeyAccessRepository.TOUCH_EVERY_MS);
    await tx
      .update(apiKeys)
      .set({ lastUsedAt: now })
      .where(
        and(eq(apiKeys.id, keyId), or(isNull(apiKeys.lastUsedAt), lt(apiKeys.lastUsedAt, since))),
      );
  }
}

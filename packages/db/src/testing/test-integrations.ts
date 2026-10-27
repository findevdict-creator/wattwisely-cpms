import { createHash, randomBytes } from 'node:crypto';
import { UuidV7 } from '../client/uuid-v7';
import { TestData } from './test-data';

/** What else a test API key can say. */
export interface ApiKeyOptions {
  name?: string;
  expiresAt?: Date;
  revokedAt?: Date;
}

/** What else a test webhook endpoint can say. */
export interface WebhookEndpointOptions {
  secret?: string;
  isActive?: boolean;
  /** Events before this moment are not sent; defaults to now, as the API sets it. */
  scannedTo?: Date;
}

/**
 * API keys and webhook endpoints for tests (module 16), written as the API would: the key's
 * token is made here and only its hash stored; the caller gets the token to send.
 */
export class TestIntegrations {
  static readonly TOKEN_PREFIX = 'wwk_';

  constructor(private readonly data: TestData) {}

  /** A key acting for `accountId` with these permissions; answers the token and the row id. */
  async apiKey(
    tenantId: string,
    accountId: string,
    permissionKeys: string[],
    options: ApiKeyOptions = {},
  ): Promise<{ id: string; token: string }> {
    const id = UuidV7.create();
    const token = `${TestIntegrations.TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
    await this.data.sql(
      `insert into api_keys (id, tenant_id, name, key_hash, key_hint, permission_keys, created_by, expires_at, revoked_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        tenantId,
        options.name ?? 'Test key',
        createHash('sha256').update(token).digest('hex'),
        token.slice(-4),
        JSON.stringify(permissionKeys),
        accountId,
        options.expiresAt ?? null,
        options.revokedAt ?? null,
      ],
    );
    return { id, token };
  }

  async webhookEndpoint(
    tenantId: string,
    url: string,
    eventTypes: string[],
    options: WebhookEndpointOptions = {},
  ): Promise<{ id: string; secret: string }> {
    const id = UuidV7.create();
    const secret = options.secret ?? `whsec_${randomBytes(32).toString('base64url')}`;
    await this.data.sql(
      `insert into webhook_endpoints (id, tenant_id, url, secret, event_types, is_active, scanned_to)
       values ($1, $2, $3, $4, $5, $6, coalesce($7, now()))`,
      [
        id,
        tenantId,
        url,
        secret,
        JSON.stringify(eventTypes),
        options.isActive ?? true,
        options.scannedTo ?? null,
      ],
    );
    return { id, secret };
  }
}

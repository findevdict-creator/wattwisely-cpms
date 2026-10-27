/** GET /v1/api-keys: one key, without its token (module 16). */
export interface ApiKey {
  id: string;
  name: string;
  description: string;
  /** Enough of the token to tell keys apart, e.g. "wwk_…k7q2". */
  key_hint: string;
  permissions: string[];
  created_by: string;
  expires_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
  status: 'active' | 'expired' | 'revoked';
  /** Sent back as If-Match when renaming or revoking the key. */
  version: number;
  created_at: string;
}

/** Body of POST /v1/api-keys. */
export interface ApiKeyInput {
  name: string;
  description: string;
  permissions: string[];
  expires_at: string | null;
}

/** The answer to POST /v1/api-keys: the key, and the token shown this once. */
export interface CreatedApiKey {
  key: ApiKey;
  token: string;
}

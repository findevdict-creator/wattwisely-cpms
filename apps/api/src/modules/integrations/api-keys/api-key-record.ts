/** An api_keys row as the repository returns it; the hash never leaves the repository. */
export interface ApiKeyRecord {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  keyHint: string;
  permissionKeys: string[];
  createdBy: string;
  createdByLabel: string;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

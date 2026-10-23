/** One audit entry across the platform (GET /v1/admin/audit-log). */
export interface PlatformAuditEntry {
  id: string;
  tenant_id: string | null;
  occurred_at: string;
  actor_type: 'user' | 'api_key' | 'support' | 'system' | 'platform';
  actor_label: string;
  action: string;
  target_type: string;
  target_id: string | null;
  target_label: string | null;
  before?: unknown;
  after?: unknown;
}

/** One page of the platform-wide audit log, newest first. */
export interface PlatformAuditPage {
  items: PlatformAuditEntry[];
  next_cursor: string | null;
}

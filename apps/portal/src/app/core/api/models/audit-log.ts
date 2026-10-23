/** One audit log entry: who did what to what, and when. */
export interface AuditLogEntry {
  id: string;
  occurred_at: string;
  /** 'managed': a Wattwisely staff member working in the company as its Managed operator. */
  actor_type: 'user' | 'api_key' | 'support' | 'system' | 'platform' | 'managed';
  actor_id: string | null;
  actor_label: string;
  action: string;
  target_type: string;
  target_id: string | null;
  target_label: string | null;
  ip: string | null;
}

/** One page of GET /v1/audit-log, newest first. */
export interface AuditLogPage {
  items: AuditLogEntry[];
  next_cursor: string | null;
}

/** One audit log row as the repository returns it. */
export interface AuditLogRecord {
  id: string;
  occurredAt: Date;
  actorType: 'user' | 'api_key' | 'support' | 'system';
  actorId: string | null;
  actorLabel: string;
  action: string;
  targetType: string;
  targetId: string | null;
  targetLabel: string | null;
  before: unknown;
  after: unknown;
  ip: string | null;
  requestId: string | null;
}

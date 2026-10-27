/** Who did something: a member, an API key, Wattwisely staff (support inside a tenant, platform from the admin console) or the system. */
export type AuditActorType = 'user' | 'api_key' | 'support' | 'system' | 'platform';

/** One audit log row as the repository returns it. */
export interface AuditLogRecord {
  id: string;
  /** Empty for platform actions, e.g. a plan changed in the admin console. */
  tenantId: string | null;
  occurredAt: Date;
  actorType: AuditActorType;
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

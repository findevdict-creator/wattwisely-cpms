/** One thing that happened, as a service describes it to AuditRecorder. */
export interface AuditEntry {
  /** "<area>.<what happened>", e.g. "team.member_invited". */
  action: string;
  targetType: string;
  targetId: string;
  targetLabel?: string;
  before?: unknown;
  after?: unknown;
}

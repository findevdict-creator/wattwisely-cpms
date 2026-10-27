/** Which audit log entries an export holds: the filters of the portal's audit log page. */
export interface AuditLogExportFilter {
  /** Comma list of actions. */
  action?: string;
  actorType?: string;
  targetType?: string;
  /** Inclusive (ISO 8601). */
  from?: string;
  /** Exclusive (ISO 8601). */
  to?: string;
}

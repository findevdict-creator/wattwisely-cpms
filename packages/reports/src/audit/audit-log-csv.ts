import { CsvTable } from '../csv/csv-table';

/** What one row of the audit log CSV needs. */
export interface AuditLogCsvRow {
  id: string;
  occurredAt: Date;
  actorType: string;
  actorLabel: string;
  action: string;
  targetType: string;
  targetId: string | null;
  targetLabel: string | null;
  before: unknown;
  after: unknown;
  ip: string | null;
}

/** The audit log as CSV (story ADM-04's tenant side): the before and after values as JSON text. */
export class AuditLogCsv {
  static readonly HEADER = [
    'entry_id',
    'occurred_at',
    'actor_type',
    'actor',
    'action',
    'target_type',
    'target_id',
    'target',
    'before',
    'after',
    'ip',
  ];

  static of(entries: readonly AuditLogCsvRow[]): string {
    return CsvTable.of(
      AuditLogCsv.HEADER,
      entries.map((entry) => AuditLogCsv.row(entry)),
    );
  }

  private static row(entry: AuditLogCsvRow): string[] {
    const json = (value: unknown) =>
      value === null || value === undefined ? '' : JSON.stringify(value);
    return [
      entry.id,
      entry.occurredAt.toISOString(),
      entry.actorType,
      entry.actorLabel,
      entry.action,
      entry.targetType,
      entry.targetId ?? '',
      entry.targetLabel ?? '',
      json(entry.before),
      json(entry.after),
      entry.ip ?? '',
    ];
  }
}

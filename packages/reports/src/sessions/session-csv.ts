import { CsvTable } from '../csv/csv-table';
import { MoneyText } from '../csv/money-text';
import { SessionCsvRow } from './session-csv-row';

/**
 * Sessions as CSV for finance (story SES-04): one row per session, amounts in the major
 * unit of the currency ("8.80"), energy in kWh. The API's direct download and the worker's
 * background export write the same file.
 */
export class SessionCsv {
  static readonly HEADER = [
    'session_id',
    'status',
    'site',
    'charger',
    'connector',
    'id_tag',
    'started_at',
    'ended_at',
    'unplugged_at',
    'energy_kwh',
    'currency',
    'net',
    'tax',
    'gross',
    'review_flags',
    'failure_reason',
  ];

  static of(sessions: readonly SessionCsvRow[]): string {
    return CsvTable.of(
      SessionCsv.HEADER,
      sessions.map((session) => SessionCsv.row(session)),
    );
  }

  static row(session: SessionCsvRow): string[] {
    const money = (amount: number | null) =>
      amount === null || !session.currency ? '' : MoneyText.major(amount, session.currency);
    return [
      session.id,
      session.status,
      session.siteName,
      session.chargerIdentity,
      session.connectorLabel,
      session.idTag,
      session.startedAt.toISOString(),
      session.endedAt?.toISOString() ?? '',
      session.unpluggedAt?.toISOString() ?? '',
      (session.energyWh / 1000).toFixed(3),
      session.currency ?? '',
      money(session.netAmount),
      money(session.taxAmount),
      money(session.grossAmount),
      session.reviewFlags.join(' '),
      session.failureReason ?? '',
    ];
  }
}

import { Currency } from '@wattwisely/pricing';
import { SessionRecord } from './session-record';

/**
 * Sessions as CSV for finance: one row per session, amounts in the
 * major unit of the currency ("8.80"), energy in kWh. Text a spreadsheet would read as
 * a formula gets a leading apostrophe.
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

  static of(sessions: SessionRecord[]): string {
    const rows = [SessionCsv.HEADER, ...sessions.map((session) => SessionCsv.row(session))];
    return rows.map((row) => row.map((cell) => SessionCsv.cell(cell)).join(',')).join('\r\n');
  }

  private static row(session: SessionRecord): string[] {
    const money = (amount: number | null) =>
      amount === null || !session.currency ? '' : SessionCsv.major(amount, session.currency);
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

  private static major(amount: number, currency: string): string {
    return (amount / Currency.minorPerMajor(currency)).toFixed(Currency.decimals(currency));
  }

  private static cell(value: string): string {
    const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  }
}

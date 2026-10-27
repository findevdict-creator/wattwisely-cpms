import { CsvTable } from '../csv/csv-table';
import { MoneyText } from '../csv/money-text';
import { UsageReport, UsageRow } from './usage-row';

/**
 * The usage report as CSV: one row per site or charger, then a total row. Revenue gets a
 * column per currency (revenue_GBP), in the major unit.
 */
export class UsageCsv {
  static of(report: UsageReport): string {
    const currencies = [
      ...new Set(report.totals.revenue.map((revenue) => revenue.currency)),
    ].sort();
    const header = [
      'name',
      'site',
      'chargers',
      'connectors',
      'sessions',
      'energy_kwh',
      ...currencies.map((currency) => `revenue_${currency}`),
      'utilisation_percent',
      'uptime_percent',
      'offline_hours',
    ];
    const total = { ...report.totals, id: '', name: 'Total', siteName: '' };
    const rows = [...report.rows, total].map((row) => UsageCsv.row(row, currencies));
    return CsvTable.of(header, rows);
  }

  private static row(row: UsageRow, currencies: string[]): string[] {
    const amount = (currency: string) =>
      row.revenue.find((revenue) => revenue.currency === currency)?.amount ?? 0;
    return [
      row.name,
      row.siteName,
      String(row.chargers),
      String(row.connectors),
      String(row.sessions),
      (row.energyWh / 1000).toFixed(3),
      ...currencies.map((currency) => MoneyText.major(amount(currency), currency)),
      row.utilisationPercent.toFixed(1),
      row.uptimePercent.toFixed(1),
      (row.offlineSeconds / 3600).toFixed(2),
    ];
  }
}

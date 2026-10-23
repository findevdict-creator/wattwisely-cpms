/**
 * A CSV file for spreadsheets: comma separated, CRLF line ends, quotes around cells that
 * need them. Text a spreadsheet would read as a formula gets a leading apostrophe, so an
 * exported name like "=HYPERLINK(...)" stays text (CSV injection).
 */
export class CsvTable {
  static readonly LINE_END = '\r\n';

  static of(header: readonly string[], rows: readonly (readonly string[])[]): string {
    return [header, ...rows].map((row) => CsvTable.line(row)).join(CsvTable.LINE_END);
  }

  static line(row: readonly string[]): string {
    return row.map((cell) => CsvTable.cell(cell)).join(',');
  }

  static cell(value: string): string {
    const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  }
}

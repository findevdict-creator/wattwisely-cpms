import { CsvTable, MoneyText, PaymentRuleText } from '@wattwisely/reports';
import { DriverChargeRecord } from './driver-charge-record';

/** The driver's charges as a CSV file for their own records: amounts in the major unit, energy in kWh. */
export class DriverChargeCsv {
  static readonly HEADER = [
    'started_at',
    'ended_at',
    'operator',
    'site',
    'charger',
    'connector',
    'status',
    'energy_kwh',
    'currency',
    'amount',
    'payment_rule',
    'payment_status',
    'card',
  ];

  static of(records: readonly DriverChargeRecord[]): string {
    return CsvTable.of(
      DriverChargeCsv.HEADER,
      records.map((record) => DriverChargeCsv.row(record)),
    );
  }

  static row(record: DriverChargeRecord): string[] {
    const amount = record.capturedAmount ?? record.grossAmount;
    return [
      record.startedAt.toISOString(),
      record.endedAt?.toISOString() ?? '',
      record.operatorName,
      record.siteName,
      record.chargerIdentity,
      record.connectorLabel,
      record.status,
      (record.energyWh / 1000).toFixed(3),
      record.currency ?? '',
      amount === null || !record.currency ? '' : MoneyText.major(amount, record.currency),
      PaymentRuleText.of(record.paymentRule),
      record.paymentStatus ?? '',
      record.cardLast4 ? `${record.cardBrand ?? 'card'} ${record.cardLast4}` : '',
    ];
  }
}

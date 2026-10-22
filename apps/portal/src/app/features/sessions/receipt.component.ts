import { DecimalPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { ReceiptLine } from '../../core/api/models/tariff';
import { MoneyPipe } from '../../shared/money.pipe';
import { ZonedTimePipe } from '../../shared/zoned-time.pipe';

/** A receipt: one row per line (start fee, energy per band, time, idle fee, adjustment) and totals. */
@Component({
  selector: 'ww-receipt',
  imports: [DecimalPipe, MoneyPipe, ZonedTimePipe],
  templateUrl: './receipt.component.html',
  styleUrl: './receipt.component.scss',
})
export class ReceiptComponent {
  static readonly KIND: Record<string, string> = {
    start_fee: 'Start fee',
    energy: 'Energy',
    time: 'Charging time',
    idle: 'Idle fee',
    adjustment: 'Minimum or maximum price',
  };

  readonly lines = input.required<ReceiptLine[]>();
  readonly currency = input.required<string>();
  readonly totals = input.required<{
    net: number | null;
    tax: number | null;
    gross: number | null;
  }>();
  readonly timeZone = input<string | undefined>(undefined);

  protected labelOf(line: ReceiptLine): string {
    const kind = ReceiptComponent.KIND[line.kind] ?? line.kind;
    return line.band_name ? `${kind}, ${line.band_name}` : kind;
  }
}

import { DecimalPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { ChargeReceipt, ReceiptLine } from '../../core/api/models/charge';
import { MoneyPipe } from '../../shared/money.pipe';
import { ZonedTimePipe } from '../../shared/zoned-time.pipe';

/** The receipt, one line per item, sized for a phone. */
@Component({
  selector: 'ww-charge-receipt',
  imports: [DecimalPipe, MoneyPipe, ZonedTimePipe],
  templateUrl: './charge-receipt.component.html',
  styleUrl: './charge-receipt.component.scss',
})
export class ChargeReceiptComponent {
  static readonly KIND: Record<string, string> = {
    start_fee: 'Start fee',
    energy: 'Energy',
    time: 'Charging time',
    idle: 'Idle fee',
    adjustment: 'Minimum or maximum price',
  };

  readonly receipt = input.required<ChargeReceipt>();
  readonly currency = input.required<string>();
  readonly timeZone = input.required<string>();

  protected labelOf(line: ReceiptLine): string {
    const kind = ChargeReceiptComponent.KIND[line.kind] ?? line.kind;
    return line.band_name ? `${kind}, ${line.band_name}` : kind;
  }
}

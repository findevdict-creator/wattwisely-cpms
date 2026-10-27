import { Component, input } from '@angular/core';
import { SessionPayment } from '../../core/api/models/payment';
import { MoneyPipe } from '../../shared/money.pipe';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { StatusLabels } from '../../shared/status-labels';
import { ZonedTimePipe } from '../../shared/zoned-time.pipe';

/** The card payment of a session: what was taken, the card, the hold, and the refunds. */
@Component({
  selector: 'ww-session-payment',
  imports: [MoneyPipe, StatusChipComponent, ZonedTimePipe],
  templateUrl: './session-payment.component.html',
  styles: `
    .refunds {
      display: flex;
      flex-direction: column;
    }
  `,
})
export class SessionPaymentComponent {
  /** Payments in these states have money that can go back to the card. */
  static readonly REFUNDABLE = ['captured', 'partially_refunded'];

  readonly payment = input.required<SessionPayment>();
  readonly timeZone = input.required<string>();

  protected readonly flagLabel = StatusLabels.reviewFlag;

  /** "visa" as "Visa". */
  protected brandOf(brand: string | null): string {
    return brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : 'Card';
  }
}

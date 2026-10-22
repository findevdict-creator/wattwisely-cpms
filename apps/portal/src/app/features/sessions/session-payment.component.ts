import { Component, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { SessionPayment } from '../../core/api/models/payment';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { MoneyPipe } from '../../shared/money.pipe';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { StatusLabels } from '../../shared/status-labels';
import { ZonedTimePipe } from '../../shared/zoned-time.pipe';
import { RefundDialogComponent } from '../payments/refund-dialog.component';

/** The card payment of a session: the hold, what was taken, the card, and the refunds. */
@Component({
  selector: 'ww-session-payment',
  imports: [MatButtonModule, MatCardModule, MoneyPipe, StatusChipComponent, ZonedTimePipe],
  templateUrl: './session-payment.component.html',
})
export class SessionPaymentComponent {
  static readonly REFUNDABLE = ['captured', 'partially_refunded'];

  readonly payment = input.required<SessionPayment>();
  readonly timeZone = input.required<string>();
  /** A refund was requested; the page reloads the session. */
  readonly refunded = output<void>();

  protected readonly permissions = inject(PermissionsService);
  private readonly dialog = inject(MatDialog);

  protected readonly flagLabel = StatusLabels.reviewFlag;

  protected canRefund(): boolean {
    return (
      SessionPaymentComponent.REFUNDABLE.includes(this.payment().status) &&
      this.permissions.canChange('payments:refund')
    );
  }

  protected async refund(): Promise<void> {
    const dialog = this.dialog.open(RefundDialogComponent, { data: this.payment() });
    if (await firstValueFrom(dialog.afterClosed())) {
      this.refunded.emit();
    }
  }
}

import { DecimalPipe, TitleCasePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  ChargeWords,
  DriverChargeDetail,
  DriverChargeStates,
  Initials,
  MoneyPipe,
  PublicBranding,
  ZonedTimePipe,
} from '@wattwisely/driver-core';
import { SupportContactComponent } from '../../shared/support-contact.component';
import { ChargeReceiptComponent } from '../charge/charge-receipt.component';

/**
 * A finished charge started with the login (module 36), as the card page's receipt reads: what
 * was paid and with which card, what goes back from the hold, each line of the receipt with
 * its tax and total, how to reach the operator, and the receipt as a PDF.
 */
@Component({
  selector: 'ww-charge-complete',
  imports: [
    ChargeReceiptComponent,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MoneyPipe,
    SupportContactComponent,
    TitleCasePipe,
    ZonedTimePipe,
  ],
  templateUrl: './charge-complete.component.html',
  styleUrl: '../charge/charge-done.component.scss',
})
export class ChargeCompleteComponent {
  readonly charge = input.required<DriverChargeDetail>();
  readonly branding = input<PublicBranding | null>(null);
  readonly isDownloading = input(false);
  readonly download = output<void>();

  protected readonly isFree = computed(() => this.charge().payment_rule?.outcome === 'free');
  protected readonly currency = computed(() => this.charge().currency ?? 'EUR');
  protected readonly total = computed(
    () => this.charge().receipt?.gross ?? this.charge().amount ?? 0,
  );
  protected readonly paymentLabel = computed(() => {
    const payment = this.charge().payment;
    return payment ? ChargeWords.payment(payment.status) : '';
  });
  protected readonly isSettling = computed(() => this.charge().payment?.status === 'authorised');
  protected readonly released = computed(() => DriverChargeStates.released(this.charge()));
  protected readonly issuer = computed(() => this.branding()?.name ?? this.charge().operator_name);
  protected readonly initials = computed(() => Initials.of(this.issuer()));
}

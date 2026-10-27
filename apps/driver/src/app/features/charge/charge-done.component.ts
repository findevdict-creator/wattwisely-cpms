import { DecimalPipe, TitleCasePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Charge } from '../../core/api/models/charge';
import { ChargeHold } from '../../shared/charge-hold';
import { ChargeWords } from '../../shared/charge-words';
import { Initials } from '../../shared/initials';
import { MoneyPipe } from '../../shared/money.pipe';
import { SupportContactComponent } from '../../shared/support-contact.component';
import { ZonedTimePipe } from '../../shared/zoned-time.pipe';
import { ChargeReceiptComponent } from './charge-receipt.component';

/**
 * A finished charge: what was paid and with which card, what goes back from the hold, and the
 * receipt in the operator's name, with the way to reach them.
 */
@Component({
  selector: 'ww-charge-done',
  imports: [
    ChargeReceiptComponent,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MoneyPipe,
    RouterLink,
    SupportContactComponent,
    TitleCasePipe,
    ZonedTimePipe,
  ],
  templateUrl: './charge-done.component.html',
  styleUrl: './charge-done.component.scss',
})
export class ChargeDoneComponent {
  readonly charge = input.required<Charge>();

  protected readonly paymentLabel = computed(() =>
    ChargeWords.payment(this.charge().payment_status),
  );
  protected readonly released = computed(() => ChargeHold.released(this.charge()));
  protected readonly initials = computed(() => Initials.of(this.charge().branding.name));
}

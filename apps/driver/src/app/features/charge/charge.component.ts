import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, effect, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { BrandService } from '../../core/branding/brand.service';
import { ChargePhases } from '../../shared/charge-phase';
import { ChargeWords } from '../../shared/charge-words';
import { DurationPipe } from '../../shared/duration.pipe';
import { MoneyPipe } from '../../shared/money.pipe';
import { SupportContactComponent } from '../../shared/support-contact.component';
import { ZonedTimePipe } from '../../shared/zoned-time.pipe';
import { CardFormComponent } from './card-form.component';
import { ChargeReceiptComponent } from './charge-receipt.component';
import { ChargeStore } from './charge.store';

/**
 * One charge, from the card form to the receipt: the page the driver keeps open (or
 * comes back to) while the car charges. Which part shows depends on the charge's phase.
 * The page and the receipt wear the operator's brand (module 8).
 */
@Component({
  selector: 'ww-charge',
  imports: [
    CardFormComponent,
    ChargeReceiptComponent,
    DecimalPipe,
    DurationPipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MoneyPipe,
    RouterLink,
    SupportContactComponent,
    ZonedTimePipe,
  ],
  providers: [ChargeStore],
  templateUrl: './charge.component.html',
  styleUrl: './charge.component.scss',
})
export class ChargeComponent implements OnInit {
  readonly key = input.required<string>();
  /** Set by the card form's return address when a payment method sent the driver away and back. */
  readonly returned = input<string>();

  protected readonly store = inject(ChargeStore);
  private readonly brandService = inject(BrandService);

  protected readonly phase = computed(() => {
    const charge = this.store.charge();
    return charge ? ChargePhases.of(charge) : null;
  });
  protected readonly statusLabel = computed(() =>
    ChargeWords.session(this.store.charge()?.session_status ?? ''),
  );
  protected readonly paymentLabel = computed(() =>
    ChargeWords.payment(this.store.charge()?.payment_status ?? ''),
  );
  protected readonly failureLabel = computed(() => {
    const charge = this.store.charge();
    return charge ? ChargeWords.failure(charge.failure_reason, charge.failure_message) : '';
  });

  constructor() {
    effect(() => {
      const charge = this.store.charge();
      if (charge) {
        this.brandService.apply(charge.branding);
      }
    });
  }

  ngOnInit(): void {
    void this.store.follow(this.key(), this.returned() === '1');
  }

  protected check(): void {
    void this.store.check(this.key());
  }

  protected stop(): void {
    void this.store.stop(this.key());
  }
}

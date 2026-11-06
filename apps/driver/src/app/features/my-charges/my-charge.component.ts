import { Component, OnInit, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { ChargeWords, DriverChargeStates } from '@wattwisely/driver-core';
import { BrandService } from '../../core/branding/brand.service';
import { ChargeStepsComponent } from '../charge/charge-steps.component';
import { ChargeCompleteComponent } from './charge-complete.component';
import { ChargeLiveComponent } from './charge-live.component';
import { ChargeStartingComponent } from './charge-starting.component';
import { MyChargeStore } from './my-charge.store';
import { PowerChartComponent } from './power-chart.component';

/**
 * One of the driver's charges (module 19), from the start to the receipt (module 36): the
 * steps over it while it is under way, the hold and the charger while it starts, the cost so
 * far, power and battery with the power chart while it charges, then the receipt line by line
 * with its PDF, or why it did not start. Who pays shows under it throughout.
 */
@Component({
  selector: 'ww-my-charge',
  imports: [
    ChargeCompleteComponent,
    ChargeLiveComponent,
    ChargeStartingComponent,
    ChargeStepsComponent,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PowerChartComponent,
    RouterLink,
  ],
  providers: [MyChargeStore],
  templateUrl: './my-charge.component.html',
  styleUrl: './my-charge.component.scss',
})
export class MyChargeComponent implements OnInit {
  readonly id = input.required<string>();

  protected readonly store = inject(MyChargeStore);

  protected readonly view = computed(() => {
    const charge = this.store.charge();
    return charge ? DriverChargeStates.view(charge) : null;
  });
  protected readonly phase = computed(() => {
    const charge = this.store.charge();
    return charge ? DriverChargeStates.phase(charge) : null;
  });
  protected readonly firstStep = computed(() =>
    this.store.charge()?.payment_rule?.outcome === 'free' ? 'Free' : 'Paid',
  );
  protected readonly isCardRefused = computed(() => {
    const charge = this.store.charge();
    return charge?.payment?.status === 'failed' || charge?.failure_reason === 'declined';
  });
  protected readonly failure = computed(() => {
    const charge = this.store.charge();
    if (!charge) {
      return '';
    }
    const message = charge.payment?.failure_message ?? null;
    if (this.isCardRefused()) {
      const reason = message ? `${message} ` : '';
      return `${reason}Nothing was charged. Try another card, or add a new one on your account.`;
    }
    return ChargeWords.failure(charge.failure_reason, message);
  });

  constructor() {
    inject(BrandService).reset();
  }

  ngOnInit(): void {
    void this.store.follow(this.id());
  }

  protected stop(): void {
    void this.store.stop(this.id());
  }
}

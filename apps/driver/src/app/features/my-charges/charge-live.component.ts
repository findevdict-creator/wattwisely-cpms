import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  ChargeChips,
  ChargeReading,
  DriverChargeDetail,
  DurationPipe,
  Money,
  PowerBars,
} from '@wattwisely/driver-core';

/**
 * A charge started with the login, under way (module 36): the cost so far in large type, then
 * energy, power, time, the hold and the battery when the car reports it, and Stop.
 */
@Component({
  selector: 'ww-charge-live',
  imports: [DurationPipe, MatButtonModule, MatIconModule],
  templateUrl: './charge-live.component.html',
  styleUrl: '../charge/charge.component.scss',
})
export class ChargeLiveComponent {
  readonly charge = input.required<DriverChargeDetail>();
  readonly readings = input.required<ChargeReading[]>();
  readonly now = input.required<number>();
  readonly isBusy = input(false);
  readonly stop = output<void>();

  protected readonly chip = computed(() => ChargeChips.session(this.charge().status));
  protected readonly isFree = computed(() => this.charge().payment_rule?.outcome === 'free');
  protected readonly cost = computed(() =>
    Money.format(this.charge().amount ?? 0, this.charge().currency),
  );
  protected readonly energy = computed(() => (this.charge().energy_wh / 1000).toFixed(1));
  protected readonly power = computed(() => {
    const watts = PowerBars.latest(this.readings(), 'power_w');
    return watts === null || this.charge().status !== 'charging'
      ? '—'
      : `${(watts / 1000).toFixed(1)} kW`;
  });
  protected readonly battery = computed(() => PowerBars.latest(this.readings(), 'soc_percent'));
  protected readonly hold = computed(() => {
    const payment = this.charge().payment;
    return payment ? Money.format(payment.hold_amount, this.charge().currency) : null;
  });
}

import { Component, computed, input, output } from '@angular/core';
import { IonButton, IonSpinner } from '@ionic/angular';
import { ChargeReading, DriverChargeDetail, DurationPipe, Money } from '@wattwisely/driver-core';
import { PowerBars } from '../../core/charging/power-bars';
import { PowerChartComponent } from './power-chart.component';

/**
 * The charge under way (Figma 10, "Live session"): energy, power, time, the cost so far and the
 * hold, the battery when the car reports it, the power chart, and Stop.
 */
@Component({
  selector: 'ww-live-view',
  imports: [DurationPipe, IonButton, IonSpinner, PowerChartComponent],
  templateUrl: './live-view.component.html',
  styleUrl: './session-views.scss',
})
export class LiveViewComponent {
  readonly charge = input.required<DriverChargeDetail>();
  readonly readings = input.required<ChargeReading[]>();
  readonly now = input.required<number>();
  readonly isStopping = input(false);
  readonly stop = output<void>();

  protected readonly energy = computed(() => (this.charge().energy_wh / 1000).toFixed(1));
  protected readonly power = computed(() => {
    const watts = PowerBars.latest(this.readings(), 'power_w');
    return watts === null || this.charge().status !== 'charging'
      ? '—'
      : `${Math.round(watts / 1000)} kW`;
  });
  protected readonly battery = computed(() => PowerBars.latest(this.readings(), 'soc_percent'));
  protected readonly cost = computed(() =>
    Money.format(this.charge().amount, this.charge().currency),
  );
  protected readonly hold = computed(() => {
    const payment = this.charge().payment;
    return payment ? Money.format(payment.hold_amount, this.charge().currency) : null;
  });
}

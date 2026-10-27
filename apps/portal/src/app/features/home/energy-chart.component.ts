import { Component, computed, input } from '@angular/core';
import { UsageFigures } from '../reports/usage-figures';
import { DayEnergy } from './home.store';

/** Energy per day for the last days, as bars; today's bar, still filling, is the dark one. */
@Component({
  selector: 'ww-energy-chart',
  template: `
    <section class="ww-card" aria-labelledby="energy-title">
      <div class="ww-card-head">
        <div class="titles">
          <h2 id="energy-title">Energy per day</h2>
          <p>kWh, last {{ bars().length }} days</p>
        </div>
      </div>
      <div class="ww-card-body">
        <div class="bars" role="list">
          @for (bar of bars(); track bar.label; let last = $last) {
            <span
              class="bar"
              role="listitem"
              [class.today]="last"
              [style.height.%]="bar.height"
              [attr.aria-label]="bar.label + ': ' + bar.energy"
              [attr.title]="bar.label + ': ' + bar.energy"
            ></span>
          }
        </div>
        <div class="labels" aria-hidden="true">
          @for (bar of bars(); track bar.label) {
            <span>{{ bar.day }}</span>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .ww-card {
      height: 100%;
      box-sizing: border-box;
    }
    .bars {
      display: flex;
      gap: 14px;
      align-items: flex-end;
      height: 110px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .bar {
      flex: 1;
      min-height: 2px;
      border-radius: 4px 4px 0 0;
      background: var(--ww-brand-soft);
    }
    .bar.today {
      background: var(--ww-brand);
    }
    .labels {
      display: flex;
      gap: 14px;
    }
    .labels span {
      flex: 1;
      text-align: center;
      font-size: 12px;
      font-weight: 500;
      color: var(--mat-sys-outline);
    }
  `,
})
export class EnergyChartComponent {
  readonly days = input.required<DayEnergy[]>();

  protected readonly bars = computed(() => {
    const max = Math.max(...this.days().map((day) => day.energyWh), 1);
    return this.days().map((day) => {
      const date = new Date(day.from);
      return {
        day: date.toLocaleDateString(undefined, { weekday: 'short' }),
        label: date.toLocaleDateString(undefined, {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
        }),
        energy: UsageFigures.energy(day.energyWh),
        height: (day.energyWh / max) * 100,
      };
    });
  });
}

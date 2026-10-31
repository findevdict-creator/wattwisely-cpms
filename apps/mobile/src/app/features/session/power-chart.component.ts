import { Component, computed, input } from '@angular/core';
import { ChargeReading } from '@wattwisely/driver-core';
import { PowerBars } from '../../core/charging/power-bars';

/** "Power over time" (Figma 10, "Live session"): the charge's power as up to 18 bars. */
@Component({
  selector: 'ww-power-chart',
  template: `
    <h2>Power over time</h2>
    @if (bars().length) {
      <div
        class="bars"
        role="img"
        aria-label="The charging power since the start"
        data-testid="power-bars"
      >
        @for (bar of bars(); track $index) {
          <span [style.height.%]="bar * 100"></span>
        }
      </div>
    } @else {
      <p class="ww-lead">The chart starts with the charger's first reading.</p>
    }
  `,
  styles: `
    h2 {
      margin: 0;
      font: 600 15px/20px var(--ww-font);
    }
    .bars {
      display: flex;
      gap: 4px;
      align-items: flex-end;
      height: 72px;
    }
    .bars span {
      flex: 1;
      min-height: 4px;
      border-radius: 3px 3px 0 0;
      background: var(--ww-brand);
    }
  `,
  host: { class: 'ww-card' },
})
export class PowerChartComponent {
  readonly readings = input.required<ChargeReading[]>();

  protected readonly bars = computed(() => PowerBars.of(this.readings()));
}

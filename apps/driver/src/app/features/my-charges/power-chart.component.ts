import { Component, computed, input } from '@angular/core';
import { ChargeReading, PowerBars } from '@wattwisely/driver-core';

/** "Power over time" (module 36): the charge's power as up to 18 bars, as in the mobile app. */
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
      <p class="hint">The chart starts with the charger's first reading.</p>
    }
  `,
  styles: `
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
      background: var(--mat-sys-primary);
    }
  `,
  host: { class: 'panel' },
})
export class PowerChartComponent {
  readonly readings = input.required<ChargeReading[]>();

  protected readonly bars = computed(() => PowerBars.of(this.readings()));
}

import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { SessionReading } from '../../core/api/models/session';
import { ZonedTimePipe } from '../../shared/zoned-time.pipe';
import { EnergyChartPath } from './energy-chart-path';

/** Energy delivered over the session, as a line. Drawn as inline SVG, so no chart library. */
@Component({
  selector: 'ww-energy-chart',
  imports: [DecimalPipe, ZonedTimePipe],
  template: `
    @if (path()) {
      <svg
        [attr.viewBox]="'0 0 ' + box.width + ' ' + box.height"
        class="chart"
        role="img"
        aria-label="Energy delivered over time"
      >
        <line
          [attr.x1]="box.padding"
          [attr.y1]="box.height - box.padding"
          [attr.x2]="box.width - box.padding"
          [attr.y2]="box.height - box.padding"
          class="axis"
        />
        <path [attr.d]="area()" class="area" />
        <path [attr.d]="path()" class="line" />
        <text [attr.x]="box.padding" y="14" class="label">
          {{ maxKwh() | number: '1.0-2' }} kWh
        </text>
        <text [attr.x]="box.padding" [attr.y]="box.height - 6" class="label">
          {{ readings()[0].at | zonedTime: timeZone() }}
        </text>
        <text
          [attr.x]="box.width - box.padding"
          [attr.y]="box.height - 6"
          class="label"
          text-anchor="end"
        >
          {{ readings()[readings().length - 1].at | zonedTime: timeZone() }}
        </text>
      </svg>
    } @else {
      <p class="hint">Not enough meter readings to draw a chart.</p>
    }
  `,
  styles: `
    .chart {
      display: block;
      width: 100%;
    }
    .axis {
      stroke: var(--mat-sys-outline-variant);
    }
    .area {
      fill: color-mix(in srgb, var(--mat-sys-primary) 10%, transparent);
    }
    .line {
      fill: none;
      stroke: var(--mat-sys-primary);
      stroke-width: 2;
    }
    .label {
      font-size: 11px;
      fill: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class EnergyChartComponent {
  readonly readings = input.required<SessionReading[]>();
  readonly timeZone = input<string | undefined>(undefined);

  protected readonly box = { width: 640, height: 200, padding: 28 };
  protected readonly path = computed(() => EnergyChartPath.of(this.readings(), this.box));
  protected readonly area = computed(() => {
    const { width, height, padding } = this.box;
    const bottom = height - padding;
    return this.path()
      ? `${this.path()} L${width - padding},${bottom} L${padding},${bottom} Z`
      : '';
  });
  protected readonly maxKwh = computed(() => EnergyChartPath.maxWh(this.readings()) / 1000);
}

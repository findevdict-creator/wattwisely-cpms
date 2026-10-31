import { Component, computed, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { UsageReport } from '../../core/api/models/report';

/** The sites that delivered the most energy in the period, with their share of it. */
@Component({
  selector: 'ww-busiest-sites',
  imports: [MatButtonModule, RouterLink],
  template: `
    <section class="ww-card" aria-labelledby="busiest-title">
      <div class="ww-card-head">
        <div class="titles">
          <h2 id="busiest-title">Busiest sites</h2>
          <p>Share of energy, {{ period() }}</p>
        </div>
        <a mat-button class="ww-small" routerLink="/reports">Reports</a>
      </div>
      <div class="ww-card-body rows">
        @for (row of rows(); track row.name) {
          <div class="row">
            <span class="name">{{ row.name }}</span>
            <span class="track"><i [style.width.%]="row.width"></i></span>
            <b>{{ row.share }}%</b>
          </div>
        } @empty {
          <p class="hint">No energy delivered in this period.</p>
        }
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
    .rows {
      gap: 14px;
    }
    .row {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .name {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .track {
      flex: 0 1 200px;
      height: 6px;
      overflow: hidden;
      border-radius: 3px;
      background: var(--mat-sys-surface-variant);
    }
    .track i {
      display: block;
      height: 100%;
      border-radius: 3px;
      background: var(--mat-sys-primary);
    }
    b {
      width: 40px;
      text-align: right;
      font-weight: 600;
    }
  `,
})
export class BusiestSitesComponent {
  static readonly COUNT = 4;

  readonly report = input.required<UsageReport>();
  /** "last 7 days", for the line under the title. */
  readonly period = input('');

  protected readonly rows = computed(() => {
    const report = this.report();
    const total = report.totals.energy_wh;
    const rows = [...report.rows]
      .filter((row) => row.energy_wh > 0)
      .sort((a, b) => b.energy_wh - a.energy_wh)
      .slice(0, BusiestSitesComponent.COUNT);
    const top = rows[0]?.energy_wh ?? 1;
    return rows.map((row) => ({
      name: row.name,
      share: Math.round((row.energy_wh / total) * 100),
      width: (row.energy_wh / top) * 100,
    }));
  });
}

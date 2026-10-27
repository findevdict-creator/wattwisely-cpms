import { Component, OnInit, inject, input, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { UsageReport } from '../../core/api/models/report';
import { ReportsApiService } from '../../core/api/reports-api.service';
import { UsageFigures } from '../reports/usage-figures';

/** Today at one site so far: sessions, energy and revenue, from the usage report. */
@Component({
  selector: 'ww-site-today',
  template: `
    <section class="ww-card" aria-labelledby="today-title">
      <div class="ww-card-head">
        <div class="titles"><h2 id="today-title">Today</h2></div>
      </div>
      <div class="ww-card-body">
        @if (report(); as report) {
          <div class="figures" data-testid="site-today">
            <div class="ww-two">
              <span>Sessions</span><b>{{ report.totals.sessions.toLocaleString() }}</b>
            </div>
            <div class="ww-two">
              <span>Energy</span><b>{{ energy(report) }}</b>
            </div>
            <div class="ww-two">
              <span>Revenue</span><b>{{ revenue(report) }}</b>
            </div>
          </div>
        } @else {
          <p class="hint">{{ error() || 'Loading…' }}</p>
        }
      </div>
    </section>
  `,
  styles: `
    .figures {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }
    .ww-two > b {
      font-size: 18px;
      line-height: 28px;
      font-weight: 600;
      white-space: nowrap;
    }
    .hint {
      margin: 0;
    }
  `,
})
export class SiteTodayComponent implements OnInit {
  readonly siteId = input.required<string>();
  private readonly reportsApi = inject(ReportsApiService);

  protected readonly report = signal<UsageReport | null>(null);
  protected readonly error = signal('');

  async ngOnInit(): Promise<void> {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const query = {
      from: midnight.toISOString(),
      to: new Date().toISOString(),
      group_by: 'site' as const,
      site_id: this.siteId(),
    };
    try {
      this.report.set(await firstValueFrom(this.reportsApi.usage(query)));
    } catch {
      this.error.set('Today’s figures could not be loaded.');
    }
  }

  protected energy(report: UsageReport): string {
    return UsageFigures.energy(report.totals.energy_wh);
  }

  protected revenue(report: UsageReport): string {
    return UsageFigures.revenue(report.totals.revenue);
  }
}

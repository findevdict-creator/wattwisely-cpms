import { Component, OnInit, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Overview } from '../../core/api/models/report';
import { ReportsApiService } from '../../core/api/reports-api.service';
import { UsageFigures } from '../reports/usage-figures';

/** The home page's numbers (module 11): the chargers now, and the last 24 hours. */
@Component({
  selector: 'ww-home-overview',
  imports: [MatCardModule, RouterLink],
  template: `
    @if (overview(); as overview) {
      <div class="tiles" data-testid="overview">
        <a class="tile" routerLink="/chargers">
          <span class="value" data-testid="tile-online"
            >{{ overview.chargers_online }} / {{ overview.chargers }}</span
          >
          <span class="label">Chargers online</span>
        </a>
        <a class="tile" routerLink="/alerts" [class.alarm]="overview.alerts_open > 0">
          <span class="value" data-testid="tile-alerts">{{ overview.alerts_open }}</span>
          <span class="label">Open alerts</span>
        </a>
        <a class="tile" routerLink="/sessions">
          <span class="value">{{ overview.sessions_active }}</span>
          <span class="label">Charging now</span>
        </a>
        <div class="tile">
          <span class="value">{{ overview.sessions_24h }}</span>
          <span class="label">Sessions, last 24 hours</span>
        </div>
        <div class="tile">
          <span class="value">{{ figures.energy(overview.energy_wh_24h) }}</span>
          <span class="label">Energy, last 24 hours</span>
        </div>
        <div class="tile">
          <span class="value">{{ figures.revenue(overview.revenue_24h) }}</span>
          <span class="label">Revenue, last 24 hours</span>
        </div>
      </div>
    }
  `,
  styles: `
    .tiles {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 12px;
      max-width: 1100px;
      margin-bottom: 24px;
    }
    .tile {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 16px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 12px;
      color: inherit;
      text-decoration: none;
    }
    .value {
      font-size: 24px;
      font-weight: 500;
    }
    .label {
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
    }
    .alarm {
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }
  `,
})
export class HomeOverviewComponent implements OnInit {
  private readonly reportsApi = inject(ReportsApiService);

  protected readonly figures = UsageFigures;
  protected readonly overview = signal<Overview | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      this.overview.set(await firstValueFrom(this.reportsApi.overview()));
    } catch {
      // The tiles are a summary; the pages behind them still work.
    }
  }
}

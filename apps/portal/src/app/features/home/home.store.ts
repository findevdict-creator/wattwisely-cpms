import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AlertsApiService } from '../../core/api/alerts-api.service';
import { Alert } from '../../core/api/models/alert';
import { Overview, UsageQuery, UsageReport } from '../../core/api/models/report';
import { Site } from '../../core/api/models/site';
import { ReportsApiService } from '../../core/api/reports-api.service';
import { SitesApiService } from '../../core/api/sites-api.service';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { FileDownload } from '../../shared/file-download';
import { ReportRange } from '../reports/report-range';
import { HomePeriod, PeriodKey, Range } from './home-period';

/** The energy of one day on the home page's chart. */
export interface DayEnergy {
  from: string;
  energyWh: number;
}

/**
 * What the home page shows: the usage report for the chosen period and the one before, the
 * live counts, the sites and the open alerts. Each part loads only for people who may see it,
 * and a part that fails stays empty while the rest still show.
 */
@Injectable()
export class HomeStore {
  static readonly OPEN_ALERTS = 4;
  static readonly CHART_DAYS = 7;

  private readonly reportsApi = inject(ReportsApiService);
  private readonly sitesApi = inject(SitesApiService);
  private readonly alertsApi = inject(AlertsApiService);
  private readonly permissions = inject(PermissionsService);

  readonly period = signal<PeriodKey>('7d');
  readonly siteId = signal('');
  readonly current = signal<UsageReport | null>(null);
  readonly previous = signal<UsageReport | null>(null);
  readonly overview = signal<Overview | null>(null);
  readonly sites = signal<Site[]>([]);
  readonly openAlerts = signal<Alert[]>([]);
  readonly days = signal<DayEnergy[]>([]);

  async load(): Promise<void> {
    await Promise.all([this.refreshLive(), this.loadUsage(), this.loadDays()]);
  }

  /** The parts that change by the minute: counts, sites and alerts. */
  async refreshLive(): Promise<void> {
    await Promise.all([
      this.fetch('reports:read', this.overview, () => firstValueFrom(this.reportsApi.overview())),
      this.fetch(
        'sites:read',
        this.sites,
        async () => (await firstValueFrom(this.sitesApi.list())).items,
      ),
      this.fetch('alerts:read', this.openAlerts, async () =>
        (await firstValueFrom(this.alertsApi.list('open'))).items.slice(0, HomeStore.OPEN_ALERTS),
      ),
    ]);
  }

  async choosePeriod(key: PeriodKey): Promise<void> {
    this.period.set(key);
    await this.loadUsage();
  }

  async chooseSite(siteId: string): Promise<void> {
    this.siteId.set(siteId);
    await Promise.all([this.loadUsage(), this.loadDays()]);
  }

  /** The usage report for the period as CSV, as on the Reports page. */
  async download(): Promise<void> {
    const query = this.query(HomePeriod.ranges(this.period()).current);
    FileDownload.save(
      await firstValueFrom(this.reportsApi.usageCsv(query)),
      ReportRange.fileName('usage', query),
    );
  }

  private async loadUsage(): Promise<void> {
    const ranges = HomePeriod.ranges(this.period());
    await Promise.all([
      this.fetch('reports:read', this.current, () =>
        firstValueFrom(this.reportsApi.usage(this.query(ranges.current))),
      ),
      this.fetch('reports:read', this.previous, () =>
        firstValueFrom(this.reportsApi.usage(this.query(ranges.previous))),
      ),
    ]);
  }

  /** One usage report per day: the API has no daily series, and a week is seven small asks. */
  private async loadDays(): Promise<void> {
    await this.fetch('reports:read', this.days, () =>
      Promise.all(
        HomePeriod.lastDays(HomeStore.CHART_DAYS).map(async (range) => ({
          from: range.from,
          energyWh: (await firstValueFrom(this.reportsApi.usage(this.query(range)))).totals
            .energy_wh,
        })),
      ),
    );
  }

  private query(range: Range): UsageQuery {
    return { ...range, group_by: 'site', site_id: this.siteId() || undefined };
  }

  /** Sets `target` from the API when the user holds `permission`; keeps it as it was on failure. */
  private async fetch<T>(
    permission: string,
    target: { set(value: T): void },
    ask: () => Promise<T>,
  ): Promise<void> {
    if (!this.permissions.can(permission)) {
      return;
    }
    try {
      target.set(await ask());
    } catch {
      // This part of the page stays as it was; the pages behind it still work.
    }
  }
}

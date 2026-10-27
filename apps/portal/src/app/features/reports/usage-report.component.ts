import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { KpiCardComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { UsageQuery, UsageReport } from '../../core/api/models/report';
import { Site } from '../../core/api/models/site';
import { ReportsApiService } from '../../core/api/reports-api.service';
import { SitesApiService } from '../../core/api/sites-api.service';
import { FileDownload } from '../../shared/file-download';
import { ReportRange, ReportRangeKey } from './report-range';
import { UsageFigures } from './usage-figures';

/** The usage report (story RPT-01): sessions, energy, revenue, utilisation and uptime per site or charger. */
@Component({
  selector: 'ww-usage-report',
  imports: [
    DecimalPipe,
    KpiCardComponent,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatTableModule,
  ],
  templateUrl: './usage-report.component.html',
  styleUrl: './usage-report.component.scss',
})
export class UsageReportComponent implements OnInit {
  private readonly reportsApi = inject(ReportsApiService);
  private readonly sitesApi = inject(SitesApiService);

  protected readonly figures = UsageFigures;
  protected readonly rangeKeys = ReportRange.KEYS;
  protected readonly rangeLabels = ReportRange.LABELS;
  protected readonly columns = [
    'name',
    'sessions',
    'energy',
    'revenue',
    'utilisation',
    'uptime',
    'offline',
  ];
  protected readonly rangeKey = signal<ReportRangeKey>('last_30_days');
  protected readonly groupBy = signal<UsageQuery['group_by']>('site');
  protected readonly siteId = signal<string | undefined>(undefined);
  protected readonly sites = signal<Site[]>([]);
  protected readonly report = signal<UsageReport | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly error = signal('');

  async ngOnInit(): Promise<void> {
    void firstValueFrom(this.sitesApi.list())
      .then((page) => this.sites.set(page.items))
      .catch(() => this.sites.set([]));
    await this.load();
  }

  protected async change(changes: {
    range?: ReportRangeKey;
    groupBy?: UsageQuery['group_by'];
    siteId?: string;
  }): Promise<void> {
    this.rangeKey.set(changes.range ?? this.rangeKey());
    this.groupBy.set(changes.groupBy ?? this.groupBy());
    this.siteId.set('siteId' in changes ? changes.siteId || undefined : this.siteId());
    await this.load();
  }

  protected async download(): Promise<void> {
    try {
      const query = this.query();
      FileDownload.save(
        await firstValueFrom(this.reportsApi.usageCsv(query)),
        ReportRange.fileName('usage', query),
      );
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  private async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      this.report.set(await firstValueFrom(this.reportsApi.usage(this.query())));
      this.error.set('');
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isLoading.set(false);
    }
  }

  private query(): UsageQuery {
    return {
      ...ReportRange.of(this.rangeKey(), new Date()),
      group_by: this.groupBy(),
      site_id: this.siteId(),
    };
  }
}

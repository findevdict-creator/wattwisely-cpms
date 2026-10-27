import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EmptyStateComponent, PageHeaderComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { Session, SessionFilter } from '../../core/api/models/session';
import { Site } from '../../core/api/models/site';
import { SitesApiService } from '../../core/api/sites-api.service';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { DurationLabel } from '../../shared/duration-label';
import { MoneyPipe } from '../../shared/money.pipe';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { StatusLabels } from '../../shared/status-labels';
import { HomePeriod, PeriodKey } from '../home/home-period';
import { SessionsStore } from './sessions.store';

/** Sessions: every charge at the sites one may see, newest first, with filters and a CSV export. */
@Component({
  selector: 'ww-sessions',
  imports: [
    DatePipe,
    DecimalPipe,
    EmptyStateComponent,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTableModule,
    MatTooltipModule,
    MoneyPipe,
    PageHeaderComponent,
    RouterLink,
    StatusChipComponent,
  ],
  providers: [SessionsStore],
  templateUrl: './sessions.component.html',
  styleUrl: './sessions.component.scss',
})
export class SessionsComponent implements OnInit {
  static readonly STATUS_FILTERS = [
    { value: 'authorising,starting', label: 'Waiting for the card or the charger' },
    { value: 'charging,suspended,idle', label: 'Running' },
    { value: 'stopping', label: 'Waiting to price' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed,not_started', label: 'Failed or not started' },
  ];

  protected readonly store = inject(SessionsStore);
  protected readonly permissions = inject(PermissionsService);
  private readonly sitesApi = inject(SitesApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly columns = [
    'started_at',
    'where',
    'driver',
    'energy',
    'duration',
    'amount',
    'payment',
    'status',
    'flags',
  ];
  protected readonly summary = 'Every charge at the sites you can see, newest first';
  protected readonly periods: { key: PeriodKey; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: '7d', label: 'Last 7 days' },
    { key: '30d', label: 'Last 30 days' },
  ];
  /** Set when the charger or the driver page sent us here for its own sessions. */
  protected readonly scope = signal<SessionFilter>({
    charger_id: this.route.snapshot.queryParamMap.get('charger_id') ?? undefined,
    driver_id: this.route.snapshot.queryParamMap.get('driver_id') ?? undefined,
  });
  protected readonly scopeLabel = computed(() => {
    if (this.scope().charger_id) {
      return 'One charger only';
    }
    return this.scope().driver_id ? 'One driver only' : '';
  });
  protected readonly statusFilters = SessionsComponent.STATUS_FILTERS;
  protected readonly sites = signal<Site[]>([]);
  protected readonly flagLabel = StatusLabels.reviewFlag;

  ngOnInit(): void {
    void this.store.load({ ...this.scope() });
    if (this.permissions.can('sites:read')) {
      void firstValueFrom(this.sitesApi.list()).then((page) => this.sites.set(page.items));
    }
  }

  protected filterBy(field: keyof SessionFilter, value: string | boolean): void {
    const filter: SessionFilter = { ...this.store.filter() };
    if (field === 'needs_review') {
      filter.needs_review = value === true ? 'true' : undefined;
    } else {
      filter[field] = (value as string) || undefined;
    }
    void this.store.load(filter);
  }

  protected choosePeriod(key: PeriodKey | ''): void {
    const range = key ? HomePeriod.ranges(key).current : { from: undefined, to: undefined };
    void this.store.load({ ...this.store.filter(), ...range });
  }

  /** Drops the charger or driver another page asked for, keeping the other filters. */
  protected showAll(): void {
    this.scope.set({});
    void this.router.navigate([], { queryParams: {} });
    void this.store.load({ ...this.store.filter(), charger_id: undefined, driver_id: undefined });
  }

  protected durationOf(session: Session): string {
    return DurationLabel.between(session.started_at, session.ended_at);
  }

  protected flagsOf(flags: string[]): string {
    return flags.map((flag) => StatusLabels.reviewFlag(flag)).join(', ');
  }
}

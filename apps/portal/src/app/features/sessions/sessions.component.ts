import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SessionFilter } from '../../core/api/models/session';
import { Site } from '../../core/api/models/site';
import { SitesApiService } from '../../core/api/sites-api.service';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { MoneyPipe } from '../../shared/money.pipe';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { StatusLabels } from '../../shared/status-labels';
import { SessionsStore } from './sessions.store';

/** Sessions: every charge at the sites one may see, newest first, with filters and a CSV export. */
@Component({
  selector: 'ww-sessions',
  imports: [
    DatePipe,
    DecimalPipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTableModule,
    MatTooltipModule,
    MoneyPipe,
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

  protected readonly columns = [
    'started_at',
    'where',
    'status',
    'energy',
    'amount',
    'payment',
    'flags',
  ];
  protected readonly statusFilters = SessionsComponent.STATUS_FILTERS;
  protected readonly sites = signal<Site[]>([]);
  protected readonly flagLabel = StatusLabels.reviewFlag;

  ngOnInit(): void {
    void this.store.load();
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

  protected flagsOf(flags: string[]): string {
    return flags.map((flag) => StatusLabels.reviewFlag(flag)).join(', ');
  }
}

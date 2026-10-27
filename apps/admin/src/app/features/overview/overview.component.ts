import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { KpiCardComponent, PageHeaderComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { Overview } from '../../core/api/models/overview';
import { OverviewApiService } from '../../core/api/overview-api.service';
import { StaffContextService } from '../../core/staff/staff-context.service';
import { StatusChipComponent } from '../../shared/status-chip.component';

/** The first page: how many tenants, connectors and staff the platform has, and plan uptake. */
@Component({
  selector: 'ww-overview',
  imports: [
    KpiCardComponent,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    PageHeaderComponent,
    RouterLink,
    StatusChipComponent,
  ],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss',
})
export class OverviewComponent implements OnInit {
  static readonly STATES = ['active', 'trial', 'suspended', 'cancelled'] as const;

  protected readonly staff = inject(StaffContextService);
  private readonly overviewApi = inject(OverviewApiService);

  protected readonly overview = signal<Overview | null>(null);
  protected readonly error = signal('');
  protected readonly planColumns = ['plan', 'tenants'];
  /** Each state with its count and its share of all tenants, for the bars. */
  protected readonly states = computed(() => {
    const tenants = this.overview()?.tenants;
    if (!tenants) {
      return [];
    }
    return OverviewComponent.STATES.map((status) => ({
      status,
      count: tenants[status],
      share: tenants.total ? (tenants[status] / tenants.total) * 100 : 0,
    }));
  });

  async ngOnInit(): Promise<void> {
    try {
      this.overview.set(await firstValueFrom(this.overviewApi.getOverview()));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  protected count(value: number): string {
    return value.toLocaleString('en-GB');
  }
}

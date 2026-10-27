import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { KpiCardComponent, PageHeaderComponent } from '@wattwisely/ui';
import { ApiProblem } from '../../core/api/api-problem';
import { TenantApiService } from '../../core/api/tenant-api.service';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AlertBadgeService } from '../../layout/alert-badge.service';
import { BusiestSitesComponent } from './busiest-sites.component';
import { EnergyChartComponent } from './energy-chart.component';
import { FleetCardComponent } from './fleet-card.component';
import { HomeFigures } from './home-figures';
import { HomePeriod } from './home-period';
import { HomeStore } from './home.store';
import { OpenAlertsCardComponent } from './open-alerts-card.component';

/**
 * The first page after login: the period's figures against the one before, the fleet on a
 * map, the open alerts, energy per day and the busiest sites. Each part shows only to people
 * who may open the page behind it.
 */
@Component({
  selector: 'ww-home',
  imports: [
    BusiestSitesComponent,
    EnergyChartComponent,
    FleetCardComponent,
    KpiCardComponent,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    OpenAlertsCardComponent,
    PageHeaderComponent,
  ],
  providers: [HomeStore],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  static readonly REFRESH_MS = 60_000;

  protected readonly store = inject(HomeStore);
  protected readonly tenantContext = inject(TenantContextService);
  protected readonly permissions = inject(PermissionsService);
  protected readonly alertBadge = inject(AlertBadgeService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly tenantFromApi = toSignal(inject(TenantApiService).getCurrent());

  protected readonly periods = HomePeriod.OPTIONS;
  protected readonly error = signal('');
  protected readonly greeting = computed(() => {
    const firstName = this.tenantContext.me()?.name.split(' ')[0];
    return firstName ? `${HomePeriod.greeting()}, ${firstName}` : HomePeriod.greeting();
  });
  protected readonly figures = computed(
    () => new HomeFigures(this.store.current(), this.store.previous(), this.store.period()),
  );
  protected readonly online = computed(() => HomeFigures.online(this.store.overview()));
  protected readonly offline = computed(() => HomeFigures.offline(this.store.overview()));

  async ngOnInit(): Promise<void> {
    const timer = setInterval(() => void this.store.refreshLive(), HomeComponent.REFRESH_MS);
    this.destroyRef.onDestroy(() => clearInterval(timer));
    await this.store.load();
  }

  protected async download(): Promise<void> {
    this.error.set('');
    try {
      await this.store.download();
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }
}

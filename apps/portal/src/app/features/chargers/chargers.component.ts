import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent, PageHeaderComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { ChargersApiService } from '../../core/api/chargers-api.service';
import { Charger, ChargerFilter } from '../../core/api/models/charger';
import { Site } from '../../core/api/models/site';
import { SitesApiService } from '../../core/api/sites-api.service';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { DurationLabel } from '../../shared/duration-label';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { ChargerTabs, ChargerTabKey } from './charger-tabs';
import { RegisterChargerDialogComponent } from './register-charger-dialog.component';

/** Chargers: every registered charge point, by status tab, site and search (story AST-02). */
@Component({
  selector: 'ww-chargers',
  imports: [
    EmptyStateComponent,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatTableModule,
    PageHeaderComponent,
    RouterLink,
    StatusChipComponent,
  ],
  templateUrl: './chargers.component.html',
  styleUrl: './chargers.component.scss',
})
export class ChargersComponent implements OnInit {
  protected readonly permissions = inject(PermissionsService);
  private readonly chargersApi = inject(ChargersApiService);
  private readonly sitesApi = inject(SitesApiService);
  private readonly dialog = inject(MatDialog);

  protected readonly columns = [
    'identity',
    'site',
    'status',
    'free',
    'last_seen',
    'ocpp',
    'security',
  ];
  protected readonly tabs = ChargerTabs.TABS;
  protected readonly tabKey = signal<ChargerTabKey>('all');
  protected readonly chargers = signal<Charger[]>([]);
  protected readonly sites = signal<Site[]>([]);
  protected readonly nextCursor = signal<string | null>(null);
  protected readonly filter = signal<ChargerFilter>({});
  protected readonly error = signal('');
  protected readonly isLoading = signal(true);
  protected readonly summary = computed(() =>
    ChargerTabs.summary(this.chargers(), this.nextCursor() !== null),
  );

  ngOnInit(): void {
    void this.loadSites();
    void this.load();
  }

  protected search(q: string): void {
    void this.load({ ...this.filter(), q: q.trim() });
  }

  protected filterBySite(siteId: string): void {
    void this.load({ ...this.filter(), site_id: siteId || undefined });
  }

  protected showTab(key: ChargerTabKey): void {
    this.tabKey.set(key);
    void this.load({ ...this.filter(), status: ChargerTabs.statusesOf(key) });
  }

  protected async loadMore(): Promise<void> {
    const page = await firstValueFrom(this.chargersApi.list(this.filter(), this.nextCursor()));
    this.chargers.update((chargers) => [...chargers, ...page.items]);
    this.nextCursor.set(page.next_cursor);
  }

  protected async register(): Promise<void> {
    const dialog = this.dialog.open(RegisterChargerDialogComponent, { data: {}, width: '640px' });
    if (await firstValueFrom(dialog.afterClosed())) {
      await this.load();
    }
  }

  /** "Alpitronic HYC300 · 3 connectors". */
  protected modelOf(charger: Charger): string {
    const model =
      [charger.vendor, charger.model].filter(Boolean).join(' ') || 'Model not known yet';
    const count = charger.connectors.length;
    return `${model} · ${count} ${count === 1 ? 'connector' : 'connectors'}`;
  }

  protected freeOf(charger: Charger): string {
    const free = charger.connectors.filter((connector) => connector.status === 'available');
    return charger.is_online ? `${free.length} of ${charger.connectors.length}` : '–';
  }

  protected lastSeenOf(charger: Charger): string {
    return DurationLabel.ago(charger.last_seen_at);
  }

  private async load(filter: ChargerFilter = this.filter()): Promise<void> {
    this.filter.set(filter);
    this.isLoading.set(true);
    try {
      const page = await firstValueFrom(this.chargersApi.list(filter));
      this.chargers.set(page.items);
      this.nextCursor.set(page.next_cursor);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadSites(): Promise<void> {
    if (this.permissions.can('sites:read')) {
      this.sites.set((await firstValueFrom(this.sitesApi.list())).items);
    }
  }
}

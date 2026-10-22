import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { ChargersApiService } from '../../core/api/chargers-api.service';
import { Charger, ChargerFilter, ChargerStatus } from '../../core/api/models/charger';
import { Site } from '../../core/api/models/site';
import { SitesApiService } from '../../core/api/sites-api.service';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { StatusLabels } from '../../shared/status-labels';
import { RegisterChargerDialogComponent } from './register-charger-dialog.component';

/** Chargers: every registered charge point, filtered by site, status and search (story AST-02). */
@Component({
  selector: 'ww-chargers',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
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

  protected readonly columns = ['identity', 'site', 'model', 'status', 'connectors', 'security'];
  protected readonly statuses = Object.entries(StatusLabels.CHARGER);
  protected readonly chargers = signal<Charger[]>([]);
  protected readonly sites = signal<Site[]>([]);
  protected readonly nextCursor = signal<string | null>(null);
  protected readonly filter = signal<ChargerFilter>({});
  protected readonly error = signal('');
  protected readonly isLoading = signal(true);

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

  protected filterByStatus(statuses: ChargerStatus[]): void {
    void this.load({ ...this.filter(), status: statuses });
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

  protected securityOf(charger: Charger): string {
    const mode = charger.auth_mode === 'password' ? 'Password' : 'No password';
    return charger.allow_plain_ws ? `${mode}, plain ws allowed` : mode;
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

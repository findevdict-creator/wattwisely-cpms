import { Component, OnInit, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { ChargersApiService } from '../../core/api/chargers-api.service';
import { Charger } from '../../core/api/models/charger';
import { Site } from '../../core/api/models/site';
import { SitesApiService } from '../../core/api/sites-api.service';
import { Tariff } from '../../core/api/models/tariff';
import { TariffsApiService } from '../../core/api/tariffs-api.service';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { RegisterChargerDialogComponent } from '../chargers/register-charger-dialog.component';
import { OpeningHoursText } from './opening-hours-text';
import { SiteDialogComponent } from './site-dialog.component';

/** One site: its details and the chargers on it (story AST-01). */
@Component({
  selector: 'ww-site',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    MatTableModule,
    RouterLink,
    StatusChipComponent,
  ],
  templateUrl: './site.component.html',
  styleUrl: './site.component.scss',
})
export class SiteComponent implements OnInit {
  readonly id = input.required<string>();
  protected readonly permissions = inject(PermissionsService);
  private readonly sitesApi = inject(SitesApiService);
  private readonly chargersApi = inject(ChargersApiService);
  private readonly tariffsApi = inject(TariffsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  protected readonly site = signal<Site | null>(null);
  protected readonly chargers = signal<Charger[]>([]);
  protected readonly tariff = signal<Tariff | null>(null);
  protected readonly error = signal('');
  protected readonly columns = ['identity', 'model', 'status', 'connectors'];
  protected readonly describeHours = OpeningHoursText.describe;

  ngOnInit(): void {
    void this.load();
  }

  protected async edit(): Promise<void> {
    const dialog = this.dialog.open(SiteDialogComponent, { data: this.site(), width: '640px' });
    if (await firstValueFrom(dialog.afterClosed())) {
      this.snackBar.open('Site saved.', 'OK', { duration: 6000 });
      await this.load();
    }
  }

  protected async registerCharger(): Promise<void> {
    const data = { siteId: this.id() };
    const dialog = this.dialog.open(RegisterChargerDialogComponent, { data, width: '640px' });
    if (await firstValueFrom(dialog.afterClosed())) {
      await this.load();
    }
  }

  protected async remove(): Promise<void> {
    const site = this.site() as Site;
    const dialog = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: `Remove ${site.name}?`,
        message: 'Past sessions keep the site name. A site with chargers cannot be removed.',
        confirmLabel: 'Remove site',
      },
    });
    if ((await firstValueFrom(dialog.afterClosed())) !== true) {
      return;
    }
    try {
      await firstValueFrom(this.sitesApi.remove(site), { defaultValue: undefined });
      this.snackBar.open(`${site.name} removed.`, 'OK', { duration: 6000 });
      await this.router.navigate(['/sites']);
    } catch (error) {
      this.snackBar.open(ApiProblem.from(error).detail, 'OK', { duration: 6000 });
    }
  }

  /** The site's tariff, for its name; shown only to people who may read tariffs. */
  private async loadTariff(site: Site): Promise<void> {
    const canRead = this.permissions.can('tariffs:read');
    this.tariff.set(
      site.tariff_id && canRead ? await firstValueFrom(this.tariffsApi.get(site.tariff_id)) : null,
    );
  }

  private async load(): Promise<void> {
    try {
      const [site, chargers] = await Promise.all([
        firstValueFrom(this.sitesApi.get(this.id())),
        firstValueFrom(this.chargersApi.list({ site_id: this.id() })),
      ]);
      this.site.set(site);
      this.chargers.set(chargers.items);
      await this.loadTariff(site);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }
}

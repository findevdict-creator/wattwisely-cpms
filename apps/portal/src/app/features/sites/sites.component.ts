import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent, PageHeaderComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { Site } from '../../core/api/models/site';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { SiteMapComponent } from '../../shared/site-map/site-map.component';
import { SiteMapLayout } from '../../shared/site-map/site-map-layout';
import { SiteDialogComponent } from './site-dialog.component';
import { SitesStore } from './sites.store';

/**
 * Sites: every charging location on a map or in a list, how it is doing, and the way to add
 * one (story AST-01).
 */
@Component({
  selector: 'ww-sites',
  imports: [
    EmptyStateComponent,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatTableModule,
    PageHeaderComponent,
    RouterLink,
    SiteMapComponent,
  ],
  providers: [SitesStore],
  templateUrl: './sites.component.html',
  styleUrl: './sites.component.scss',
})
export class SitesComponent implements OnInit {
  protected readonly store = inject(SitesStore);
  protected readonly permissions = inject(PermissionsService);
  private readonly dialog = inject(MatDialog);
  protected readonly columns = ['name', 'status', 'chargers', 'connectors', 'visibility'];
  protected readonly view = signal<'map' | 'list'>('map');
  protected readonly summary = computed(() => SitesComponent.summarise(this.store.sites()));

  ngOnInit(): void {
    void this.store.load();
  }

  protected search(q: string): void {
    void this.store.load({ ...this.store.filter(), q: q.trim() });
  }

  protected filterBy(field: 'visibility' | 'status', value: string): void {
    void this.store.load({ ...this.store.filter(), [field]: value });
  }

  protected async add(): Promise<void> {
    const dialog = this.dialog.open(SiteDialogComponent, { data: null, width: '640px' });
    const site: Site | undefined = await firstValueFrom(dialog.afterClosed());
    if (site) {
      this.store.tell(`${site.name} added.`);
      await this.store.load();
    }
  }

  protected addressOf(site: Site): string {
    return `${site.address.line1}, ${site.address.city}`;
  }

  protected chipOf(site: Site): { tone: string; label: string } {
    return SiteMapLayout.CHIPS[SiteMapLayout.toneOf(site)];
  }

  /** How many of the site's connectors are free, in percent, for its bar. */
  protected freeShare(site: Site): number {
    return site.connector_count > 0
      ? (100 * site.available_connector_count) / site.connector_count
      : 0;
  }

  /** "9 sites · 182 chargers · 41 connectors free now". */
  private static summarise(sites: Site[]): string {
    const sum = (count: (site: Site) => number) => sites.reduce((n, site) => n + count(site), 0);
    const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
    return [
      plural(sites.length, 'site'),
      plural(
        sum((site) => site.charger_count),
        'charger',
      ),
      `${plural(
        sum((site) => site.available_connector_count),
        'connector',
      )} free now`,
    ].join(' · ');
  }
}

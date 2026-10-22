import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Site } from '../../core/api/models/site';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { SiteDialogComponent } from './site-dialog.component';
import { SitesStore } from './sites.store';

/** Sites: every charging location, how it is doing, and the way to add one (story AST-01). */
@Component({
  selector: 'ww-sites',
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
  providers: [SitesStore],
  templateUrl: './sites.component.html',
  styleUrl: './sites.component.scss',
})
export class SitesComponent implements OnInit {
  protected readonly store = inject(SitesStore);
  protected readonly permissions = inject(PermissionsService);
  private readonly dialog = inject(MatDialog);
  protected readonly columns = [
    'name',
    'address',
    'status',
    'chargers',
    'connectors',
    'visibility',
  ];

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
}

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent, PageHeaderComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { AccessGroupsApiService } from '../../core/api/access-groups-api.service';
import { AccessGroup, Driver } from '../../core/api/models/driver';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { DurationLabel } from '../../shared/duration-label';
import { PaymentModeLabels } from '../../shared/payment-mode-labels';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { DriverDialogComponent } from './driver-dialog.component';
import { DriversStore } from './drivers.store';

/** Drivers: everyone who may charge with an RFID card, with their cards and groups (story DRV-01). */
@Component({
  selector: 'ww-drivers',
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
  providers: [DriversStore],
  templateUrl: './drivers.component.html',
  styleUrl: './drivers.component.scss',
})
export class DriversComponent implements OnInit {
  static readonly TABS = [
    { value: '', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'blocked', label: 'Blocked' },
  ];

  protected readonly store = inject(DriversStore);
  protected readonly permissions = inject(PermissionsService);
  private readonly groupsApi = inject(AccessGroupsApiService);
  private readonly dialog = inject(MatDialog);

  protected readonly tabs = DriversComponent.TABS;
  protected readonly groups = signal<AccessGroup[]>([]);
  protected readonly columns = [
    'name',
    'reference',
    'groups',
    'cards',
    'paying',
    'last_session',
    'status',
  ];
  protected readonly hasHiddenDetails = computed(() =>
    this.store.drivers().some((driver) => driver.is_personal_data_hidden),
  );

  ngOnInit(): void {
    void this.store.load();
    firstValueFrom(this.groupsApi.list())
      .then((list) => this.groups.set(list.items))
      .catch(() => this.groups.set([]));
  }

  protected search(q: string): void {
    void this.store.load({ ...this.store.filter(), q: q.trim() });
  }

  protected filterBy(field: 'status' | 'group_id', value: string): void {
    void this.store.load({ ...this.store.filter(), [field]: value });
  }

  protected async add(): Promise<void> {
    const dialog = this.dialog.open(DriverDialogComponent, { data: null, width: '640px' });
    const driver: Driver | undefined = await firstValueFrom(dialog.afterClosed());
    if (driver) {
      this.store.tell(`${driver.name} added.`);
      await this.store.load();
    }
  }

  /** The line under the name: the e-mail, or why there is none. */
  protected contactOf(driver: Driver): string {
    if (driver.is_personal_data_hidden) {
      return 'Details hidden';
    }
    return driver.email ?? 'No e-mail';
  }

  protected payingOf(driver: Driver): string {
    return PaymentModeLabels.short(driver.payment_mode);
  }

  protected lastChargeOf(driver: Driver): string {
    return DurationLabel.ago(driver.last_session_at);
  }
}

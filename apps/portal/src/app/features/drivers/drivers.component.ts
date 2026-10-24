import { DatePipe } from '@angular/common';
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
import { AccessGroupsApiService } from '../../core/api/access-groups-api.service';
import { AccessGroup, Driver } from '../../core/api/models/driver';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { DriverDialogComponent } from './driver-dialog.component';
import { DriversStore } from './drivers.store';

/** Drivers: everyone who may charge with an RFID card, with their cards and groups (story DRV-01). */
@Component({
  selector: 'ww-drivers',
  imports: [
    DatePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    RouterLink,
    StatusChipComponent,
  ],
  providers: [DriversStore],
  templateUrl: './drivers.component.html',
  styleUrl: './drivers.component.scss',
})
export class DriversComponent implements OnInit {
  protected readonly store = inject(DriversStore);
  protected readonly permissions = inject(PermissionsService);
  private readonly groupsApi = inject(AccessGroupsApiService);
  private readonly dialog = inject(MatDialog);

  protected readonly groups = signal<AccessGroup[]>([]);
  protected readonly columns = ['name', 'reference', 'cards', 'groups', 'last_session', 'status'];

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

  protected groupNames(driver: Driver): string {
    return driver.groups.map((group) => group.name).join(', ');
  }
}

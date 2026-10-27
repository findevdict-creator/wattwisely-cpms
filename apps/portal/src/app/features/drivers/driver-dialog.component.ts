import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { AccessGroupsApiService } from '../../core/api/access-groups-api.service';
import { ApiProblem } from '../../core/api/api-problem';
import { DriversApiService } from '../../core/api/drivers-api.service';
import { AccessGroup, Driver, DriverDetail } from '../../core/api/models/driver';
import { DriverForm } from './driver-form';

/** Add a driver, or change one (story DRV-01). Closes with the saved driver. */
@Component({
  selector: 'ww-driver-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './driver-dialog.component.html',
  styles: `
    .fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 16px;
    }
    .wide {
      grid-column: 1 / -1;
    }
    .hint {
      color: var(--mat-sys-on-surface-variant);
      margin-top: 0;
    }
  `,
})
export class DriverDialogComponent implements OnInit {
  protected readonly driver = inject<Driver | null>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<DriverDialogComponent, DriverDetail>>(MatDialogRef);
  private readonly driversApi = inject(DriversApiService);
  private readonly groupsApi = inject(AccessGroupsApiService);

  protected readonly form = this.driver ? DriverForm.from(this.driver) : new DriverForm();
  protected readonly groups = signal<AccessGroup[]>([]);
  protected readonly error = signal('');
  protected readonly isSaving = signal(false);

  ngOnInit(): void {
    firstValueFrom(this.groupsApi.list())
      .then((list) => this.groups.set(list.items))
      .catch(() => this.groups.set([]));
  }

  protected async save(): Promise<void> {
    this.form.fields.markAllAsTouched();
    if (!this.form.isValid()) {
      this.error.set('Check the fields marked in red.');
      return;
    }
    this.isSaving.set(true);
    try {
      const input = this.form.toInput();
      const request = this.driver
        ? this.driversApi.update(this.driver, input)
        : this.driversApi.create(input);
      this.dialogRef.close(await firstValueFrom(request));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isSaving.set(false);
    }
  }
}

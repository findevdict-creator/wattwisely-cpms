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
import { AccessGroup, DriverPage, NamedRow } from '../../core/api/models/driver';
import { PaymentsApiService } from '../../core/api/payments-api.service';
import { SitesApiService } from '../../core/api/sites-api.service';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { AccessGroupForm } from './access-group-form';

/**
 * Add an access group, or change one (story AST-04), with what its members pay (module 19).
 * Closes with the saved group. The hold is typed in the currency of the payment account.
 */
@Component({
  selector: 'ww-access-group-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './access-group-dialog.component.html',
  styles: `
    .wide {
      width: 100%;
      margin-top: 8px;
    }
    .hint {
      color: var(--mat-sys-on-surface-variant);
      margin-top: 0;
    }
  `,
})
export class AccessGroupDialogComponent implements OnInit {
  /** How many drivers the picker shows at most: pages of the drivers list, oldest page first. */
  static readonly MAX_DRIVER_PAGES = 10;
  /** Until the payment account names one, or when the person may not read it. */
  static readonly FALLBACK_CURRENCY = 'GBP';

  protected readonly group = inject<AccessGroup | null>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<AccessGroupDialogComponent, AccessGroup>>(MatDialogRef);
  private readonly groupsApi = inject(AccessGroupsApiService);
  private readonly sitesApi = inject(SitesApiService);
  private readonly driversApi = inject(DriversApiService);
  private readonly paymentsApi = inject(PaymentsApiService);
  private readonly permissions = inject(PermissionsService);

  protected form = new AccessGroupForm(AccessGroupDialogComponent.FALLBACK_CURRENCY);
  protected readonly sites = signal<NamedRow[]>([]);
  protected readonly drivers = signal<NamedRow[]>([]);
  protected readonly error = signal('');
  protected readonly isSaving = signal(false);

  ngOnInit(): void {
    void this.loadForm();
    void this.loadChoices();
  }

  /** The form in the right currency: the payment account's, when there is one to read. */
  private async loadForm(): Promise<void> {
    let currency = AccessGroupDialogComponent.FALLBACK_CURRENCY;
    if (this.permissions.can('payments:read')) {
      const account = await firstValueFrom(this.paymentsApi.account()).catch(() => null);
      currency = account?.default_currency || currency;
    }
    this.form = this.group
      ? AccessGroupForm.from(this.group, currency)
      : new AccessGroupForm(currency);
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
      const request = this.group
        ? this.groupsApi.update(this.group, input)
        : this.groupsApi.create(input);
      this.dialogRef.close(await firstValueFrom(request));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isSaving.set(false);
    }
  }

  private async loadChoices(): Promise<void> {
    try {
      const sites = await firstValueFrom(this.sitesApi.list());
      this.sites.set(sites.items.map((site) => ({ id: site.id, name: site.name })));
      this.drivers.set(await this.loadDrivers());
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  /** Active drivers, plus the members already in the group even when blocked. */
  private async loadDrivers(): Promise<NamedRow[]> {
    const rows = new Map<string, NamedRow>(
      (this.group?.members ?? []).map((member) => [member.id, member]),
    );
    let cursor: string | null = null;
    for (let page = 0; page < AccessGroupDialogComponent.MAX_DRIVER_PAGES; page += 1) {
      const result: DriverPage = await firstValueFrom(this.driversApi.list({}, cursor));
      result.items.forEach((driver) => rows.set(driver.id, { id: driver.id, name: driver.name }));
      cursor = result.next_cursor;
      if (!cursor) {
        break;
      }
    }
    return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
}

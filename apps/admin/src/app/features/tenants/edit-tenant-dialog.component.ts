import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { Tenant } from '../../core/api/models/tenant';
import { TenantsApiService } from '../../core/api/tenants-api.service';

/** Change a tenant's name, country or payment mode. Closes with true when saved. */
@Component({
  selector: 'ww-edit-tenant-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>Edit {{ tenant.name }}</h2>
    <mat-dialog-content>
      <p class="ww-lead">The short name stays as it is: it is in links and invoice numbers.</p>
      <form class="ww-form" [formGroup]="form" (ngSubmit)="save()">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Company name</mat-label>
          <input matInput formControlName="name" data-testid="tenant-name" />
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Country</mat-label>
          <input matInput formControlName="region" placeholder="DE" maxlength="2" />
          <mat-hint>Two letters, such as IE or DE</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Payments</mat-label>
          <mat-select formControlName="payment_mode">
            <mat-option value="direct">Direct, their own Stripe account</mat-option>
            <mat-option value="managed">Managed by Wattwisely</mat-option>
          </mat-select>
        </mat-form-field>
        @if (error()) {
          <div class="notice danger" role="alert">{{ error() }}</div>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button (click)="save()" [disabled]="isSaving()" data-testid="save-tenant">
        Save
      </button>
    </mat-dialog-actions>
  `,
})
export class EditTenantDialogComponent {
  protected readonly tenant = inject<Tenant>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<EditTenantDialogComponent, boolean>>(MatDialogRef);
  private readonly tenantsApi = inject(TenantsApiService);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: [
      this.tenant.name,
      [Validators.required, Validators.minLength(2), Validators.maxLength(80)],
    ],
    region: [this.tenant.region ?? '', Validators.pattern(/^[A-Z]{2}$/)],
    payment_mode: [this.tenant.payment_mode],
  });
  protected readonly error = signal('');
  protected readonly isSaving = signal(false);

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.error.set('Give the company a name of at least two letters.');
      return;
    }
    const value = this.form.getRawValue();
    this.isSaving.set(true);
    try {
      await firstValueFrom(
        this.tenantsApi.update(this.tenant, {
          name: value.name.trim(),
          region: value.region.trim() || null,
          payment_mode: value.payment_mode,
        }),
      );
      this.dialogRef.close(true);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isSaving.set(false);
    }
  }
}

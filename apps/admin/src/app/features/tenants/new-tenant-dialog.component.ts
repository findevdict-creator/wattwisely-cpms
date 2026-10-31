import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { Plan } from '../../core/api/models/plan';
import { CreateTenantRequest, Tenant } from '../../core/api/models/tenant';
import { TenantsApiService } from '../../core/api/tenants-api.service';

/** What the dialog offers to choose from. */
export interface NewTenantDialogData {
  plans: Plan[];
}

/** What the dialog closes with when a tenant was created. */
export interface NewTenantResult {
  tenant: Tenant;
  is_owner_email_sent: boolean | null;
}

/** Create a tenant on a plan and, optionally, invite its first Owner. */
@Component({
  selector: 'ww-new-tenant-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './new-tenant-dialog.component.html',
})
export class NewTenantDialogComponent {
  protected readonly data = inject<NewTenantDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<NewTenantDialogComponent, NewTenantResult>>(MatDialogRef);
  private readonly tenantsApi = inject(TenantsApiService);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    slug: ['', [Validators.pattern(/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/)]],
    region: ['', [Validators.pattern(/^[A-Z]{2}$/)]],
    payment_mode: ['direct' as 'direct' | 'managed'],
    plan_id: ['', Validators.required],
    subscription_status: ['active' as 'active' | 'trialing'],
    trial_ends_at: [''],
    owner_email: ['', Validators.email],
    billing_email: ['', Validators.email],
    billing_name: [''],
  });
  protected readonly error = signal('');
  protected readonly isSaving = signal(false);

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Fill in the name and choose a plan.');
      return;
    }
    this.isSaving.set(true);
    try {
      this.dialogRef.close(await firstValueFrom(this.tenantsApi.create(this.body())));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isSaving.set(false);
    }
  }

  /** Only the fields that were filled in; the API chooses the rest. */
  private body(): CreateTenantRequest {
    const value = this.form.getRawValue();
    const body: CreateTenantRequest = {
      name: value.name.trim(),
      plan_id: value.plan_id,
      payment_mode: value.payment_mode,
      subscription_status: value.subscription_status,
    };
    const optional = ['slug', 'region', 'owner_email', 'billing_email', 'billing_name'] as const;
    for (const key of optional) {
      if (value[key].trim()) {
        body[key] = value[key].trim();
      }
    }
    if (value.subscription_status === 'trialing' && value.trial_ends_at) {
      body.trial_ends_at = value.trial_ends_at;
    }
    return body;
  }
}

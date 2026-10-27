import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { Plan } from '../../core/api/models/plan';
import { SetSubscriptionRequest, Tenant } from '../../core/api/models/tenant';
import { PlansApiService } from '../../core/api/plans-api.service';

type SubscriptionStatus = NonNullable<SetSubscriptionRequest['status']>;

/** Put a tenant on a plan and keep its billing contact. Closes with the request body to send. */
@Component({
  selector: 'ww-subscription-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './subscription-dialog.component.html',
  styles: `
    .content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 16px;
      padding-top: 8px;
    }
    .wide {
      grid-column: 1 / -1;
    }
  `,
})
export class SubscriptionDialogComponent implements OnInit {
  protected readonly tenant = inject<Tenant>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<SubscriptionDialogComponent, SetSubscriptionRequest>>(MatDialogRef);
  private readonly plansApi = inject(PlansApiService);

  protected readonly plans = signal<Plan[]>([]);
  protected readonly error = signal('');
  protected readonly form = inject(FormBuilder).nonNullable.group({
    plan_id: [this.tenant.subscription.plan?.id ?? '', Validators.required],
    status: [(this.tenant.subscription.status ?? 'active') as SubscriptionStatus],
    trial_ends_at: [this.tenant.subscription.trial_ends_at?.slice(0, 10) ?? ''],
    billing_name: [this.tenant.subscription.billing_name ?? '', Validators.maxLength(120)],
    billing_email: [this.tenant.subscription.billing_email ?? '', Validators.email],
    billing_reference: [this.tenant.subscription.billing_reference ?? '', Validators.maxLength(60)],
    tax_rate: [
      this.tenant.subscription.tax_rate_bps / 100,
      [Validators.min(0), Validators.max(100)],
    ],
    notes: [this.tenant.subscription.notes ?? '', Validators.maxLength(2000)],
  });

  async ngOnInit(): Promise<void> {
    try {
      const plans = await firstValueFrom(this.plansApi.listPlans());
      const currentId = this.tenant.subscription.plan?.id;
      this.plans.set(plans.filter((plan) => plan.is_active || plan.id === currentId));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  protected save(): void {
    if (this.form.invalid) {
      this.error.set('Choose a plan and check the billing e-mail and the tax rate.');
      return;
    }
    const value = this.form.getRawValue();
    this.dialogRef.close({
      plan_id: value.plan_id,
      status: value.status,
      trial_ends_at:
        value.status === 'trialing' && value.trial_ends_at ? value.trial_ends_at : null,
      billing_name: value.billing_name.trim() || null,
      billing_email: value.billing_email.trim() || null,
      billing_reference: value.billing_reference.trim() || null,
      tax_rate_bps: Math.round(Number(value.tax_rate) * 100),
      notes: value.notes.trim(),
    });
  }
}

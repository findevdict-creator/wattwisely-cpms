import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { Plan, PlanRequest, ProductModule } from '../../core/api/models/plan';
import { PlansApiService } from '../../core/api/plans-api.service';
import { Money } from '../../shared/money';
import { PlanForm } from './plan-form';

/** The plan to edit (null to create one) and the modules a plan can include. */
export interface PlanDialogData {
  plan: Plan | null;
  modules: ProductModule[];
}

/** Create or change a plan: fees, limits and the modules beyond the core. Closes with true when saved. */
@Component({
  selector: 'ww-plan-dialog',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
  ],
  templateUrl: './plan-dialog.component.html',
  styleUrl: './plan-dialog.component.scss',
})
export class PlanDialogComponent {
  protected readonly data = inject<PlanDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<PlanDialogComponent, boolean>>(MatDialogRef);
  private readonly plansApi = inject(PlansApiService);

  protected readonly form = PlanForm.build(inject(FormBuilder), this.data.plan);
  protected readonly moduleKeys = signal<string[]>(this.data.plan?.module_keys ?? []);
  protected readonly error = signal('');
  protected readonly isSaving = signal(false);

  protected toggleModule(key: string, isChecked: boolean): void {
    this.moduleKeys.update((keys) =>
      isChecked ? [...new Set([...keys, key])] : keys.filter((other) => other !== key),
    );
  }

  protected async save(): Promise<void> {
    const body = this.body();
    if (!body) {
      return;
    }
    this.isSaving.set(true);
    try {
      await firstValueFrom(
        this.data.plan
          ? this.plansApi.updatePlan(this.data.plan, body)
          : this.plansApi.createPlan(body),
      );
      this.dialogRef.close(true);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isSaving.set(false);
    }
  }

  /** The request body, or null (with an error shown) when a field is not acceptable. */
  private body(): PlanRequest | null {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Check the highlighted fields.');
      return null;
    }
    const value = this.form.getRawValue();
    const fees = this.fees(value.currency.toUpperCase());
    if (!fees) {
      return null;
    }
    return {
      ...(this.data.plan ? {} : { code: value.code.trim() }),
      ...fees,
      name: value.name.trim(),
      description: value.description.trim(),
      revenue_share_bps: Math.round(Number(value.revenue_share_percent) * 100),
      connector_limit: PlanForm.limitOf(value.connector_limit),
      user_limit: PlanForm.limitOf(value.user_limit),
      module_keys: this.moduleKeys(),
      is_active: value.is_active,
      sort_order: Number(value.sort_order),
    };
  }

  /** The three fees in minor units of the currency, or null (with an error shown) when one is not an amount. */
  private fees(
    currency: string,
  ): Pick<
    PlanRequest,
    'currency' | 'platform_fee' | 'ac_connector_fee' | 'dc_connector_fee'
  > | null {
    const value = this.form.getRawValue();
    const platform = Money.fromText(value.platform_fee, currency);
    const ac = Money.fromText(value.ac_connector_fee, currency);
    const dc = Money.fromText(value.dc_connector_fee, currency);
    if (platform === null || ac === null || dc === null) {
      this.error.set(`Fees must be amounts in ${currency}, such as 49.00.`);
      return null;
    }
    return { currency, platform_fee: platform, ac_connector_fee: ac, dc_connector_fee: dc };
  }
}

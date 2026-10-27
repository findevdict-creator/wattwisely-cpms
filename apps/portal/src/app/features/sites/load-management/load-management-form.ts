import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import {
  LoadManagement,
  LoadManagementInput,
  LoadStrategy,
} from '../../../core/api/models/load-management';

/** One charger's row on the page. */
export type LoadChargerGroup = FormGroup<{
  priority: FormControl<number>;
  max_power_kw: FormControl<number | null>;
}>;

/** The load management page's fields and how they turn into the API's body (module 17). */
export class LoadManagementForm {
  static readonly STRATEGIES: { value: LoadStrategy; label: string; hint: string }[] = [
    {
      value: 'equal_share',
      label: 'Equal share',
      hint: 'Every charging car gets the same, up to what its charger can take.',
    },
    {
      value: 'priority',
      label: 'By priority',
      hint: 'Chargers with a higher priority are filled first; the rest share what is left.',
    },
  ];

  readonly policy = new FormGroup({
    is_enabled: new FormControl(false, { nonNullable: true }),
    limit_kw: new FormControl(100, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(100_000)],
    }),
    strategy: new FormControl<LoadStrategy>('equal_share', { nonNullable: true }),
    min_power_kw: new FormControl(4.2, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0), Validators.max(1000)],
    }),
  });
  readonly chargers = new FormArray<LoadChargerGroup>([]);
  private chargerIds: string[] = [];

  /** Starts from what the API shows. */
  static of(view: LoadManagement): LoadManagementForm {
    const form = new LoadManagementForm();
    form.policy.setValue({
      is_enabled: view.policy.is_enabled,
      limit_kw: view.policy.limit_kw,
      strategy: view.policy.strategy,
      min_power_kw: view.policy.min_power_kw,
    });
    form.chargerIds = view.chargers.map((charger) => charger.id);
    for (const charger of view.chargers) {
      form.chargers.push(LoadManagementForm.row(charger.priority, charger.max_power_kw));
    }
    return form;
  }

  static row(priority: number, maxPowerKw: number | null): LoadChargerGroup {
    return new FormGroup({
      priority: new FormControl(priority, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(1), Validators.max(10)],
      }),
      max_power_kw: new FormControl<number | null>(maxPowerKw, {
        validators: [Validators.min(1), Validators.max(1000)],
      }),
    });
  }

  /** The minimum cannot be more than the limit: the allocator could never honour it. */
  isMinimumAboveLimit(): boolean {
    const value = this.policy.getRawValue();
    return value.min_power_kw > value.limit_kw;
  }

  isValid(): boolean {
    return this.policy.valid && this.chargers.valid && !this.isMinimumAboveLimit();
  }

  toInput(): LoadManagementInput {
    const value = this.policy.getRawValue();
    return {
      is_enabled: value.is_enabled,
      limit_kw: Number(value.limit_kw),
      strategy: value.strategy,
      min_power_kw: Number(value.min_power_kw),
      chargers: this.chargers.controls.map((row, index) => {
        const setting = row.getRawValue();
        const max = setting.max_power_kw;
        return {
          charger_id: this.chargerIds[index],
          priority: Number(setting.priority),
          max_power_kw: max === null || String(max) === '' ? null : Number(max),
        };
      }),
    };
  }
}

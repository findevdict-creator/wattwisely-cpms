import { FormBuilder, Validators } from '@angular/forms';
import { Plan } from '../../core/api/models/plan';
import { Money } from '../../shared/money';

/** The fields of a plan the form edits. */
type PlanFields = Omit<Plan, 'id' | 'version' | 'tenant_count'>;

/** Builds the plan dialog's form from a plan (or blank), and reads its odd fields back. */
export class PlanForm {
  static readonly CODE_PATTERN = /^[a-z0-9][a-z0-9-]{1,39}$/;
  static readonly NUMBER_PATTERN = /^\d+(\.\d+)?$/;
  /** What a new plan starts from. */
  static readonly BLANK: PlanFields = {
    code: '',
    name: '',
    description: '',
    currency: 'GBP',
    platform_fee: 0,
    ac_connector_fee: 0,
    dc_connector_fee: 0,
    revenue_share_bps: 0,
    connector_limit: null,
    user_limit: null,
    module_keys: [],
    is_active: true,
    sort_order: 100,
  };

  static build(formBuilder: FormBuilder, plan: Plan | null) {
    const p: PlanFields = plan ?? PlanForm.BLANK;
    const codeValidators = plan
      ? []
      : [Validators.required, Validators.pattern(PlanForm.CODE_PATTERN)];
    return formBuilder.nonNullable.group({
      code: [p.code, codeValidators],
      name: [p.name, [Validators.required, Validators.maxLength(60)]],
      description: [p.description, Validators.maxLength(300)],
      currency: [p.currency, [Validators.required, Validators.pattern(/^[A-Za-z]{3}$/)]],
      platform_fee: [Money.toText(p.platform_fee, p.currency), Validators.required],
      ac_connector_fee: [Money.toText(p.ac_connector_fee, p.currency), Validators.required],
      dc_connector_fee: [Money.toText(p.dc_connector_fee, p.currency), Validators.required],
      revenue_share_percent: [
        String(p.revenue_share_bps / 100),
        [Validators.required, Validators.pattern(PlanForm.NUMBER_PATTERN)],
      ],
      connector_limit: [PlanForm.textOf(p.connector_limit), Validators.pattern(/^\d*$/)],
      user_limit: [PlanForm.textOf(p.user_limit), Validators.pattern(/^\d*$/)],
      is_active: [p.is_active],
      sort_order: [String(p.sort_order), Validators.pattern(/^\d+$/)],
    });
  }

  /** An empty field means "unlimited" (null). */
  static limitOf(text: string): number | null {
    return text.trim() === '' ? null : Number(text);
  }

  static textOf(limit: number | null): string {
    return limit === null ? '' : String(limit);
  }
}

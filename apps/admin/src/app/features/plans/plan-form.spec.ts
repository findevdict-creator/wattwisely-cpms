import { FormBuilder } from '@angular/forms';
import { Plan } from '../../core/api/models/plan';
import { PlanForm } from './plan-form';

describe('PlanForm', () => {
  const plan: Plan = {
    id: 'p1',
    code: 'growth',
    name: 'Growth',
    description: '',
    currency: 'GBP',
    platform_fee: 29900,
    ac_connector_fee: 1000,
    dc_connector_fee: 1600,
    revenue_share_bps: 150,
    connector_limit: null,
    user_limit: 25,
    module_keys: ['advanced_reports'],
    is_active: true,
    sort_order: 30,
    version: 1,
  };

  it('shows money and percentages the way people write them', () => {
    const form = PlanForm.build(new FormBuilder(), plan);

    expect(form.getRawValue()).toMatchObject({
      platform_fee: '299.00',
      revenue_share_percent: '1.5',
      connector_limit: '',
      user_limit: '25',
    });
  });

  it('reads an empty limit as unlimited', () => {
    expect(PlanForm.limitOf('')).toBeNull();
    expect(PlanForm.limitOf(' 40 ')).toBe(40);
  });

  it('needs a code only for a new plan', () => {
    const blank = PlanForm.build(new FormBuilder(), null);
    expect(blank.controls.code.valid).toBe(false);
    blank.controls.code.setValue('team-plan');
    expect(blank.controls.code.valid).toBe(true);
  });
});

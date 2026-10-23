import { AlertRule } from '../../../core/api/models/alert';
import { AlertRuleTarget } from './alert-rule-target';

describe('AlertRuleTarget', () => {
  const rule: AlertRule = {
    alert_type: 'charger_offline',
    site_id: null,
    role_id: null,
    membership_id: null,
    is_email: true,
    is_in_portal: true,
  };

  it('keeps a role or a person in one value', () => {
    expect(AlertRuleTarget.of({ ...rule, role_id: 'r1' })).toBe('role:r1');
    expect(AlertRuleTarget.of({ ...rule, membership_id: 'm1' })).toBe('member:m1');
    expect(AlertRuleTarget.of(rule)).toBe('');
  });

  it('sets one field and clears the other', () => {
    const toRole = AlertRuleTarget.apply({ ...rule, membership_id: 'm1' }, 'role:r1');
    expect(toRole).toMatchObject({ role_id: 'r1', membership_id: null });
    const toMember = AlertRuleTarget.apply({ ...rule, role_id: 'r1' }, 'member:m1');
    expect(toMember).toMatchObject({ role_id: null, membership_id: 'm1' });
  });

  it('flags rows without a recipient or without a channel', () => {
    expect(AlertRuleTarget.isIncomplete(rule)).toBe(true);
    const withRole = { ...rule, role_id: 'r1' };
    expect(AlertRuleTarget.isIncomplete(withRole)).toBe(false);
    expect(
      AlertRuleTarget.isIncomplete({ ...withRole, is_email: false, is_in_portal: false }),
    ).toBe(true);
  });
});

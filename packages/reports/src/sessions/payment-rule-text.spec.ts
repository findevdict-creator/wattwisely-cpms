import { PaymentRuleText } from './payment-rule-text';

describe('PaymentRuleText', () => {
  it('says who decided, naming the group when a group did', () => {
    expect(PaymentRuleText.of({ outcome: 'free', decided_by: 'group', label: 'Depot staff' })).toBe(
      'Free: group Depot staff',
    );
    expect(PaymentRuleText.of({ outcome: 'pay', decided_by: 'operator', label: null })).toBe(
      "Paid: the operator's standard",
    );
    expect(PaymentRuleText.of({ outcome: 'free', decided_by: 'staff', label: null })).toBe(
      'Free: started by staff',
    );
    expect(PaymentRuleText.of(null)).toBe('');
  });
});

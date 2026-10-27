import { SessionPaymentRule } from '@wattwisely/db';

/** The payment rule of a session in words, for the CSV and the portal: "Free: group Depot staff". */
export class PaymentRuleText {
  static readonly DECIDERS: Record<SessionPaymentRule['decided_by'], string> = {
    card: 'the card',
    driver: 'the driver',
    group: 'a group',
    operator: "the operator's standard",
    staff: 'started by staff',
    guest: 'a guest',
  };

  static of(rule: SessionPaymentRule | null): string {
    if (!rule) {
      return '';
    }
    const outcome = rule.outcome === 'free' ? 'Free' : 'Paid';
    const by =
      rule.decided_by === 'group' && rule.label
        ? `group ${rule.label}`
        : PaymentRuleText.DECIDERS[rule.decided_by];
    return `${outcome}: ${by}`;
  }
}

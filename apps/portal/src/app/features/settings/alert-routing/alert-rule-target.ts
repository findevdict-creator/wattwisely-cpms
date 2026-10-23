import { AlertRule } from '../../../core/api/models/alert';

/**
 * A rule goes to a role or to one person. The form keeps both in one select, as
 * "role:<id>" or "member:<id>"; this turns that value into the rule's two fields and back.
 */
export class AlertRuleTarget {
  static of(rule: Pick<AlertRule, 'role_id' | 'membership_id'>): string {
    if (rule.role_id) {
      return `role:${rule.role_id}`;
    }
    return rule.membership_id ? `member:${rule.membership_id}` : '';
  }

  static apply(rule: AlertRule, target: string): AlertRule {
    const [kind, id] = target.split(':');
    return {
      ...rule,
      role_id: kind === 'role' ? id : null,
      membership_id: kind === 'member' ? id : null,
    };
  }

  /** The rows that cannot be saved yet: no recipient, or no channel. */
  static isIncomplete(rule: AlertRule): boolean {
    const hasTarget = AlertRuleTarget.of(rule) !== '';
    return !hasTarget || (!rule.is_email && !rule.is_in_portal);
  }
}

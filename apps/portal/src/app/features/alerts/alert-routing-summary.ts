import { AlertRule, AlertRules, AlertType, AlertTypeLabels } from '../../core/api/models/alert';

/** One line of "Who gets which alert" on the Alerts page. */
export interface RoutingLine {
  type: AlertType;
  label: string;
  sentTo: string;
  sites: string;
  channels: string;
  isDefault: boolean;
}

/**
 * The alert routing in short, one line per kind of alert: who hears, at which sites and how.
 * A kind without rules goes to the default roles, as Settings, Alert routing explains.
 */
export class AlertRoutingSummary {
  static lines(routing: AlertRules): RoutingLine[] {
    return AlertTypeLabels.TYPES.map((type) => {
      const rules = routing.rules.filter((rule) => rule.alert_type === type);
      return rules.length > 0
        ? AlertRoutingSummary.fromRules(type, rules)
        : AlertRoutingSummary.fromDefaults(type, routing.default_rules);
    });
  }

  private static fromRules(type: AlertType, rules: AlertRule[]): RoutingLine {
    const sites = rules.some((rule) => rule.site_id === null)
      ? 'All sites'
      : AlertRoutingSummary.unique(rules.map((rule) => rule.site_name ?? ''));
    return {
      type,
      label: AlertTypeLabels.LABELS[type],
      sentTo: AlertRoutingSummary.unique(
        rules.map((rule) => rule.role_name ?? rule.member_name ?? ''),
      ),
      sites,
      channels: AlertRoutingSummary.channels(rules),
      isDefault: false,
    };
  }

  private static fromDefaults(type: AlertType, defaults: AlertRules['default_rules']): RoutingLine {
    return {
      type,
      label: AlertTypeLabels.LABELS[type],
      sentTo: AlertRoutingSummary.unique(defaults.map((role) => role.role_name)),
      sites: 'All sites',
      channels: AlertRoutingSummary.channels(defaults),
      isDefault: true,
    };
  }

  /** "E-mail, in the portal". */
  private static channels(rules: { is_email: boolean; is_in_portal: boolean }[]): string {
    const words = [
      rules.some((rule) => rule.is_email) ? 'E-mail' : '',
      rules.some((rule) => rule.is_in_portal) ? 'in the portal' : '',
    ].filter((word) => word !== '');
    const text = words.join(', ');
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  private static unique(names: string[]): string {
    return [...new Set(names.filter((name) => name !== ''))].join(', ');
  }
}

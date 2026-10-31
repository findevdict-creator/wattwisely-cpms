import { AlertRule, AlertRules } from '../../core/api/models/alert';
import { AlertRoutingSummary } from './alert-routing-summary';

describe('AlertRoutingSummary', () => {
  const rule = (overrides: Partial<AlertRule>): AlertRule => ({
    alert_type: 'connector_faulted',
    site_id: null,
    role_id: 'r1',
    role_name: 'Operations',
    membership_id: null,
    is_email: true,
    is_in_portal: false,
    ...overrides,
  });
  const routing = (rules: AlertRule[]): AlertRules => ({
    rules,
    default_rules: [{ role_name: 'Owner', is_email: true, is_in_portal: true }],
  });

  it('names everyone a kind of alert goes to, where and how', () => {
    const [faulted] = AlertRoutingSummary.lines(
      routing([
        rule({}),
        rule({
          role_id: null,
          role_name: null,
          membership_id: 'm1',
          member_name: 'Tom Reyes',
          is_in_portal: true,
        }),
      ]),
    ).filter((line) => line.type === 'connector_faulted');
    expect(faulted).toMatchObject({
      sentTo: 'Operations, Tom Reyes',
      sites: 'All sites',
      channels: 'E-mail, in the portal',
      isDefault: false,
    });
  });

  it('lists the sites when no rule covers all of them', () => {
    const [line] = AlertRoutingSummary.lines(
      routing([
        rule({ site_id: 's1', site_name: 'Riverside', is_email: false, is_in_portal: true }),
        rule({ site_id: 's2', site_name: 'Depot', is_email: false, is_in_portal: true }),
      ]),
    ).filter((candidate) => candidate.type === 'connector_faulted');
    expect(line.sites).toBe('Riverside, Depot');
    expect(line.channels).toBe('In the portal');
  });

  it('sends a kind without rules to the default roles', () => {
    const offline = AlertRoutingSummary.lines(routing([])).find(
      (line) => line.type === 'charger_offline',
    );
    expect(offline).toMatchObject({ sentTo: 'Owner', isDefault: true });
  });
});

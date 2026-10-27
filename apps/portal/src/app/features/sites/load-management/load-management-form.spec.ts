import { LoadManagement } from '../../../core/api/models/load-management';
import { LoadManagementForm } from './load-management-form';

describe('LoadManagementForm', () => {
  const view: LoadManagement = {
    policy: {
      is_enabled: true,
      limit_kw: 30,
      strategy: 'priority',
      min_power_kw: 4.2,
      version: 2,
      updated_at: null,
    },
    chargers: [
      {
        id: 'ch-a',
        identity: 'WW-A',
        status: 'charging',
        is_online: true,
        priority: 8,
        max_power_kw: 40,
        connectors_max_kw: 44,
        allocated_kw: 25.8,
        reason: 'share',
        is_charging: true,
        is_applied: true,
        applied_at: '2026-03-10T10:00:00Z',
        last_error: null,
      },
      {
        id: 'ch-b',
        identity: 'WW-B',
        status: 'available',
        is_online: true,
        priority: 3,
        max_power_kw: null,
        connectors_max_kw: 7.4,
        allocated_kw: 4.2,
        reason: 'idle',
        is_charging: false,
        is_applied: false,
        applied_at: null,
        last_error: null,
      },
    ],
    allocated_kw: 30,
    charging_count: 1,
  };

  it('starts from the API view and sends the same back as numbers', () => {
    const form = LoadManagementForm.of(view);
    expect(form.isValid()).toBe(true);
    form.chargers.at(1).patchValue({ max_power_kw: '7' as unknown as number });
    expect(form.toInput()).toEqual({
      is_enabled: true,
      limit_kw: 30,
      strategy: 'priority',
      min_power_kw: 4.2,
      chargers: [
        { charger_id: 'ch-a', priority: 8, max_power_kw: 40 },
        { charger_id: 'ch-b', priority: 3, max_power_kw: 7 },
      ],
    });
  });

  it('refuses a minimum above the limit and a priority out of range', () => {
    const form = LoadManagementForm.of(view);
    form.policy.patchValue({ limit_kw: 4 });
    expect(form.isMinimumAboveLimit()).toBe(true);
    expect(form.isValid()).toBe(false);
    form.policy.patchValue({ limit_kw: 30 });
    form.chargers.at(0).patchValue({ priority: 11 });
    expect(form.isValid()).toBe(false);
  });

  it('starts with the defaults when the site has no policy yet', () => {
    const form = new LoadManagementForm();
    expect(form.toInput()).toEqual({
      is_enabled: false,
      limit_kw: 100,
      strategy: 'equal_share',
      min_power_kw: 4.2,
      chargers: [],
    });
  });
});

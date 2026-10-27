import { LoadCharger, LoadManagement } from '../../../core/api/models/load-management';
import { LoadFigures } from './load-figures';

describe('LoadFigures', () => {
  const charger = (allocated: number | null, extra: Partial<LoadCharger> = {}) =>
    ({
      allocated_kw: allocated,
      max_power_kw: 150,
      connectors_max_kw: 150,
      reason: 'share',
      is_applied: true,
      last_error: null,
      ...extra,
    }) as LoadCharger;
  const view = (allocated: number, chargers: LoadCharger[]) =>
    ({
      policy: { limit_kw: 600, min_power_kw: 7 },
      allocated_kw: allocated,
      charging_count: 2,
      chargers,
    }) as LoadManagement;

  it('says how much room is left under the limit', () => {
    expect(LoadFigures.of(view(392, [])).headroom).toBe(208);
    expect(LoadFigures.of(view(392, [])).room).toBe('Room for another fast charge');
    expect(LoadFigures.of(view(580, [])).room).toBe('Room for another car');
    expect(LoadFigures.of(view(600, [])).room).toBe('At the limit: new cars wait');
  });

  it('counts the caps the chargers confirmed', () => {
    const figures = LoadFigures.of(
      view(240, [
        charger(120),
        charger(120),
        charger(0, { reason: 'waiting' }),
        charger(3, { is_applied: false, last_error: 'Timed out' }),
        charger(null),
      ]),
    );
    expect(figures.applied).toBe('3 of 4');
    expect(figures.unconfirmed).toBe('1 charger did not confirm');
    expect(figures.waiting).toBe('1 waiting for power');
  });

  it('fills a charger bar against the most that charger takes', () => {
    expect(LoadFigures.shareOf(charger(120), 600)).toBe(80);
    expect(
      LoadFigures.shareOf(charger(22, { max_power_kw: null, connectors_max_kw: 22 }), 600),
    ).toBe(100);
  });
});

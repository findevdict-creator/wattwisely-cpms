import { Site } from '../../core/api/models/site';
import { FleetLayout } from './fleet-layout';

describe('FleetLayout', () => {
  const site = (name: string, latitude: number, longitude: number, status: Site['status'] = 'ok') =>
    ({
      name,
      latitude,
      longitude,
      status,
      connector_count: 4,
      available_connector_count: 3,
    }) as Site;

  it('puts west on the left and north at the top, inside the card', () => {
    const [west, east] = FleetLayout.place([site('West', 51.6, -0.2), site('East', 51.4, 0.1)]);
    expect(west.left).toBe(FleetLayout.MARGIN.left);
    expect(east.left).toBe(100 - FleetLayout.MARGIN.right);
    expect(west.top).toBe(FleetLayout.MARGIN.top);
    expect(east.top).toBe(100 - FleetLayout.MARGIN.bottom);
  });

  it('moves a pin that would cover another one down a row', () => {
    const [first, second] = FleetLayout.place([
      site('Riverside', 51.5, -0.1),
      site('Office', 51.5, -0.09),
      site('Far', 51.4, 0.2),
    ]);
    expect(second.top - first.top).toBe(FleetLayout.ROW);
  });

  it('centres a single site', () => {
    const [only] = FleetLayout.place([site('Only', 51.5, -0.1)]);
    expect(only.left).toBeCloseTo((FleetLayout.MARGIN.left + 100 - FleetLayout.MARGIN.right) / 2);
  });

  it('says how each site is doing', () => {
    expect(FleetLayout.label(site('Riverside', 0, 0))).toBe('Riverside · 3 of 4 free');
    expect(FleetLayout.place([site('Depot', 0, 0, 'offline')])[0]).toMatchObject({
      tone: 'off',
      label: 'Depot · offline',
    });
  });
});

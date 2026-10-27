import { Site } from '../../core/api/models/site';
import { SiteMapLayout } from './site-map-layout';

describe('SiteMapLayout', () => {
  const site = (name: string, latitude: number, longitude: number, status: Site['status'] = 'ok') =>
    ({
      name,
      latitude,
      longitude,
      status,
      connector_count: 4,
      available_connector_count: 3,
    }) as Site;

  it('puts west on the left and north at the top, inside the map', () => {
    const [west, east] = SiteMapLayout.place([site('West', 51.6, -0.2), site('East', 51.4, 0.1)]);
    expect(west.left).toBe(SiteMapLayout.MARGIN.left);
    expect(east.left).toBe(100 - SiteMapLayout.MARGIN.right);
    expect(west.top).toBe(SiteMapLayout.MARGIN.top);
    expect(east.top).toBe(100 - SiteMapLayout.MARGIN.bottom);
  });

  it('moves a pin that would cover another one down a row', () => {
    const [first, second] = SiteMapLayout.place([
      site('Riverside', 51.5, -0.1),
      site('Office', 51.5, -0.09),
      site('Far', 51.4, 0.2),
    ]);
    expect(second.top - first.top).toBe(SiteMapLayout.ROW);
  });

  it('centres a single site', () => {
    const [only] = SiteMapLayout.place([site('Only', 51.5, -0.1)]);
    expect(only.left).toBeCloseTo(
      (SiteMapLayout.MARGIN.left + 100 - SiteMapLayout.MARGIN.right) / 2,
    );
  });

  it('says how each site is doing', () => {
    expect(SiteMapLayout.label(site('Riverside', 0, 0))).toBe('Riverside · 3 of 4 free');
    const full = { ...site('Highway', 0, 0), available_connector_count: 0 };
    expect(SiteMapLayout.place([full])[0]).toMatchObject({
      tone: 'busy',
      label: 'Highway · all in use',
    });
    expect(SiteMapLayout.place([site('Depot', 0, 0, 'offline')])[0]).toMatchObject({
      tone: 'off',
      label: 'Depot · offline',
    });
  });
});

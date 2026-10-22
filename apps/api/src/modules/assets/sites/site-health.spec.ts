import { SiteHealth } from './site-health';
import { SiteFleet } from './site-record';

describe('SiteHealth', () => {
  const fleet = (chargerStatuses: Record<string, number>, connectorStatuses = {}): SiteFleet => ({
    chargerCount: Object.values(chargerStatuses).reduce((sum, count) => sum + count, 0),
    chargerStatuses,
    connectorStatuses,
  });

  it('is ok with no chargers, or only chargers waiting for their first connection', () => {
    expect(SiteHealth.statusOf(fleet({}))).toBe('ok');
    expect(SiteHealth.statusOf(fleet({ waiting: 2 }))).toBe('ok');
    expect(SiteHealth.statusOf(fleet({ available: 1, charging: 2, waiting: 1 }))).toBe('ok');
  });

  it('is offline when every connected charger is silent', () => {
    expect(SiteHealth.statusOf(fleet({ offline: 2, waiting: 1 }))).toBe('offline');
  });

  it('is a problem when a charger is faulted or silent among working ones', () => {
    expect(SiteHealth.statusOf(fleet({ available: 1, faulted: 1 }))).toBe('problem');
    expect(SiteHealth.statusOf(fleet({ available: 1, offline: 1 }))).toBe('problem');
  });

  it('counts connectors', () => {
    const site = fleet({ available: 1 }, { available: 3, charging: 2, unknown: 1 });

    expect(SiteHealth.availableConnectors(site)).toBe(3);
    expect(SiteHealth.connectorCount(site)).toBe(6);
  });
});

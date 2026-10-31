import { AppIcons } from '@wattwisely/ui';
import { ManagedServiceSummary } from '../core/api/models/my-permissions';
import { MenuPermissions } from './menu-item';
import { PageLocation } from './page-location';
import { PortalMenu } from './portal-menu';
import { SettingsMenu } from './settings-menu';

class FakePermissions implements MenuPermissions {
  constructor(
    private readonly keys: string[],
    private readonly managed: ManagedServiceSummary | null = null,
  ) {}

  can(key: string): boolean {
    return this.keys.includes(key);
  }

  managedService(): ManagedServiceSummary | null {
    return this.managed;
  }
}

describe('PortalMenu', () => {
  const labels = (permissions: MenuPermissions) =>
    PortalMenu.groups(permissions).map((group) => [
      group.heading,
      group.items.map((item) => item.label),
    ]);

  it('groups the pages and shows only those the user may open', () => {
    expect(labels(new FakePermissions(['alerts:read', 'chargers:read', 'invoices:read']))).toEqual([
      ['', ['Home', 'Alerts']],
      ['Operate', ['Chargers']],
      ['Business', ['Invoices']],
    ]);
  });

  it('leads Settings to the first settings page the user may open', () => {
    const settings = (keys: string[]) =>
      PortalMenu.groups(new FakePermissions(keys))
        .flatMap((group) => group.items)
        .find((item) => item.testId === 'nav-settings')?.link;
    expect(settings(['settings:read', 'api_keys:manage'])).toBe('/settings/branding');
    expect(settings(['api_keys:manage'])).toBe('/settings/api-keys');
    expect(settings(['invoices:read'])).toBeUndefined();
  });

  it('keeps Settings active on settings pages but not on invoices', () => {
    const settings = PortalMenu.GROUPS[3].items[2];
    expect(PortalMenu.isActive(settings, '/settings/webhooks/w1')).toBe(true);
    expect(PortalMenu.isActive(settings, '/settings/invoices/i1')).toBe(false);
    expect(PortalMenu.isActive(PortalMenu.GROUPS[0].items[0], '/alerts')).toBe(false);
    expect(PortalMenu.isActive(PortalMenu.GROUPS[0].items[1], '/alerts/a1?x=1')).toBe(true);
  });

  it('shows Managed service only to tenants with an agreement', () => {
    const managed = { status: 'active' } as ManagedServiceSummary;
    const items = (summary: ManagedServiceSummary | null) =>
      SettingsMenu.groups(new FakePermissions(['settings:read'], summary))[0].items.length;
    expect(items(null)).toBe(3);
    expect(items(managed)).toBe(4);
  });

  it('draws every menu icon from the registered icons', () => {
    const icons = [...PortalMenu.GROUPS, ...SettingsMenu.GROUPS].flatMap((group) =>
      group.items.map((item) => item.icon),
    );
    expect(icons.filter((icon) => !(icon in AppIcons.SVG))).toEqual([]);
  });
});

describe('PageLocation', () => {
  it('names the group and the page', () => {
    expect(PageLocation.of('/chargers', 'Acme')).toEqual({ section: 'Operate', page: 'Chargers' });
    expect(PageLocation.of('/', 'Acme')).toEqual({ section: 'Acme', page: 'Home' });
    expect(PageLocation.of('/alerts', 'Acme')).toEqual({ section: 'Acme', page: 'Alerts' });
    expect(PageLocation.of('/settings/invoices', 'Acme')).toEqual({
      section: 'Business',
      page: 'Invoices',
    });
    expect(PageLocation.of('/settings/alert-routing', 'Acme')).toEqual({
      section: 'Settings',
      page: 'Alert routing',
    });
  });

  it('puts the title of a page under a menu item after that item', () => {
    expect(PageLocation.of('/alerts/a1', 'Acme', 'GroundFailure on CP-07')).toEqual({
      section: 'Alerts',
      page: 'GroundFailure on CP-07',
    });
    expect(PageLocation.of('/chargers/c1', 'Acme')).toEqual({
      section: 'Operate',
      page: 'Chargers',
    });
  });
});

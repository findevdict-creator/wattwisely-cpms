import { MenuGroup, MenuItem, MenuMatcher, MenuPermissions } from './menu-item';
import { SettingsMenu } from './settings-menu';

/**
 * The side menu: Home and Alerts, then Operate, Business and Workspace. Each item shows only to
 * people who may open its page. Settings leads to the first settings page the user may open.
 */
export class PortalMenu {
  static readonly SETTINGS = '/settings';

  static readonly GROUPS: MenuGroup[] = [
    {
      heading: '',
      items: [
        PortalMenu.item('Home', 'house', '/', () => true),
        PortalMenu.item('Alerts', 'bell-ring', '/alerts', (p) => p.can('alerts:read')),
      ],
    },
    {
      heading: 'Operate',
      items: [
        PortalMenu.item('Sites', 'map-pin', '/sites', (p) => p.can('sites:read')),
        PortalMenu.item('Chargers', 'plug-zap', '/chargers', (p) => p.can('chargers:read')),
        PortalMenu.item('Sessions', 'battery-charging', '/sessions', (p) => p.can('sessions:read')),
        PortalMenu.item('Drivers', 'id-card', '/drivers', (p) => p.can('drivers:read')),
      ],
    },
    {
      heading: 'Business',
      items: [
        PortalMenu.item('Tariffs', 'tag', '/tariffs', (p) => p.can('tariffs:read')),
        PortalMenu.item(
          'Payments',
          'credit-card',
          '/payments',
          (p) => p.can('payments:read') || p.can('settings:payments'),
        ),
        PortalMenu.item('Reports', 'chart-column', '/reports', (p) => p.can('reports:read')),
        PortalMenu.item('Invoices', 'file-text', '/settings/invoices', (p) =>
          p.can('invoices:read'),
        ),
      ],
    },
    {
      heading: 'Workspace',
      items: [
        PortalMenu.item('Team', 'users', '/team', (p) => p.can('team:read')),
        PortalMenu.item('Audit log', 'scroll-text', '/audit-log', (p) => p.can('audit:read')),
        PortalMenu.item(
          'Settings',
          'settings',
          PortalMenu.SETTINGS,
          (p) => SettingsMenu.firstLink(p) !== null,
        ),
      ],
    },
  ];

  /** The groups the user sees, with Settings pointing at their first settings page. */
  static groups(permissions: MenuPermissions): MenuGroup[] {
    const settingsLink = SettingsMenu.firstLink(permissions) ?? PortalMenu.SETTINGS;
    return MenuMatcher.visible(PortalMenu.GROUPS, permissions).map((group) => ({
      ...group,
      items: group.items.map((item) =>
        item.link === PortalMenu.SETTINGS ? { ...item, link: settingsLink } : item,
      ),
    }));
  }

  /** Settings stays active on every settings page; the rest on their own pages and those under them. */
  static isActive(item: MenuItem, url: string): boolean {
    return item.testId === 'nav-settings'
      ? SettingsMenu.isSettingsPage(url)
      : MenuMatcher.isActive(item, url);
  }

  /** An item whose test id is nav- and the last part of its link, nav-home for Home. */
  private static item(
    label: string,
    icon: string,
    link: string,
    isShown: (permissions: MenuPermissions) => boolean,
  ): MenuItem {
    const testId = `nav-${link.split('/').pop() || 'home'}`;
    return { label, icon, link, testId, isShown, isExact: link === '/' };
  }
}

import { MenuGroup, MenuMatcher, MenuPermissions } from './menu-item';

/** The menu inside Settings: the workspace's own settings, then those for developers. */
export class SettingsMenu {
  static readonly GROUPS: MenuGroup[] = [
    {
      heading: 'Settings',
      items: [
        {
          label: 'Branding',
          icon: 'palette',
          link: '/settings/branding',
          testId: 'nav-branding',
          isShown: (permissions) => permissions.can('settings:read'),
        },
        {
          label: 'Alert routing',
          icon: 'route',
          link: '/settings/alert-routing',
          testId: 'nav-alert-routing',
          isShown: (permissions) => permissions.can('settings:read'),
        },
        {
          label: 'WhatsApp charging',
          icon: 'message-square',
          link: '/settings/messaging',
          testId: 'nav-messaging',
          isShown: (permissions) => permissions.can('messaging:manage'),
        },
        {
          label: 'Plan and usage',
          icon: 'gem',
          link: '/settings/plan',
          testId: 'nav-plan',
          isShown: (permissions) => permissions.can('settings:read'),
        },
        {
          label: 'Managed service',
          icon: 'headset',
          link: '/settings/managed-service',
          testId: 'nav-managed-service',
          isShown: (permissions) =>
            permissions.can('settings:read') && permissions.managedService() !== null,
        },
      ],
    },
    {
      heading: 'Developers',
      items: [
        {
          label: 'API keys',
          icon: 'key-round',
          link: '/settings/api-keys',
          testId: 'nav-api-keys',
          isShown: (permissions) => permissions.can('api_keys:manage'),
        },
        {
          label: 'Webhooks',
          icon: 'webhook',
          link: '/settings/webhooks',
          testId: 'nav-webhooks',
          isShown: (permissions) => permissions.can('api_keys:manage'),
        },
      ],
    },
  ];

  static groups(permissions: MenuPermissions): MenuGroup[] {
    return MenuMatcher.visible(SettingsMenu.GROUPS, permissions);
  }

  /** Where the side menu's Settings link leads: the first settings page the user may open. */
  static firstLink(permissions: MenuPermissions): string | null {
    return SettingsMenu.groups(permissions)[0]?.items[0]?.link ?? null;
  }

  /** True on any settings page, which Invoices, though under /settings, is not. */
  static isSettingsPage(url: string): boolean {
    const path = MenuMatcher.pathOf(url);
    return SettingsMenu.GROUPS.some((group) =>
      group.items.some((item) => MenuMatcher.isUnder(path, item.link, false)),
    );
  }
}

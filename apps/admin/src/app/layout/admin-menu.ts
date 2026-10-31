/** One link in the side menu, and the platform permission it needs ('' for every staff role). */
export interface AdminMenuItem {
  label: string;
  icon: string;
  link: string;
  testId: string;
  permission: string;
}

/** Links under one heading; the first group has none. */
export interface AdminMenuGroup {
  heading: string;
  items: AdminMenuItem[];
}

/** Where a staff member is, as the top bar shows it: "Platform › Plans". */
export interface Where {
  section: string;
  page: string;
}

/** The console's menu as data: which items a role sees, which one is on, and where you are. */
export class AdminMenu {
  static readonly CONSOLE = 'Staff console';
  static readonly GROUPS: AdminMenuGroup[] = [
    {
      heading: '',
      items: [
        {
          label: 'Overview',
          icon: 'layout-dashboard',
          link: '/',
          testId: 'nav-overview',
          permission: '',
        },
        {
          label: 'Tenants',
          icon: 'building-2',
          link: '/tenants',
          testId: 'nav-tenants',
          permission: '',
        },
      ],
    },
    {
      heading: 'Platform',
      items: [
        {
          label: 'Plans',
          icon: 'tag',
          link: '/plans',
          testId: 'nav-plans',
          permission: 'plans:read',
        },
        {
          label: 'Staff',
          icon: 'id-card',
          link: '/staff',
          testId: 'nav-staff',
          permission: 'staff:read',
        },
        {
          label: 'Invoices',
          icon: 'receipt-text',
          link: '/invoices',
          testId: 'nav-invoices',
          permission: 'billing:read',
        },
        {
          label: 'Audit log',
          icon: 'history',
          link: '/audit-log',
          testId: 'nav-audit-log',
          permission: 'platform_audit:read',
        },
      ],
    },
  ];

  /** The groups with only the items the role may open, and no group left empty. */
  static visible(can: (permission: string) => boolean): AdminMenuGroup[] {
    return AdminMenu.GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || can(item.permission)),
    })).filter((group) => group.items.length > 0);
  }

  /** Overview only on its own page; the others also on the pages under them. */
  static isActive(item: AdminMenuItem, url: string): boolean {
    const path = AdminMenu.pathOf(url);
    return item.link === '/' ? path === '/' : AdminMenu.isUnder(path, item.link);
  }

  /** "Platform › Plans"; on a page under an item, "Tenants › Acme Charging". */
  static where(url: string, detail = ''): Where {
    const path = AdminMenu.pathOf(url);
    for (const group of AdminMenu.GROUPS) {
      for (const item of group.items.filter((each) => each.link !== '/')) {
        if (path === item.link) {
          return { section: group.heading || AdminMenu.CONSOLE, page: item.label };
        }
        if (AdminMenu.isUnder(path, item.link)) {
          return { section: item.label, page: detail };
        }
      }
    }
    return { section: AdminMenu.CONSOLE, page: 'Overview' };
  }

  /** '/tenants/t1?tab=x#top' as '/tenants/t1'. */
  static pathOf(url: string): string {
    return url.split(/[?#]/)[0] || '/';
  }

  private static isUnder(path: string, link: string): boolean {
    return path === link || path.startsWith(`${link}/`);
  }
}

import { ManagedServiceSummary } from '../core/api/models/my-permissions';

/** What a menu needs to know about the user; PermissionsService answers it. */
export interface MenuPermissions {
  can(key: string): boolean;
  managedService(): ManagedServiceSummary | null;
}

/** One link in a menu. */
export interface MenuItem {
  label: string;
  icon: string;
  link: string;
  testId: string;
  isShown(permissions: MenuPermissions): boolean;
  /** Home is active only on its own page; other items also on the pages under them. */
  isExact?: boolean;
}

/** Links under one heading; the first group of the side menu has none. */
export interface MenuGroup {
  heading: string;
  items: MenuItem[];
}

/** Which items a user sees, and which one is active for a URL. */
export class MenuMatcher {
  /** The groups with only the items the user may open, and without groups left empty. */
  static visible(groups: MenuGroup[], permissions: MenuPermissions): MenuGroup[] {
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.isShown(permissions)),
      }))
      .filter((group) => group.items.length > 0);
  }

  static isActive(item: MenuItem, url: string): boolean {
    return MenuMatcher.isUnder(MenuMatcher.pathOf(url), item.link, item.isExact ?? false);
  }

  static isUnder(path: string, link: string, isExact: boolean): boolean {
    return path === link || (!isExact && path.startsWith(`${link}/`));
  }

  /** '/alerts/a1?tab=open#top' as '/alerts/a1'. */
  static pathOf(url: string): string {
    return url.split(/[?#]/)[0] || '/';
  }
}

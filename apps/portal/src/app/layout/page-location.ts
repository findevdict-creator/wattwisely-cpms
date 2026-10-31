import { MenuGroup, MenuMatcher } from './menu-item';
import { PortalMenu } from './portal-menu';
import { SettingsMenu } from './settings-menu';

/** Where the user is, as the top bar shows it: "Operate › Chargers". */
export interface Where {
  section: string;
  page: string;
}

/**
 * Names the page for a URL from the menus: the menu group, then the page. On a page under a
 * menu item, such as one alert, the item becomes the section and the page's own title follows.
 */
export class PageLocation {
  static of(url: string, workspace: string, detail = ''): Where {
    const path = MenuMatcher.pathOf(url);
    const match = PageLocation.closest(path);
    if (!match) {
      return { section: workspace, page: path === '/' ? 'Home' : '' };
    }
    const section = match.section || workspace;
    return path !== match.link && detail
      ? { section: match.label, page: detail }
      : { section, page: match.label };
  }

  /** The menu item with the longest link that the path is on or under. */
  private static closest(path: string): { section: string; label: string; link: string } | null {
    const pages = [
      ...PageLocation.pagesOf(PortalMenu.GROUPS, ''),
      ...PageLocation.pagesOf(SettingsMenu.GROUPS, 'Settings'),
    ].filter((page) => page.link !== '/' && MenuMatcher.isUnder(path, page.link, false));
    return pages.sort((a, b) => b.link.length - a.link.length)[0] ?? null;
  }

  private static pagesOf(
    groups: MenuGroup[],
    section: string,
  ): { section: string; label: string; link: string }[] {
    return groups.flatMap((group) =>
      group.items.map((item) => ({
        section: section || group.heading,
        label: item.label,
        link: item.link,
      })),
    );
  }
}

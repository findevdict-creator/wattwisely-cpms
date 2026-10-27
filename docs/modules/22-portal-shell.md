# Module 22: portal shell, home and alerts

The portal gets the frame of the approved screens. **The side menu groups the pages** (Home and Alerts, then Operate, Business and Workspace) with the workspace at its head, **a top bar says where you are** and holds the managed badge, the bell, help and your account, and **Settings has a menu of its own**. Inside the frame, the home page, the alerts list, a new alert page, the workspace picker, the no-workspace page and the invitation page are rebuilt as designed.

URLs, permissions and `data-testid` attributes stay as they were, so links in e-mails and bookmarks keep working: `/alerts/{id}`, the link in every alert e-mail, now opens a page about that alert instead of the list. The other portal pages keep their content until modules 23 and 24, but already sit in the new frame.

Stories covered: Olivia, an Owner, opens the portal and sees this week's energy, sessions and revenue against last week, her sites where they are with the ones in trouble in red, and the four newest alerts; Tom, a technician, opens the link in an alert e-mail and lands on that alert, with its timeline and the charger it is about; Maya works for three operators, picks one after signing in and switches from the head of the side menu; someone signs in before any company has invited them and is told what to do; an invited colleague opens the invitation and sees who invited them and as what.

## What changed

| Before                                                                                                                       | Now                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 19 items in one list; Branding, Alert routing, Plan, Invoices, API keys, Webhooks and WhatsApp sat between Payments and Team | Home and Alerts, then three groups: Operate (Sites, Chargers, Sessions, Drivers), Business (Tariffs, Payments, Reports, Invoices) and Workspace (Team, Audit log, Settings). Every item keeps its permission check                         |
| The settings pages were seven items of the side menu                                                                         | One Settings item. Settings has its own menu: Branding, Alert routing, WhatsApp charging, Plan and usage, Managed service, then API keys and Webhooks under Developers. Invoices moved to Business and keeps its address under `/settings` |
| A toolbar with the name, the workspace as a select, the managed badge, the bell and your name                                | The workspace is a card at the head of the side menu, with its plan and a menu to switch. The top bar shows where you are ("Operate › Chargers"), the managed badge, the bell with a dot for unread, help and your initials                |
| The suspended and managed-offer banners were colored boxes                                                                   | Notices with an icon, red for a suspended account and blue for an offer                                                                                                                                                                    |
| Home: six tiles for the last 24 hours and a "You are signed in" card                                                         | A greeting, the period (today, 7 or 30 days) and a site, four KPI cards against the previous period, the fleet by its coordinates, the open alerts, energy per day and the busiest sites. Export downloads the usage report as CSV         |
| Alerts: toggle buttons and a table; `/alerts/{id}` highlighted a row of the list                                             | Tabs with counts, the table in a card with a severity chip, and "Who gets which alert" from the alert routing. `/alerts/{id}` is the alert's own page: what happened, a timeline, the charger and who is on it                             |
| The workspace picker, the no-workspace page and the invitation were Material cards                                           | The look of the sign-in pages (module 21): the logo over one card. The picker shows each company's initials and marks the one used last                                                                                                    |
| On a narrow screen the side menu stayed open beside the page                                                                 | Below 960px it slides in over the page from a menu button in the top bar                                                                                                                                                                   |

## Before and after

The same pages with the same data, before this module and after it (the API was stubbed for the pictures, at 1440 by 960 and, for the last pair, 820 by 1180).

| Before                                                                  | After                                                                 |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------- |
| ![Home before](images/22-before-home.png)                               | ![Home after](images/22-after-home.png)                               |
| ![Alerts before](images/22-before-alerts.png)                           | ![Alerts after](images/22-after-alerts.png)                           |
| ![An alert's link before](images/22-before-alert-detail.png)            | ![An alert's link after](images/22-after-alert-detail.png)            |
| ![Settings before](images/22-before-settings.png)                       | ![Settings after](images/22-after-settings.png)                       |
| ![Workspace picker before](images/22-before-workspace-picker.png)       | ![Workspace picker after](images/22-after-workspace-picker.png)       |
| ![No workspace before](images/22-before-no-workspace.png)               | ![No workspace after](images/22-after-no-workspace.png)               |
| ![Invitation before](images/22-before-invitation.png)                   | ![Invitation after](images/22-after-invitation.png)                   |
| ![Suspended and managed before](images/22-before-suspended-managed.png) | ![Suspended and managed after](images/22-after-suspended-managed.png) |
| ![Tablet before](images/22-before-tablet.png)                           | ![Tablet after](images/22-after-tablet.png)                           |

## How the pieces fit

```
ShellComponent (layout/shell)          mat-sidenav: side below 960px is "over"
├─ SideMenuComponent                   PortalMenu.groups(permissions), the active item from the URL
│  ├─ LogoComponent (packages/ui)
│  └─ TenantSwitcherComponent          the workspace, its plan, a menu to switch (reloads the page)
├─ TopBarComponent                     PageLocation.of(url, workspace, PageTitleService.detail)
│  ├─ NotificationBellComponent        the bell; a dot while something is unread
│  └─ account menu                     Admin console (staff), Quiet hours, Log out
├─ notices                             suspended account, managed-service offer
└─ <router-outlet>
   └─ SettingsLayoutComponent          for /settings/... except invoices: SettingsMenu on the left
```

- **The menus are data.** `layout/portal-menu.ts` and `layout/settings-menu.ts` list each item's label, icon, link, test id and who may see it. The side menu and the settings menu draw those lists; `PageLocation` reads the same lists to name the page in the top bar, so a page added to a menu is named there too. `portal-menu.spec.ts` checks the groups, the Settings link and that every menu icon is registered.
- **Settings leads to the first page you may open**: Branding for most people, API keys for someone who only manages keys. It stays highlighted on every settings page but not on Invoices, which lives under `/settings/invoices` but is listed under Business. The settings routes are children of `SettingsLayoutComponent`; the invoice routes come first, outside it.
- **A page under a menu item names itself.** On `/alerts/{id}` the top bar shows "Alerts › Connector A faulted: GroundFailure": the page calls `PageTitleService.set(title)` once the alert has loaded, and the shell clears it on the next navigation. Pages that set nothing show their menu group and item, such as "Operate › Chargers" on a charger. Modules 23 and 24 give their detail pages a title the same way.
- **The shell refreshes every minute** (`ShellComponent.REFRESH_MS`): the Alerts count in the side menu and the bell. The home page refreshes its live parts (counts, sites, open alerts) on the same beat.

### The side menu

| Group      | Item      | Opens                                                | Shown with                                       |
| ---------- | --------- | ---------------------------------------------------- | ------------------------------------------------ |
|            | Home      | `/`                                                  | everyone                                         |
|            | Alerts    | `/alerts`                                            | `alerts:read`; red count of open alerts          |
| Operate    | Sites     | `/sites`                                             | `sites:read`                                     |
| Operate    | Chargers  | `/chargers`                                          | `chargers:read`                                  |
| Operate    | Sessions  | `/sessions`                                          | `sessions:read`                                  |
| Operate    | Drivers   | `/drivers`                                           | `drivers:read`                                   |
| Business   | Tariffs   | `/tariffs`                                           | `tariffs:read`                                   |
| Business   | Payments  | `/payments`                                          | `payments:read` or `settings:payments`           |
| Business   | Reports   | `/reports`                                           | `reports:read`                                   |
| Business   | Invoices  | `/settings/invoices`                                 | `invoices:read`                                  |
| Workspace  | Team      | `/team`                                              | `team:read`                                      |
| Workspace  | Audit log | `/audit-log`                                         | `audit:read`                                     |
| Workspace  | Settings  | the first settings page below that the user may open | any of them                                      |
| Settings   | …         | Branding, Alert routing, Plan and usage              | `settings:read`                                  |
| Settings   | …         | WhatsApp charging                                    | `messaging:manage`                               |
| Settings   | …         | Managed service                                      | `settings:read`, and the tenant has an agreement |
| Developers | …         | API keys, Webhooks                                   | `api_keys:manage`                                |

The Reports page still opens for `sessions:export` or `audit:read` alone, as before, though the menu lists it for `reports:read`, also as before.

### Where the home page's figures come from

| On the page                         | From                                                                                                                                           | Shown with     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Energy delivered, Sessions, Revenue | `GET /v1/reports/usage` for the period and for the period before it of the same length (today so far against yesterday up to the same time)    | `reports:read` |
| The change under each               | `HomePeriod.change`: "+12% on the previous 7 days"; nothing when the period before had none; revenue only when both periods took one currency  | `reports:read` |
| Chargers online                     | `GET /v1/reports/overview`: online out of all, and how many are offline now                                                                    | `reports:read` |
| "24 chargers on 5 sites"            | the overview and the sites list                                                                                                                | `reports:read` |
| Live fleet                          | `GET /v1/sites`: each site at its coordinates (`FleetLayout`), green, red for a problem, grey when offline; "7 charging now" from the overview | `sites:read`   |
| Open alerts                         | the first page of `GET /v1/alerts?status=open`, newest four; the count is the side menu's                                                      | `alerts:read`  |
| Energy per day                      | seven usage reports, one per day from midnight, today's up to now                                                                              | `reports:read` |
| Busiest sites                       | the period's usage report by site: the four that delivered most, as a share of all                                                             | `reports:read` |
| Export                              | `GET /v1/reports/usage/export` for the period and site, as on the Reports page                                                                 | `reports:read` |

The site picker narrows every usage figure, the chart and the export to one site; the live parts always show every site the user may see.

## Shared pieces in packages/ui

Module 20 left the page pieces to the module that first uses them. They are in `packages/ui` now, for the portal here and for the admin console and the driver app in modules 25 and 26:

| Piece                     | Use                                                                                                                                                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<ww-page-header>`        | `heading`, `subtitle`, an optional `backLink` and `backLabel`; actions go inside it, a chip beside the title with `wwTitleExtra`, a subtitle with markup with `wwSubtitle`                                                                          |
| `<ww-kpi-card>`           | `label`, `value`, `foot`, `trend` (`up`, `down`, `none`), an optional `icon` and `link`; `isAlarm` makes the value red                                                                                                                              |
| `<ww-empty-state>`        | `icon`, `heading`, `text`; what to do next goes inside it                                                                                                                                                                                           |
| `<ww-auth-page>`          | a page outside the frame in the look of the sign-in pages: the logo, one card with `heading` and `subtitle`, and a line under it with `wwAuthFoot`                                                                                                  |
| `<ww-logo>`               | the mark and "Wattwisely"                                                                                                                                                                                                                           |
| classes in `_layout.scss` | `ww-card` with `ww-card-head` (and `line`) and `ww-card-body`, `ww-kv` for labels over values, `ww-tabs` and `ww-tab`, `ww-list-item`, `ww-two` for a name over a smaller line, `ww-avatar` (`m`, `l`, `square`), `ww-overline`, `ww-page-subtitle` |
| `ww-small`                | a 32px button, for actions in cards and table rows                                                                                                                                                                                                  |
| `notice has-icon`         | a notice with an icon in front of the words                                                                                                                                                                                                         |

Links in tables, label-value lists and two-line names lose their underline until hovered, as in the screens; links in running text keep it. Sixteen icons joined `AppIcons`, among them `plug-zap` and `battery-charging` for Chargers and Sessions, which the approved menu uses.

## Where the build differs from the approved screens

- **The fleet has no streets.** The screens show a drawn map; the portal has no map tiles, and loading them would send every page view to a map provider. The pins are placed by the sites' real coordinates on a dotted background, so their places relative to each other are right; a pin that would cover another moves a row up or down.
- **Energy per day asks seven times.** The API has no daily series, so the chart asks the usage report once for each of the last seven days. A daily series in `GET /v1/reports/overview` would make it one request; the chart sits in its own component for that day.
- **The alert page has no Close, Reset or Unlock button.** The platform closes an alert itself when the charger reports the problem gone, and the API has no way to close one by hand. Reset and unlock stay on the charger page, one click away through "Open charger"; a stuck session is closed by hand on its session page, which "Open session" leads to.
- **"Who was told" became "Who is on it".** The API does not keep who was e-mailed about each alert. The card shows who acknowledged it, when and their note; the alerts page shows who gets which kind of alert from the routing rules.
- **Quiet hours are not a column** of "Who gets which alert": they belong to each member (account menu, Quiet hours), not to a rule.
- **The account sits in the top bar only.** The screens also show it at the foot of the side menu; one place is enough, and it keeps one Log out with one test id.
- **Help needs an address.** The help button leads to `PORTAL_HELP_URL` (`helpUrl` in `config.json`), such as your help centre, and is hidden while that is empty. `deploy/.env.example` and `docker-compose.yml` pass it through.
- **Settings pages keep their own titles** until module 24 redesigns them; this module adds the settings menu around them.

## Design decisions

- **The frame keeps Material's sidenav.** It gives the slide-in menu on narrow screens, focus handling and the backdrop for free; the side menu inside it is plain links styled as in the screens, since Material's list items have a different shape and height.
- **Switching workspace still reloads the page**, as in module 1, so nothing of the previous company stays on screen. The picker after sign-in does not need to, as nothing has loaded yet.
- **Company initials and colors are stable.** `Initials.of` takes the first letter of each word and the capitals inside one ("VoltHub" as VH); `Initials.toneOf` picks one of four theme colors from the company's id, so a company has the same square everywhere.
- **Times read as a list does.** `DayLabel` writes "09:06" over "Today", "Yesterday" or "26 Oct", by the calendar rather than by 24 hours.

## How it was checked

`prettier --check .` and `nx run-many -t lint test build` pass. New specs cover the menus and the page names (`portal-menu.spec.ts`), the home periods and changes (`home-period.spec.ts`), the fleet layout (`fleet-layout.spec.ts`), the alert timeline and the routing summary, `Initials` and `DayLabel`; the icon spec checks the new icons. The screenshots above were taken with Playwright against the built portal with the API stubbed, at 1440 and 820 wide, including the suspended account, the managed badge, the managed-service offer and the account menu.

## Read the code in this order

1. `apps/portal/src/app/layout/portal-menu.ts`, `settings-menu.ts` and `menu-item.ts`: the menus as data.
2. `layout/shell.component.*`, `side-menu.component.*`, `top-bar.component.*` and `tenant-switcher.component.*`: the frame.
3. `layout/page-location.ts` and `page-title.service.ts`: the top bar's "where you are".
4. `features/settings/settings-layout.component.ts` and `settings.routes.ts`: the settings menu.
5. `features/home/home.store.ts`, `home-period.ts`, `home-figures.ts`, then the cards: `fleet-card`, `open-alerts-card`, `energy-chart`, `busiest-sites`.
6. `features/alerts/alerts.component.*`, `alert.component.*`, `alert-timeline.ts`, `alert-routing-summary.ts`, `alert-severity.ts`.
7. `features/tenant-picker`, `no-workspace` and `invitation`, on `<ww-auth-page>`.
8. `packages/ui/src/lib/page-header`, `kpi-card`, `empty-state`, `auth-page`, `logo`, and `packages/ui/src/styles/_layout.scss`.

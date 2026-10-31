# Module 23: portal sites, chargers, sessions and drivers

The Operate half of the portal gets the look of the approved screens. **Sites open on a map** of where they are, with a tile per site and a list view beside it; **a site, a charger and a session each get a page in two columns**, the facts on the left and the details on the right; **chargers, sessions and drivers are tables in a card** with tabs and a filter row over them; and load management, refunds, RFID cards and access groups follow the same pattern.

URLs, permissions and `data-testid` attributes stay as they were. Every page still reads the same endpoints; the one addition the API sees is a `driver_id` filter on the sessions list, which `GET /v1/sessions` already took.

Stories covered: Olivia opens Sites and sees her five sites on a map, the busy one amber and the faulted one red, then switches to the list to sort out which are private; Tom opens a charger, sees each connector with what it is doing and for how long, reads the message log and restarts it; Sam, at a depot, sets the site limit and the minimum per car on the load management page and sees each charger's cap; Olivia opens a session a driver complains about, sees the energy, the timeline and the receipt, and refunds part of it; a fleet manager opens a driver, adds an RFID card and checks the last five charges; an Owner opens Access groups to see which private sites each group opens and who pays.

## What changed

| Before                                                                                             | Now                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sites: a title, three outlined fields and a table                                                  | "5 sites · 24 chargers · 26 connectors free now", Map and List views, a filter row in a card. The map shows each site at its coordinates, colored by state, with a tile per site: free connectors as a bar and "3 of 8 free", or why not                                                                   |
| A site: a title and the chargers as a table, the load management link at the bottom                | The address, time zone, hours, power limit and tariff under the title; Edit site, Load management and Register charger beside it. Connectors on the left, one row each with plug, state and the session on it; on the right today's figures, the map and the location                                      |
| Load management: a form over a table                                                               | Four figures (in use now of the limit, cars charging, headroom, caps applied), the policy in a side card with a switch, the limit, the minimum and the sharing as choices, and the chargers' caps as bars with why each has its cap                                                                        |
| Chargers: a table under outlined fields                                                            | Tabs (All, Online, Charging, Offline, Faulted), a filter row with search and site, and a table with the model under the ID, free connectors, last seen, OCPP version and security. "No password" is an amber chip                                                                                          |
| A charger: two cards of facts, connector cards, recent commands, and the OCPP messages folded away | Status, site and model in the header with QR codes, Edit and Restart; every other command in one menu. A card per connector with its session, energy and money so far, or how long it has been free. Tabs for the message log (All, In, Out, Errors), the commands, the details and the charger's sessions |
| Register a charger and its QR codes: Material dialogs                                              | The same steps in the new dialog style; the setup values each in a box with a copy button, and QR codes laid out as stickers ("Scan to charge · Plug A")                                                                                                                                                   |
| Sessions: a row of outlined fields, a table                                                        | A filter row in a card (period, site, status, "Needs a look"), a table with the site and connector over the charger, the driver and their payment rule, energy, duration, total, payment and status; flags show as a red flag                                                                              |
| A session: three cards, then the receipt, the energy chart and the timeline as a list              | "Session 8812" with Refund in the header; four figures (energy with the meter readings, duration, peak and average power, total); then energy, a timeline with colored dots and the receipt on the left, price, payment and charger on the right                                                           |
| Refund: a Material dialog                                                                          | "Up to £8.80 can be refunded to the card ending 4242", the amount after a £ sign, the reason, a notice about approval over £100.00, and a button that says "Refund £4.40"                                                                                                                                  |
| Drivers: a table under outlined fields                                                             | Tabs (All, Active, Blocked), a filter row with search and access group, and a table with e-mail under the name, reference, groups as chips, cards, who pays, last charge and status                                                                                                                        |
| A driver: three cards over two tables; Register card and a menu in the header                      | E-mail, reference and "driver since" under the name; Edit, Block or Unblock, and a menu with Delete. RFID cards and the last five charges on the left (Add card on the cards); profile and Wattwisely account on the right                                                                                 |
| Access groups: a table with Edit and Delete in each row                                            | A table in a card with what each group opens, how many drivers, who pays and the hold per session; Edit beside each group and Delete in its menu                                                                                                                                                           |

## Before and after

The same pages with the same data, before this module and after it (the API was stubbed for the pictures, at 1440 wide and, for the last pair, 820 by 1180). The list view of the sites is new, so its "before" is the only view there was.

| Before                                                              | After                                                             |
| ------------------------------------------------------------------- | ----------------------------------------------------------------- |
| ![Sites before](images/23-before-sites.png)                         | ![Sites after](images/23-after-sites.png)                         |
| ![Sites as a list before](images/23-before-sites-list.png)          | ![Sites as a list after](images/23-after-sites-list.png)          |
| ![A site before](images/23-before-site-detail.png)                  | ![A site after](images/23-after-site-detail.png)                  |
| ![Load management before](images/23-before-load-management.png)     | ![Load management after](images/23-after-load-management.png)     |
| ![Chargers before](images/23-before-chargers.png)                   | ![Chargers after](images/23-after-chargers.png)                   |
| ![A charger before](images/23-before-charger-detail.png)            | ![A charger after](images/23-after-charger-detail.png)            |
| ![Register a charger before](images/23-before-register-charger.png) | ![Register a charger after](images/23-after-register-charger.png) |
| ![Sessions before](images/23-before-sessions.png)                   | ![Sessions after](images/23-after-sessions.png)                   |
| ![A session before](images/23-before-session-detail.png)            | ![A session after](images/23-after-session-detail.png)            |
| ![Refund before](images/23-before-refund.png)                       | ![Refund after](images/23-after-refund.png)                       |
| ![Drivers before](images/23-before-drivers.png)                     | ![Drivers after](images/23-after-drivers.png)                     |
| ![A driver before](images/23-before-driver-detail.png)              | ![A driver after](images/23-after-driver-detail.png)              |
| ![Access groups before](images/23-before-access-groups.png)         | ![Access groups after](images/23-after-access-groups.png)         |
| ![Register a card before](images/23-before-card-dialog.png)         | ![Register a card after](images/23-after-card-dialog.png)         |
| ![New access group before](images/23-before-group-dialog.png)       | ![New access group after](images/23-after-group-dialog.png)       |
| ![Sites on a tablet before](images/23-before-sites-tablet.png)      | ![Sites on a tablet after](images/23-after-sites-tablet.png)      |

## How the pieces fit

```
features/sites
├─ sites.component                 Map or List (a signal), filters, SiteMapComponent and tiles
├─ site.component                  SiteConnectors.rows: one row per connector
│  └─ SiteTodayComponent           today's usage report for the site (reports:read)
└─ load-management                 LoadFigures.of(view): headroom, waiting, caps applied
features/chargers
├─ chargers.component              ChargerTabs: each tab is a list of statuses for the API
├─ charger.component               header, setup card, connectors, tabs
│  ├─ ConnectorCardComponent       one connector: its session, or how long it has been free
│  ├─ ChargerActivityComponent     the message log or the commands, as a table
│  └─ ChargerDetailsComponent      connection and what the charger reported
└─ qr-codes, register-charger, setup-card
features/sessions
├─ sessions.component              charger_id or driver_id from the link narrow the list
└─ session.component               SessionFigures for the four figures
   ├─ EnergyChartComponent, ReceiptComponent
   ├─ SessionPaymentComponent      the card payment and its refunds
   └─ SessionChargerComponent      charger, connector, card, how it started and stopped
features/drivers
├─ drivers.component               tabs by status, filter by group
├─ driver.component                header, profile
│  ├─ DriverCardsComponent         RFID cards: add, block, report lost, reactivate, who pays
│  ├─ DriverChargesComponent       the newest five, and "All sessions"
│  └─ DriverAccountCardComponent   the driver's Wattwisely account
└─ access-groups.component         the groups, the dialog to add or change one
shared/site-map                    SiteMapComponent and SiteMapLayout, for Home and Sites
```

- **The map is shared.** Module 22 drew the fleet on Home; `SiteMapComponent` (in `shared/site-map`) now draws it there, on the Sites page with a legend, and on a site's page with a single pin. `SiteMapLayout` places the pins by coordinates and picks each one's color: green with a connector free, amber when all are in use, red for a problem, grey when offline.
- **Tabs are filters.** The Chargers tabs are `ChargerTabs.TABS`: "Online" asks the API for available, charging, faulted and unavailable chargers in one request, "Offline" for offline and waiting. The Drivers tabs send `status`. Neither adds an endpoint.
- **The figures are small classes with specs.** `LoadFigures`, `SessionFigures`, `ChargerTabs`, `SiteConnectors` and `DurationLabel` turn API answers into the words and numbers on the page, so the components only lay them out.
- **The charger's tabs share one live feed.** `ChargerActivityStore` follows the charger's events for the whole page, as before, so the message log and the commands are two views of it, the "Live" chip says so, and switching tabs asks the API for nothing. The Sessions tab is a link to `/sessions?charger_id=…`; the driver's "All sessions" is `/sessions?driver_id=…`. The sessions page shows "One charger only" or "One driver only" with a "Show all" button.

## Shared pieces in packages/ui

`_controls.scss` is new, with the controls of the screens that are smaller than Material's; module 24 and the admin console use the same classes.

| Class                              | Use                                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------- |
| `ww-toolbar`, `ww-spacer`          | the filter row over a list, in a card or on its own                                           |
| `ww-field`                         | a 36px box: around a search input with its icon, or on a `mat-select`, with no floating label |
| `ww-seg`, `.on`                    | a segmented switch: Map and List, the message log's All, In, Out, Errors                      |
| `ww-progress`, `.warn`, `.danger`  | a thin bar whose `<i>` is as wide as the share                                                |
| `ww-tile`, `.on`                   | a card that is a link, as the site tiles                                                      |
| `ww-card-foot`                     | the line under a table: how many are shown and "Show more"                                    |
| `ww-num`, `ww-faint`               | a right-aligned number column; a dash or a "never" in a lighter color                         |
| `ww-kpis` (`.three`)               | four KPI cards in a row, two below 1000px, one below 480px                                    |
| `ww-columns`, `ww-main`, `ww-side` | a page in two columns; the side one is 340 to 420px and drops below the main one under 900px  |
| `ww-danger`                        | an outlined button for a step that takes something away, such as Block                        |

`_layout.scss` gains `.wide` in a `ww-kv` list, for a value as wide as the card, and keeps IDs in table cells (`.mono`) on one line. `AppIcons` gains `gauge`, `lock-open` and `play`. Home and the alert page moved onto `ww-seg`, `ww-kpis` and `ww-columns`, so their own copies of these rules are gone.

## Where the build differs from the approved screens

- **The maps have no streets.** As on Home (module 22), the pins sit at the sites' coordinates on a dotted background; there are no map tiles.
- **A site has no QR codes card.** The screens show a QR sticker preview and "Print QR stickers" on the site; the QR codes stay on each charger, in its QR codes dialog, where they can be printed.
- **"Power now" is not shown** on the site's connectors or the chargers list: the API has no live power per connector. The site shows the session's energy and duration instead, and the chargers list shows how many connectors are free.
- **The Chargers tabs have no counts**, and there is no Export, no OCPP version filter and no "More filters": the API has no count by status, and these filters do not exist yet.
- **A charger has no Configuration or Boot history tab.** The API keeps neither; its tabs are the message log, the commands, the details and a link to its sessions. "Start a charge" is on each connector card, since a remote start names the connector.
- **Sessions cannot be searched by driver e-mail or filtered by stop reason**, and there are no totals for the filter: the API has none of them. The period is a choice of today, the last 7 days or the last 30 days instead of a date range.
- **The session's chart is energy, not power bars.** The meter values give energy delivered over time; the peak and average power are in the figure above it.
- **A refund's reason is typed**, not picked from a list, and there is no separate note for the audit log: the API takes one free-text reason, which the driver sees. Load management's button says "Save and apply", since saving sends the caps to the chargers.
- **Drivers have no Invited tab, Paying filter or Invite driver button.** The API filters drivers by status (active or blocked) and group only, and an invitation is sent to a driver who already exists, from their page. There is no "Show personal details" button and no unpaid notice: personal data is shown by role, and the API has no unpaid balance per driver.
- **Access groups are edited in a dialog**, as before, instead of a panel beside the table: the dialog also picks the group's drivers, which the panel did not show.

## Design decisions

- **A page reads what it shows.** The site page asks for today's usage report only when the person may read reports; the driver page asks for sessions only with `sessions:read`, and the access groups page asks for the payment account's currency only with `payments:read` (GBP otherwise, as the group dialog does).
- **Card actions moved into menus.** Block, Report lost and Reactivate were three buttons in each card's row; they are now in a menu, next to the menu for who pays with the card, so the table fits beside the side column.
- **Dates read the same everywhere.** `DurationLabel.ago` writes "34 min ago", "3 h ago", then "26 Oct" in that order of day and month whatever the browser's language, as the date pipe does in the tables.
- **The duration says what it measured**: until the car left when the charger reported it, until the charge stopped otherwise, and "Still going" while it runs.

## How it was checked

`prettier --check .` and `nx run-many -t lint test build` pass. New specs cover the charger tabs, the site map layout (including a site with every connector in use), the load figures, the session figures, `DurationLabel` and `Money.symbol`. A script compared every `data-testid` in the portal before and after: none was lost. The screenshots above were taken with Playwright against the built portal with the API stubbed, at 1440 and 820 wide, including the dialogs for registering a charger, a refund, a card and an access group.

## Read the code in this order

1. `packages/ui/src/styles/_controls.scss`: the classes every page here uses.
2. `apps/portal/src/app/shared/site-map/`: the map, then `features/sites/sites.component.*`, `site.component.*`, `site-connectors.ts` and `site-today.component.ts`.
3. `features/sites/load-management/load-figures.ts`, then `load-management.component.*`.
4. `features/chargers/charger-tabs.ts` and `chargers.component.*`; then `charger.component.*`, `connector-card.component.*`, `charger-activity.component.*` and `charger-details.component.ts`.
5. `features/sessions/session-figures.ts`, `session.component.*`, `session-payment.component.*`, `session-charger.component.ts`; then `sessions.component.*` and `features/payments/refund-dialog.component.ts`.
6. `features/drivers/drivers.component.*`, `driver.component.*`, `driver-cards.component.*`, `driver-charges.component.ts`, `driver-account-card.component.*` and `access-groups.component.*`.

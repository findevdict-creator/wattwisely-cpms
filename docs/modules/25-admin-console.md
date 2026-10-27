# Module 25: admin console redesign

The staff console gets the look of the approved screens and stops being a second app with its own frame. **It has the portal's frame**: a side menu with Overview and Tenants, then Plans, Staff, Invoices and the audit log under "Platform"; a top bar that says where you are, links to the tenant portal and holds your account. **A dark "Staff console" chip under the logo** tells staff which of the two apps they are in, since both now wear the same colours. **Every page is a header and cards**: tables in cards with a filter row and a foot, a tenant as two columns of cards, an invoice as lines and totals with who it is billed to beside them. **The 14 dialogs share one layout**: a lead line under the title, the fields in one column or in pairs, and Cancel with the main button at the end.

URLs, permissions and `data-testid` attributes stay as they were. Every page reads the same endpoints; nothing in the API changed. One setting is new: `portalUrl` in the console's `config.json`, for the "Tenant portal" link.

Stories covered: Jordan opens the console, sees how many tenants are active, on trial or suspended, and opens the suspended ones; Jordan creates a tenant on a trial and invites its first Owner; Sam opens Acme Charging, reads its plan, usage and modules on one page, switches a module on as a trial and assigns a Managed operator; Sam opens Acme's service report for last month; Maya opens Invoices, narrows them to September, opens a draft, adds a credit line and issues it; an Admin adds a colleague as Support and reads what each role may do beside the list; someone without a staff role signs in and is sent to the tenant portal.

## What changed

| Before                                                                                      | Now                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A top toolbar with "Wattwisely Admin", two chips and your name; a list of links on the left | The portal's frame. The side menu has the logo, the dark "Staff console" chip, the pages in two groups and your name with your role at the bottom. The top bar says where you are ("Tenants › Acme Charging"), links to the tenant portal and opens your account menu with Log out. Below 960px the menu slides in over the page             |
| Overview: four tiles and a plans table                                                      | Four figures (tenants with active, trial and suspended; connectors AC and DC; chargers and sites; staff), "Tenants by state" as bars that open the list filtered to that state, and "Plans in use" beside it. "New tenant" is in the header                                                                                                  |
| Tenants: outlined fields over a bare table                                                  | A card with a search, a plan and a state filter in its toolbar, the tenant on two lines (name, short name and country), the plan with the subscription state when it is not active, usage on two lines, the state as a chip, and "Show more tenants" in the foot                                                                             |
| A tenant: a title, an Actions menu and four Material cards in a grid, then a modules table  | A header with the state chip, the short name, country, payments and since, and "Edit details". On the left: plan and billing as label and value pairs, the modules as a table with fees and states, the invoices as a table. On the right: the managed service, the Owners with avatars, and "Suspend or delete" with the buttons themselves |
| Service report: inline figures and a bare table                                             | Five figures in cards (faults in red when there are any), the chargers as a table in a card with faults as red chips, the tariff changes as a list, and the month picker in the header                                                                                                                                                       |
| Plans: two bare tables under headings                                                       | Two cards: plans with platform fee, per AC, per DC, revenue share, limits with the modules on a second line, tenants and "On sale"; add-ons with the price and the state                                                                                                                                                                     |
| Staff: a table, then roles as a list of terms                                               | The staff as a table with avatars, the role as a chip (Admin dark), since and a menu; the roles in a card beside it                                                                                                                                                                                                                          |
| Invoices: a hint, outlined fields and a bare table                                          | A card with a month and a state filter, the invoice and the tenant on two lines, due or paid, the total with its tax, the state, and a foot that says when the tenant sees it                                                                                                                                                                |
| An invoice: facts, two Material cards and a lines table                                     | The number in mono with its state; "Actions" in the header. The lines in a card with the net, tax and total under them and the remarks below; "Billed to" and a history (drafted, issued and e-mailed, paid, voided) beside it                                                                                                               |
| Audit log: an outlined field and a bare table                                               | A card with the tenant filter in its toolbar, who on two lines (the person, then staff, support, tenant team, API key or Wattwisely), the action in mono, and the way to the tenant                                                                                                                                                          |
| Not staff: a Material card                                                                  | The sign-in page's look: the logo with the Staff console chip, one card with the e-mail you are signed in with, "Go to the tenant portal" and "Sign in with another account"                                                                                                                                                                 |
| 14 dialogs, each laid out its own way                                                       | A lead line under the title, the fields in one column or in pairs, hints only where they help, warnings as amber notices, errors as red ones, and the main button on the right                                                                                                                                                               |

## Before and after

The same pages with the same data, before this module and after it (the API was stubbed for the pictures, at 1440 wide and, for the last pair, 820 by 1180).

| Before                                                                       | After                                                                      |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| ![Overview before](images/25-before-overview.png)                            | ![Overview after](images/25-after-overview.png)                            |
| ![Tenants before](images/25-before-tenants.png)                              | ![Tenants after](images/25-after-tenants.png)                              |
| ![A tenant before](images/25-before-tenant.png)                              | ![A tenant after](images/25-after-tenant.png)                              |
| ![A suspended tenant before](images/25-before-tenant-suspended.png)          | ![A suspended tenant after](images/25-after-tenant-suspended.png)          |
| ![Service report before](images/25-before-service-report.png)                | ![Service report after](images/25-after-service-report.png)                |
| ![Plans before](images/25-before-plans.png)                                  | ![Plans after](images/25-after-plans.png)                                  |
| ![Staff before](images/25-before-staff.png)                                  | ![Staff after](images/25-after-staff.png)                                  |
| ![Invoices before](images/25-before-invoices.png)                            | ![Invoices after](images/25-after-invoices.png)                            |
| ![A draft invoice before](images/25-before-invoice-draft.png)                | ![A draft invoice after](images/25-after-invoice-draft.png)                |
| ![An issued invoice before](images/25-before-invoice.png)                    | ![An issued invoice after](images/25-after-invoice.png)                    |
| ![Audit log before](images/25-before-audit-log.png)                          | ![Audit log after](images/25-after-audit-log.png)                          |
| ![Not staff before](images/25-before-not-staff.png)                          | ![Not staff after](images/25-after-not-staff.png)                          |
| ![New tenant before](images/25-before-new-tenant.png)                        | ![New tenant after](images/25-after-new-tenant.png)                        |
| ![Edit a tenant before](images/25-before-edit-tenant.png)                    | ![Edit a tenant after](images/25-after-edit-tenant.png)                    |
| ![Suspend a tenant before](images/25-before-suspend-tenant.png)              | ![Suspend a tenant after](images/25-after-suspend-tenant.png)              |
| ![Plan and billing before](images/25-before-subscription.png)                | ![Plan and billing after](images/25-after-subscription.png)                |
| ![Switch a module on before](images/25-before-module.png)                    | ![Switch a module on after](images/25-after-module.png)                    |
| ![Managed service terms before](images/25-before-managed-service-dialog.png) | ![Managed service terms after](images/25-after-managed-service-dialog.png) |
| ![Assign an operator before](images/25-before-assign-operator.png)           | ![Assign an operator after](images/25-after-assign-operator.png)           |
| ![Invite an Owner before](images/25-before-invite-owner.png)                 | ![Invite an Owner after](images/25-after-invite-owner.png)                 |
| ![Edit a plan before](images/25-before-plan-dialog.png)                      | ![Edit a plan after](images/25-after-plan-dialog.png)                      |
| ![Edit an add-on before](images/25-before-addon-dialog.png)                  | ![Edit an add-on after](images/25-after-addon-dialog.png)                  |
| ![Add staff before](images/25-before-add-staff.png)                          | ![Add staff after](images/25-after-add-staff.png)                          |
| ![Draft an invoice before](images/25-before-draft-invoice.png)               | ![Draft an invoice after](images/25-after-draft-invoice.png)               |
| ![Add a line before](images/25-before-adjustment.png)                        | ![Add a line after](images/25-after-adjustment.png)                        |
| ![Issue an invoice before](images/25-before-issue-invoice.png)               | ![Issue an invoice after](images/25-after-issue-invoice.png)               |
| ![Mark paid before](images/25-before-pay-invoice.png)                        | ![Mark paid after](images/25-after-pay-invoice.png)                        |
| ![Tenants at 820 wide before](images/25-before-tenants-tablet.png)           | ![Tenants at 820 wide after](images/25-after-tenants-tablet.png)           |

## How the pieces fit

```
layout
├─ admin-menu.ts                 the menu as data: which items a role sees, which one is on,
│                                and where you are ("Platform › Plans", "Tenants › Acme")
├─ page-title.service.ts         a page under a menu item names itself for the top bar
├─ shell.component               mat-sidenav, side or over below 960px; clears the title on
│                                every navigation
├─ side-menu.component           logo, Staff console chip, AdminMenu.visible, you and your role
└─ top-bar.component             the crumb, "Tenant portal" (portalUrl), the account menu
features
├─ overview                      KPI cards, tenants by state, plans in use
├─ tenants
│  ├─ tenants.component          card toolbar and table; ?new=1 opens "New tenant"
│  ├─ tenant.component           header, two columns, "Suspend or delete"; sets the title
│  ├─ tenant-plan, tenant-modules, tenant-invoices        the left column
│  ├─ tenant-managed-service, tenant-owners              the right column
│  └─ service-report.component   figures, chargers, tariff changes
├─ plans, staff, audit-log       a header and cards
├─ invoices
│  ├─ invoices.component         month and state filters in the card
│  ├─ invoice.component          lines and totals; the Actions menu; sets the title
│  └─ invoice-history.component  drafted, issued, paid, voided
└─ not-staff                     AuthPageComponent with the Staff console chip
shared/initials.ts               "JS" for Jordan Smith, for the avatars
```

- **The menu is data.** `AdminMenu.GROUPS` lists each item with its icon, link, test ID and the permission it needs; the side menu shows `AdminMenu.visible(can)`, and the top bar's crumb is `AdminMenu.where(url, detail)`. A page under an item, such as one tenant or one invoice, sets `detail` through `PageTitleService` once it has loaded, and the shell clears it when the user moves on, so the crumb never shows the last page's name. The nav test IDs (`nav-tenants`, `nav-plans`, `nav-staff`, `nav-invoices`) come from the list; Overview and the audit log gained `nav-overview` and `nav-audit-log`.
- **A tenant is two columns, not tabs.** Plan and billing, the modules and the invoices are on the left; the managed service, the Owners and "Suspend or delete" on the right, and each is its own component as before. Everything a staff member checks before a change is on one page.
- **"Suspend or delete" is a card.** The suspend, reactivate and delete buttons that sat in the Actions menu are in it, with what each does; Delete is there but off until the tenant is suspended. The card carries `tenant-actions`, and "Edit details" moved to the header as its own button (`edit-tenant`).
- **"New tenant" on the overview** links to `/tenants?new=1`; the tenants page opens the dialog once its plans have loaded and takes the parameter off the address, so going back does not open it again.
- **The service report names the tenant.** It asks for the tenant's name for the way back and the top bar; the report shows without it.

## Shared pieces in packages/ui

- `_layout.scss` gains the dialog layout: `ww-lead` for the line under a dialog's title, and `ww-form` for its fields, one under the other or, with `.two`, in pairs, where `.wide` takes the whole row. Pairs fall back to one column below 600px.
- `AuthPageComponent` takes something beside the logo through `wwAuthBrand`, which the console uses for its chip. The portal's pages, which put nothing there, look as before.

## Where the build differs from the approved screens

- **No tabs on a tenant, and no support sessions or "Open support access".** The console cannot open a tenant for support, and the API keeps no support sessions to list; with the rest on one page, tabs would hide what is already short.
- **No staff notes card on a tenant.** Notes belong to the subscription in the API and are edited in "Plan and billing", where they are shown too, marked as never shown to the tenant.
- **No VAT number or Stripe account in the details.** The API has a billing reference ("VAT or purchase order number"), which is shown, and does not give the tenant's Stripe account to the console.
- **The overview has no second row of figures and no "Tenants to look at".** The API gives counts only, with no connection rates, command success, payment failures or queue depth; "Tenants by state" takes the place of the list and opens the suspended or trial tenants in one click.
- **The tenants table has no Payments column and no "Managed only" filter**, and the list has no currency: the list endpoint gives none of them. Pages are "Show more", not numbered, since the API pages by cursor.
- **Plans have no "New add-on" button and no Beta state**; add-ons are a fixed list in the API, each sold or not.
- **The staff table has no two-step sign-in column and no "Change role" button.** Staff sign in through single sign-on, which the API does not report on; changing the role is in the row's menu with removal, as before.
- **Invoices have no figures over the table, no Export and no Plan column**, and an invoice has no "E-mail again", PDF or card payment: the API has no totals per month, no export, no resend and no payments by card for Wattwisely's invoices.
- **The audit log has no date, staff or action filters and no reason column.** The API filters by tenant only and keeps the action and its target.
- **No "PDF for the tenant" on the service report.** The tenant reads the same report in the portal.

## Design decisions

- **Same frame, other chip.** The console no longer has its own violet or its own bar; it looks like the portal so staff find their way, and the dark chip under the logo, on the not-staff page too, says which app they are in.
- **Actions stay where the data is.** The plan's Change, the module menus, Assign operator, Invite an Owner and Draft an invoice are in the head or foot of their card; the header holds only what concerns the whole tenant or invoice.
- **The invoice keeps its Actions menu.** Issue, add a line, work the fee lines out again, mark paid and void depend on the state, and most of them are rare; one menu keeps the header calm and the test IDs where they were.
- **Dialogs are laid out by one class.** `ww-form` replaced a grid or a column written into each of the 14; the fields stretch to the dialog, pairs start at the top so a hint under one field does not stretch its neighbour, and a currency or a percent is a suffix in the field rather than in its label.
- **Regions are country codes.** The edit and create dialogs say "Two letters, such as IE or DE", which is what the API checks.

## How it was checked

`prettier --check .` and `nx run-many -t lint test build` pass. New specs cover `AdminMenu` (what a billing role sees, which item is on, and where you are) and `Initials`. A script compared every `data-testid` in the console before and after: none was lost (the nav IDs are now set from `AdminMenu`), and `edit-tenant`, `menu`, `where`, `nav-overview` and `nav-audit-log` are new. The screenshots above were taken with Playwright against the built console with the API stubbed, at 1440 and 820 wide.

## Read the code in this order

1. `layout/admin-menu.ts` and its spec; then `shell.component.*`, `side-menu.component.*` and `top-bar.component.*`.
2. `features/overview/overview.component.*` and `features/tenants/tenants.component.*`.
3. `features/tenants/tenant.component.*`, then the cards it holds: `tenant-plan`, `tenant-modules`, `tenant-invoices`, `tenant-managed-service` and `tenant-owners`; then `service-report.component.*`.
4. `features/invoices/invoices.component.*`, `invoice.component.*` and `invoice-history.component.ts`.
5. `features/plans`, `features/staff` and `features/audit-log`; then `features/not-staff/not-staff.component.ts`.
6. Any one dialog, such as `features/tenants/new-tenant-dialog.component.html`, with `ww-form` in `packages/ui/src/styles/_layout.scss`.

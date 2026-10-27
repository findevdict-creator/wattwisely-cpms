# Module 24: portal business, team and settings screens

The Business and Workspace halves of the portal get the look of the approved screens. **Tariffs read as prices**, not as forms: the list says what a driver pays, the editor shows what drivers see and lets you try a session beside the form, and a proposal shows now against proposed, line by line. **Payments, reports and invoices are cards with tables**, with the figures that matter over them; **the team and its roles are a table and a matrix**; **the audit log has a detail panel**; and **the seven settings pages share one header** with a line under it that says what the page is for.

URLs, permissions and `data-testid` attributes stay as they were. Every page reads the same endpoints; nothing in the API changed.

Stories covered: Olivia opens Tariffs, sees a price change waiting from the managed team, reads it as "Peak, Mon–Fri 17:00–21:00: £0.40 now, £0.45 proposed, +12.5%" and approves it; Maya opens Payments, approves a refund in the queue and filters the card payments to the refused ones; Olivia opens Reports, sees which sites are busiest and which chargers were offline longest, and downloads the CSV; the finance team opens an invoice from Wattwisely and prints it; an Owner opens Roles, picks "Technician" and reads what it may do area by area; Sam opens the audit log, picks an entry made by Wattwisely and sees who, from where and on what; an Owner changes the brand colour and is told white text on it is too faint for small type; Tom checks the WhatsApp number and reads a driver's chat; a developer makes an API key, copies it from the page once, and checks a webhook's failed deliveries.

## What changed

| Before                                                                      | Now                                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tariffs: a table of names with an Edit button                               | Tabs (In use, Archived, Proposals) and a table that says the prices: "£0.40 per kWh Peak" over the other windows, the time and idle fees, the start fee, the sites and the version. A blue notice says how many price changes are waiting, with Review                         |
| A tariff: one long form                                                     | Cards for the prices per session, the time windows, the idle fee and the note; on the right what drivers see, "Try a session" priced by the real engine, and the price history. The header says which version is in force and what saving makes                                |
| Tariff proposals: a table; a proposal: a form and a dialog                  | The waiting ones as cards, each with the note, the comparison (now, proposed, change) and Approve or Reject in the foot; the decided ones as a table under their own tab. A proposal's page has the same card with fees, limits and time windows beside it                     |
| Payments: the Stripe account and two tables, each under a heading           | A Stripe account card with its state, the holds and its three buttons; "Refunds waiting for approval" with the count; card payments in a card with a status filter in its head, a short "Needs a look" chip, and "Show older payments" in the foot                             |
| Reports: three sections one under the other                                 | Tabs (Usage, Exports, Scheduled). Usage has a filter row, four figures, the busiest sites and the chargers offline longest as bars, and the table with totals. Exports and schedules are tables in cards                                                                       |
| Invoices and an invoice: a table, then a page of facts                      | A table in a card with the number in mono and links; the invoice as a sheet with the issuer, the lines, the totals and the terms, details beside it, and Print. Printing leaves the portal's frame out                                                                         |
| Team and roles: two pages with their own headers                            | One "Team" header with Members and "Roles and permissions" as tabs. Members are a table with an avatar, roles as chips, where each may act and a menu. Roles are a list beside a matrix: one row per area, with View, Create and edit, Delete and anything special             |
| Audit log: a table with chips                                               | A table with who on two lines (a person, an API key, Wattwisely or a driver), the action and the target; a side card shows the entry picked. "Only Wattwisely" is a switch over the table when the service is managed                                                          |
| Settings: each page with its own title and lead paragraph                   | One "Settings" header whose second line changes with the page. Branding has a logo row, the colours and a contrast warning, the support contact, and a phone preview. Alert routing is one table of rules with selects and checkboxes in each row, and the default roles below |
| Plan and managed service: lists of facts                                    | The plan in a card with its state, usage as bars that turn amber at 80% and red at 100%, and the modules with a chip each. The managed service in a card with the fee, the account manager and the approval rule; the staff as a table; the monthly report; "End the service"  |
| WhatsApp: a form, a card about Meta, a table of chats and the chat under it | "WhatsApp number" in one card with its state and switch in the head, the four fields in two columns, the greeting, and "Send a test message" with Save in the foot. Below, the conversations as a list beside the open chat as bubbles; the newest chat opens by itself        |
| API keys and webhooks: a title, a paragraph and a table                     | A table in a card each. A new key's token is shown in a green notice on the page, with Copy and Done, instead of a dialog. A webhook's page has its events, secret and buttons in one card and the recent deliveries in another                                                |

## Before and after

The same pages with the same data, before this module and after it (the API was stubbed for the pictures, at 1440 wide and, for the last pair, 820 by 1180). The decided proposals had no tab before, so their "before" is the only list there was; the same goes for the exports and schedules tabs on Reports.

| Before                                                               | After                                                              |
| -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| ![Tariffs before](images/24-before-tariffs.png)                      | ![Tariffs after](images/24-after-tariffs.png)                      |
| ![A tariff before](images/24-before-tariff-editor.png)               | ![A tariff after](images/24-after-tariff-editor.png)               |
| ![Trying a session before](images/24-before-tariff-preview.png)      | ![Trying a session after](images/24-after-tariff-preview.png)      |
| ![Proposals before](images/24-before-proposals.png)                  | ![Proposals after](images/24-after-proposals.png)                  |
| ![Decided proposals before](images/24-before-proposals-decided.png)  | ![Decided proposals after](images/24-after-proposals-decided.png)  |
| ![A proposal before](images/24-before-proposal.png)                  | ![A proposal after](images/24-after-proposal.png)                  |
| ![Payments before](images/24-before-payments.png)                    | ![Payments after](images/24-after-payments.png)                    |
| ![Reports before](images/24-before-reports.png)                      | ![Reports after](images/24-after-reports.png)                      |
| ![Exports before](images/24-before-reports-exports.png)              | ![Exports after](images/24-after-reports-exports.png)              |
| ![Scheduled reports before](images/24-before-reports-schedules.png)  | ![Scheduled reports after](images/24-after-reports-schedules.png)  |
| ![Invoices before](images/24-before-invoices.png)                    | ![Invoices after](images/24-after-invoices.png)                    |
| ![An invoice before](images/24-before-invoice.png)                   | ![An invoice after](images/24-after-invoice.png)                   |
| ![Team before](images/24-before-team.png)                            | ![Team after](images/24-after-team.png)                            |
| ![Roles before](images/24-before-roles.png)                          | ![Roles after](images/24-after-roles.png)                          |
| ![Audit log before](images/24-before-audit-log.png)                  | ![Audit log after](images/24-after-audit-log.png)                  |
| ![Branding before](images/24-before-branding.png)                    | ![Branding after](images/24-after-branding.png)                    |
| ![Alert routing before](images/24-before-alert-routing.png)          | ![Alert routing after](images/24-after-alert-routing.png)          |
| ![WhatsApp before](images/24-before-messaging.png)                   | ![WhatsApp after](images/24-after-messaging.png)                   |
| ![Plan before](images/24-before-plan.png)                            | ![Plan after](images/24-after-plan.png)                            |
| ![Managed service before](images/24-before-managed-service.png)      | ![Managed service after](images/24-after-managed-service.png)      |
| ![API keys before](images/24-before-api-keys.png)                    | ![API keys after](images/24-after-api-keys.png)                    |
| ![Webhooks before](images/24-before-webhooks.png)                    | ![Webhooks after](images/24-after-webhooks.png)                    |
| ![A webhook before](images/24-before-webhook.png)                    | ![A webhook after](images/24-after-webhook.png)                    |
| ![Payments on a tablet before](images/24-before-payments-tablet.png) | ![Payments on a tablet after](images/24-after-payments-tablet.png) |

## How the pieces fit

```
features/tariffs
├─ tariffs.component               tabs; TariffSummary for the price words in each row
├─ tariff.component                the editor's cards; TariffBandForm.daysText for "Mon–Fri"
│  ├─ TariffDriverViewComponent    what drivers see, from the form as it stands
│  └─ TariffPreviewComponent       Try a session, with the receipt in its compact form
└─ proposals
   ├─ tariff-proposals.component   one list call; waiting and decided are computed from it
   ├─ ProposalReviewComponent      the card: note, ProposalComparison.rows, the decision
   ├─ tariff-proposal.component    the card, ProposalPricesComponent, ProposalBandsComponent
   └─ proposal-comparison.ts       now against proposed, with the change as a percentage
features/payments                  account card, refund queue, card payments
features/reports
├─ reports.component               tabs; the tab comes from ?tab= (exports, schedules)
├─ usage-report.component          UsageFigures.busiest, leastOnline and uptimeTone
└─ report-exports, report-schedules
features/team
├─ TeamTabsComponent               Members and "Roles and permissions"
├─ team.component                  MemberRoles.where: whole company, the sites, or "N sites"
└─ roles.component                 RoleAreas.of: one row per area, permissions as columns
features/audit-log                 the table and the entry picked
features/settings
├─ settings-layout.component       "Settings" and the subtitle from the route's data
├─ branding.component              BrandColour.contrastNote; BrandPreviewComponent
├─ alert-routing, plan, managed-service (+ service-report)
├─ invoices.component, invoice.component
├─ messaging                       MessagingComponent (the number), MessagingChatsComponent
├─ api-keys                        the table and the new key's notice
└─ webhooks                        the endpoints; one endpoint and its deliveries
```

- **The words are small classes with specs.** `TariffSummary` turns a tariff into "£0.40 per kWh Peak" and its other prices; `ProposalComparison` lists each window, fee and limit with its change; `UsageFigures` picks the busiest sites and the chargers offline longest; `RoleAreas` turns a role's permission keys into the matrix; `MemberRoles.where`, `BrandColour.contrast`, `TariffBandForm.daysText` and `DayLabel.inSentence` do the rest. The components lay them out.
- **The settings header comes from the routes.** Each child route of `settings.routes.ts` has a `subtitle` in its data, and the layout reads it on every navigation, so a page never draws its own title.
- **Approving moved into the card.** Approve, Reject and Withdraw were buttons on the proposal's page; `ProposalReviewComponent` now has them, and both the list and the page use it, so a waiting proposal can be decided from the list. The dialogs that ask for the comment are the same.
- **Reports can open on a tab.** "Go to Reports" on Sessions and the audit log, after an export, links to `/reports?tab=exports`.

## Shared pieces in packages/ui

`_controls.scss` gains a right-aligned footer cell (`.mat-mdc-footer-cell.ww-num`) for totals under a table, and `ww-danger` on a text button, as Revoke in a table row. `AppIcons` gains `archive`, for archiving a tariff.

## Where the build differs from the approved screens

- **Invoices are Wattwisely's invoices to the company.** The screens also show tax invoices to drivers, credit notes and a numbering tab; the portal has none of them, since drivers get receipts per session (module 9), so the page lists the monthly invoices only.
- **Payments has no reconciliation, Unpaid balances tab or figures over the tables.** The API has no payout matching, no unpaid balance per driver and no totals for a period.
- **Reports has no weekly utilisation chart, no Revenue or Uptime tabs and no comparison with the previous period.** The usage report gives one figure per site or charger for the period; the bars show the busiest and the least online, and the table has everything else.
- **The team table has no two-step sign-in column and no Invites tab.** The API does not say whether a member set up a second factor, and an invited member is a row with the "Invited" state.
- **A role cannot be copied to a new one** from its page; "Add role" starts from the permission picker as before.
- **The audit log has no field-by-field before and after, no request ID, and no date, person or area filters.** The API keeps the action, the target and who did it; the "Only Wattwisely" switch is the filter it has.
- **Alert routing has no quiet hours**, and **the plan page has no next invoice, card, estimate or add-on buttons**: the API has none of them, and a module is added by asking Wattwisely.
- **The managed service has no "Last active" column for the staff and no switch for the approval rule.** The API does not record when a staff member last acted, and price changes always need an Owner's approval under the service.
- **A proposal is still decided in a dialog**, which asks for a comment when it is rejected, rather than buttons with a comment box in the card.
- **Conversations show the driver's full number**, not a masked one, as before: the people who may read the chats may see the number.

## Design decisions

- **One header per area.** Settings pages and the team pages share one title, with tabs or a side menu under it, so moving between them does not move the page.
- **A token is shown on the page, once.** A new API key's token is in a notice at the top of the API keys page until Done is pressed, with Copy beside it; it is never fetched again. This replaces a dialog that had to be closed before the list could be seen.
- **The newest chat opens by itself** on the WhatsApp page, so the page is never half empty; picking another chat opens it beside the list.
- **A select shows "Every site".** An alert rule for every site has no site, and a Material select shows nothing for an option whose value is empty, so the page uses a placeholder value for that option and sends no site to the API.
- **Two-line cells read the same everywhere.** The first line is the name or the value, in the body color; the second, smaller and grey, says more (the key's hint, who made it, the endpoint's description).

## How it was checked

`prettier --check .` and `nx run-many -t lint test build` pass. New specs cover `TariffSummary`, `ProposalComparison`, `TariffBandForm.daysText`, `UsageFigures.busiest` and `leastOnline`, `RoleAreas`, `MemberRoles.where`, `BrandColour` and `DayLabel.inSentence`. A script compared every `data-testid` in the portal before and after: none was lost (the audit log's actor IDs are now set from a table in the component). The screenshots above were taken with Playwright against the built portal with the API stubbed, at 1440 and 820 wide.

## Read the code in this order

1. `features/tariffs/tariff-summary.ts` and `tariffs.component.*`; then `tariff.component.*`, `tariff-bands.component.*`, `tariff-driver-view.component.ts` and `tariff-preview.component.*`.
2. `features/tariffs/proposals/proposal-comparison.ts`, `proposal-review.component.*`, then `tariff-proposals.component.*` and `tariff-proposal.component.*`.
3. `features/payments/payments.component.*` and `payment-account-card.component.*`.
4. `features/reports/usage-figures.ts`, `reports.component.*`, `usage-report.component.*`, `report-exports.component.*` and `report-schedules.component.*`.
5. `features/team/role-areas.ts`, `roles.component.*`, `team-tabs.component.ts` and `team.component.*`; then `features/audit-log/audit-log.component.*`.
6. `features/settings/settings.routes.ts` and `settings-layout.component.ts`; then each settings page, starting with `branding.component.*` and `brand-colour.ts`.

# Module 13: drivers, RFID cards and access groups

Until module 12 a charger accepted only the tags the platform had just issued for a remote start from the driver's QR page. A fleet's own cards did nothing, and a bench setting (`OCPP_ACCEPT_UNKNOWN_ID_TAGS`) let a test charger take any tag at all. This module gives an operator a **list of drivers**, each with **RFID cards** and a **status**, and **access groups** that say **which drivers may charge at which private sites**. The gateway now answers Authorize and StartTransaction from that list: an active card of an active driver is **Accepted**, a blocked driver or card is **Blocked**, a card past its end date is **Expired**, anything else is **Invalid**. Every session started with a card **names the driver**, so the Sessions page, the CSV export and the driver's own page show who charged. Personal data (e-mail and phone) is shown only to roles with `drivers:read_personal`.

Stories covered: Olivia adds Dana Driver with her van's key fob, Dana holds it against the Riverside charger and the charge starts; Dana's fob is accepted at the public Riverside car park but refused at the private Depot North until Olivia puts her in the "Depot staff" group that opens it; Ben leaves the company, Olivia blocks him with a reason, and his card is refused at every charger from that second, while the audit log shows who blocked him and why; Priya loses her card, Olivia marks it lost and registers a replacement, and the old one is refused; a contractor's card gets an end date, and the day after it the charger answers Expired; Theo the technician sees the drivers' names on sessions but neither their e-mail nor their phone; Olivia deletes a driver, and their past charges still carry the name while their cards stop working.

## What changed since module 12

| Before (module 12)                                                   | Now (module 13)                                                                                                                                                                                                                                                                                |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `drivers:*` permissions existed in the catalogue with nothing behind | `drivers` (migration 0021): name, e-mail, phone, reference, notes, `active` or `blocked` with who blocked them and why, soft-deleted. `GET`/`POST /v1/drivers`, `GET`/`PATCH`/`DELETE /v1/drivers/{id}`, `POST …/block` and `…/unblock`                                                        |
| Cards were not known to the platform                                 | `rfid_cards`: the tag as the charger sends it (unique per tenant, case-insensitive), a label, `active`, `blocked` or `lost`, an optional end date, when it was last used. `POST /v1/drivers/{id}/cards`, `PATCH /v1/drivers/{id}/cards/{cardId}`                                               |
| A private site was a word on the site, nothing enforced it           | `access_groups` with `access_group_sites` and `access_group_members`: the drivers of a group may charge at the sites it names. `GET`/`POST /v1/access-groups`, `GET`/`PATCH`/`DELETE /v1/access-groups/{id}`; a driver's groups are also set through `PATCH /v1/drivers/{id}` with `group_ids` |
| The gateway accepted only platform-issued tags, or everything        | `TagPolicy` asks `IssuedTagRegistry` first, then `CardAccessRepository` and `TagVerdict`: Accepted, Blocked, Expired or Invalid, by the card, the driver, the end date and the site's visibility. `OCPP_ACCEPT_UNKNOWN_ID_TAGS` only changes what happens to a tag that is no card             |
| A session knew its `id_tag` and nothing more                         | `charging_sessions.driver_id` and `rfid_card_id` are set when a card starts a session; `GET /v1/sessions` answers `driver_id` and `driver_name` and filters by `driver_id`                                                                                                                     |
| The portal had no page for people who charge                         | **Drivers** in the side bar (with `drivers:read`): a list with search, status and group filters; a driver's page with their cards, groups and recent charges; block, unblock, edit and delete; **Access groups** with their sites and members. Sessions link to the driver                     |
| The simulator charged only when the portal said so                   | `npm run sim -- --tag DEMO-CARD-1` holds a card against connector 1 once booted: Authorize, then a charge when the card is accepted                                                                                                                                                            |
| Nobody was told that e-mail and phone are personal data              | Both come back `null` and `is_personal_data_hidden` is true without `drivers:read_personal`. A PATCH from such a role leaves them untouched                                                                                                                                                    |

## The tag policy

```text
Authorize / StartTransaction with idTag
  │
  ├─ a tag the platform issued for a remote start (module 7)?  → Accepted, with the command it belongs to
  │
  ├─ no card with that tag in the charger's tenant?
  │     OCPP_ACCEPT_UNKNOWN_ID_TAGS=true → Accepted (bench)      otherwise → Invalid
  │
  └─ a card: TagVerdict, in this order
        driver deleted                          → Invalid
        card blocked or lost, or driver blocked → Blocked
        card past its end date                  → Expired
        site private and driver in no group that names it → Invalid
        otherwise                               → Accepted; the card's last_used_at is set
```

The site's visibility comes from `chargers.visibility_override` when set, else from `sites.visibility`, as the driver's QR page already reads it. A driver in no group charges at public sites only. The verdict is taken inside the same tenant transaction as the rest of the message, so a block is in force on the next Authorize.

Blocking a driver does not stop a charge that is running: the charger is not told, and the session ends as every session does. Stopping it is a button away on the session page.

## Design decisions for M1

| Decision                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Drivers are records, not accounts.** A driver has no login, no app and no password: the operator keeps the list, as a fleet manager does. Driver accounts, and cards a driver orders for themselves, are later work                                                 |
| **The tag is what the charger sends.** Cards are matched case-insensitively on the OCPP `idTag`, up to 20 characters as OCPP 1.6 allows, with no attempt to normalise byte orders. Register the tag the charger logs, and the card works                              |
| **Access is per site, through groups.** A group names sites and drivers; nothing is attached to a single charger. Public sites need no group, so a small operator never sees the feature; a depot makes its site private and one group                                |
| **Blocked beats expired beats the site rule.** The charger's answer tells the driver the most useful thing first: a blocked card is blocked everywhere, an expired one needs a new date, and only then does the place matter                                          |
| **Delete is soft, and keeps the name on sessions.** Deleted drivers leave every list and answer 404; their cards are blocked and they leave their groups. Past charges still show who charged, as a receipt should. Hard deletion waits for the data retention policy |
| **Personal data stays out of the answer, not out of the row.** Without `drivers:read_personal` the API nulls e-mail and phone and says so, instead of a second endpoint. Writes from such a role never clear them                                                     |
| **Changing drivers needs the whole tenant.** Drivers are not tied to a site, so `drivers:write`, `drivers:block` and `drivers:delete` must be held for every site, as roles and tariffs are. Reading works for any member with `drivers:read`                         |
| **The gateway reads the tables itself.** No call from the gateway to the API: one query joining the card, the driver, the charger's site and the groups, under row-level security, in the message's own transaction                                                   |

## Read the code in this order

### 1. The database: `packages/db`

| Step | File                                                     | What it does                                                                                                          |
| ---- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1    | `src/schema/drivers.table.ts`                            | A driver: identity, reference, status with who blocked them and why, soft deletion; one e-mail per tenant             |
| 2    | `src/schema/rfid-cards.table.ts`                         | A card of a driver: the tag (unique per tenant, case-insensitive), status, end date, last use                         |
| 3    | `src/schema/access-groups.table.ts`                      | A group, the sites it opens and the drivers in it; the link tables carry `tenant_id` so a group never crosses tenants |
| 4    | `src/schema/charging-session-references.ts`              | `driver_id` and `rfid_card_id` on a session, both composite keys with the tenant                                      |
| 5    | `migrations/0021_drivers_access.sql`, `0022_…grants.sql` | The tables and policies; what `wattwisely_app` may do with them                                                       |
| 6    | `src/testing/test-drivers.ts`                            | Drivers, cards and groups for tests, written as the API would                                                         |

### 2. The gateway: `apps/ocpp-gateway/src`

| Step | File                                            | What it does                                                                                              |
| ---- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1    | `access/card-access.ts`                         | What the gateway needs to know about a tag: the card, the driver, the site's visibility, group membership |
| 2    | `access/tag-verdict.ts`                         | The pure decision: Invalid, Blocked, Expired or Accepted, in that order                                   |
| 3    | `access/card-access.repository.ts`              | One query for the above, and `markUsed`                                                                   |
| 4    | `commands/tag-policy.ts`                        | Issued tags first, then the card; `start` carries the driver and card into the session                    |
| 5    | `adapters/v16/v16-authorize.handler.ts`         | Authorize answers the verdict inside the tenant transaction                                               |
| 6    | `adapters/v16/v16-start-transaction.handler.ts` | StartTransaction opens the session with `driver_id` and `rfid_card_id`                                    |

### 3. The API: `apps/api/src/modules/drivers`

| Step | File                                                 | What it does                                                                                               |
| ---- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1    | `profiles/drivers.controller.ts`                     | The routes, their permissions and `If-Match`                                                               |
| 2    | `profiles/drivers.repository.ts`, `driver-filter.ts` | The list with card counts, last session and groups; search by name, e-mail or reference; the keyset cursor |
| 3    | `profiles/driver-personal-data.ts`                   | Nulls e-mail and phone unless the caller holds `drivers:read_personal`                                     |
| 4    | `profiles/drivers.service.ts`                        | Reads: list, one driver, the detail with cards; deleted drivers answer 404                                 |
| 5    | `profiles/driver-changes.service.ts`                 | Create, update (groups included), block, unblock, delete; the audit entries                                |
| 6    | `cards/rfid-cards.service.ts`                        | Register a card, change its label, state or end date; the tag's uniqueness                                 |
| 7    | `groups/access-groups.service.ts`                    | Groups with their lists replaced as a whole; a site or driver that does not exist in the tenant is 422     |
| 8    | `../sessions/sessions.repository.ts`                 | `driver_name` on a session, and the `driver_id` filter                                                     |

### 4. The portal: `apps/portal/src/app/features/drivers`

| Step | File                                                                                   | What it does                                                                                     |
| ---- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1    | `drivers.store.ts`, `drivers.component.*`                                              | The list: search, status and group filters, load more                                            |
| 2    | `driver-form.ts`, `driver-dialog.component.*`                                          | Add or edit a driver, with their groups                                                          |
| 3    | `driver.component.*`                                                                   | One driver: details with the personal-data note, cards, groups, recent charges; the actions menu |
| 4    | `card-dialog.component.ts`, `block-driver-dialog.component.ts`                         | Register a card; block with a reason                                                             |
| 5    | `access-groups.component.*`, `access-group-dialog.component.*`, `access-group-form.ts` | Groups with their sites and members                                                              |
| 6    | `../../core/api/drivers-api.service.ts`, `access-groups-api.service.ts`                | The calls, with `If-Match`                                                                       |

### 5. Endpoints

| Endpoint                                   | Permission                | Notes                                                                                                                                                                                          |
| ------------------------------------------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/drivers`                          | `drivers:read`            | `q` (name, e-mail, reference), `status`, `group_id`, `cursor`, `limit`; by name. Each item has `card_count`, `active_card_count`, `last_session_at`, `groups`                                  |
| `GET /v1/drivers/{id}`                     | `drivers:read`            | The driver with `cards`; 404 `driver_not_found` once deleted                                                                                                                                   |
| `POST /v1/drivers`                         | `drivers:write` (tenant)  | 201; `name` required, `email`, `phone`, `reference`, `notes`, `group_ids`. 409 `driver_email_taken`                                                                                            |
| `PATCH /v1/drivers/{id}`                   | `drivers:write` (tenant)  | `If-Match`; only the fields sent change; `group_ids` replaces the groups; 422 `access_group_not_found` for a group that is not the tenant's                                                    |
| `POST /v1/drivers/{id}/block`, `…/unblock` | `drivers:block` (tenant)  | `reason` optional; 409 `driver_already_blocked`, `driver_not_blocked`                                                                                                                          |
| `DELETE /v1/drivers/{id}`                  | `drivers:delete` (tenant) | `If-Match`; 204; cards blocked, groups left, sessions keep the name                                                                                                                            |
| `POST /v1/drivers/{id}/cards`              | `drivers:write` (tenant)  | 201; `id_tag` (1–20 of `A-Z a-z 0-9 * _ = : + \| @ . -`), `label`, `expires_at`. 409 `card_tag_taken`                                                                                          |
| `PATCH /v1/drivers/{id}/cards/{cardId}`    | `drivers:write` (tenant)  | `If-Match`; `label`, `status` (`active`, `blocked`, `lost`), `expires_at` (null clears it); 404 `card_not_found`                                                                               |
| `GET /v1/access-groups`, `GET …/{id}`      | `drivers:read`            | Every group of the tenant with `sites` and `members` (`id`, `name`)                                                                                                                            |
| `POST /v1/access-groups`, `PATCH …/{id}`   | `drivers:write` (tenant)  | `name`, `description`, `site_ids`, `driver_ids`; a list sent replaces the old one; 422 `site_not_found` / `driver_not_found` for an id that is not the tenant's; 409 `access_group_name_taken` |
| `DELETE /v1/access-groups/{id}`            | `drivers:write` (tenant)  | `If-Match`; 204; the drivers lose access to the sites it opened                                                                                                                                |
| `GET /v1/sessions?driver_id=`              | `sessions:read`           | Each session now has `driver_id` and `driver_name`                                                                                                                                             |

Every change is in the audit log: `drivers.created`, `drivers.updated`, `drivers.blocked`, `drivers.unblocked`, `drivers.deleted`, `rfid_cards.added`, `rfid_cards.updated`, `access_groups.created`, `access_groups.updated`, `access_groups.deleted`, with the before and after (personal data included, as the audit log is for `audit:read` holders).

## Running it

Apply the migrations as always (`npm run db:migrate` or `./scripts/up.sh`, which runs them). Nothing else to configure: the gateway reads the new tables with the role and policies it already has. `OCPP_ACCEPT_UNKNOWN_ID_TAGS` keeps its meaning for a bench: a tag that is no card is accepted. Leave it `false` on a server, as `deploy/.env.example` does; a registered card is checked either way.

The demo data (`deploy/scripts/seed-demo.sh`) adds three drivers to Acme Charging: Dana Driver with card `DEMO-CARD-1`, in the "Depot staff" group that opens the private Depot North; Priya Patel with a lost card and its replacement; Ben Blocked, blocked two days ago. The finished demo session is now Dana's. The simulator's new `--tag` holds a card against connector 1 once the charger has booted, and charges when the card is accepted:

```sh
npm run sim -- --url ws://ocpp.localhost/ocpp --identity WW-7KQ4M2XR9T --tag DEMO-CARD-1   # Accepted at Riverside: a charge starts, in Dana's name
npm run sim -- --url ws://ocpp.localhost/ocpp --identity SN-AB129934 --tag DEMO-CARD-3    # Invalid: Depot North is private and Priya is in no group
npm run sim -- --url ws://ocpp.localhost/ocpp --identity WW-7KQ4M2XR9T --tag DEMO-CARD-4   # Blocked: Ben is blocked
```

Put Priya in the Depot staff group on her page, run the second line again, and the charge starts.

## Tests

| Spec                                                                 | What it proves                                                                                                                                                                                                                         |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/ocpp-gateway/src/access/tag-verdict.spec.ts`                   | The order of the verdict: a deleted driver, a block, an expiry, the site rule, then Accepted                                                                                                                                           |
| `apps/ocpp-gateway/src/access/card-access.flow.spec.ts`              | Against Postgres with a simulated charger: an active card at a public site, blocked, lost, expired and other-tenant cards, a group opening a private site, the charger's visibility override, the session carrying the driver and card |
| `apps/api/src/modules/drivers/profiles/driver-profiles.flow.spec.ts` | Create and search, personal data hidden from a technician, a duplicate e-mail, cards once per tag and their states, block and unblock once, sessions by driver with the name, delete and its audit trail                               |
| `apps/api/src/modules/drivers/groups/access-groups.flow.spec.ts`     | A group with its sites and drivers, a foreign site or unknown driver refused, a used name, lists replaced as a whole and seen from the driver's side, delete at the version seen                                                       |
| `apps/portal/src/app/features/drivers/driver-form.spec.ts`           | The form's rules; blank e-mail and phone go as null; a driver loads with their groups                                                                                                                                                  |

The database-backed specs need `TEST_DATABASE_URL`, as before.

## Not in this module

- Driver accounts: a login, a driver app, cards a driver orders or blocks themselves, and tokens the app would present instead of a card.
- OCPP local authorisation lists and the authorisation cache (`SendLocalList`, `GetLocalListVersion`): every tag is checked online.
- Per-group prices or discounts, and a driver's monthly invoice: a card's charges are priced by the site's tariff like any other.
- Reading personal data is not itself audited; `drivers:read_personal` decides who sees it.
- A driver column in the session CSV, and importing a fleet's cards from a file.
- Hard deletion of a driver's row, which waits for the data retention policy.

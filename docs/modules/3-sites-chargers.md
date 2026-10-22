# Module 3: sites, chargers and connectors

Modules 1 and 2 answered **who is calling, in which tenant, and what may they do there?** This module gives a tenant something to do it on: the **sites** where it charges cars, the **chargers** on those sites and the **connectors** (plugs) on each charger. It also puts the site-scoped permissions of module 2 to work: a Technician given a role on one site sees and changes only that site's chargers.

Stories covered: AST-01 (sites with address, map pin, opening hours and visibility), AST-02 (register a charger with an OCPP identity and a setup card; password or boot-fingerprint security) and AST-03 (connectors with type and power). The charger tables are built so the OCPP 1.6J gateway (module 4) only has to fill in what a charger reports.

## What changed since module 2

| Before (module 2)                                                                          | Now (module 3)                                                                                                 |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `membership_roles.site_id` pointed at nothing                                              | It is a foreign key to `sites`; giving a role on a site that does not exist answers 422 `site_not_found`       |
| `SiteScope` existed but nothing filtered by it                                             | Every sites and chargers query is narrowed by the caller's scope, and every change checks the row's site       |
| The portal's role picker gave roles for the whole company only                             | Each role can be "Whole company" or "Chosen sites"                                                             |
| Nothing used `If-Match`                                                                    | Every change to a site, charger or connector sends the version it saw; a stale version answers 409             |
| The API's transaction knew `app.tenant_id`, `app.user_account_id`, `app.invite_token_hash` | It also knows `app.charger_identity`, so the gateway can find a charger by identity before its tenant is known |

## The flow at a glance

```mermaid
sequenceDiagram
    actor Olivia as Olivia (Owner)
    actor Theo as Theo (Technician, Riverside only)
    participant Portal
    participant API
    participant DB as Postgres

    Olivia->>Portal: Sites > Add site "Riverside Car Park"
    Portal->>API: POST /v1/sites
    API->>API: sites:write must cover the whole company
    API->>DB: sites row + audit entry sites.created
    Olivia->>Portal: Register charger on Riverside (make an ID, password)
    Portal->>API: POST /v1/chargers
    API->>API: site exists? chargers:write at that site?
    API->>DB: chargers row (identity WW-7KQ4M2XR9T, scrypt hash of the password)
    API->>Portal: charger + setup card (URL, ID, password shown once)
    Olivia->>Portal: Add connectors A and B (Type 2, 22 kW)
    Portal->>API: POST /v1/chargers/{id}/connectors
    Theo->>Portal: Chargers
    Portal->>API: GET /v1/chargers
    API->>DB: ... where site_id in (Riverside)
    API->>Portal: Riverside's chargers only; Depot North's answer 404 by id
```

## Read the code in this order

### 1. The database: `packages/db`

| Step | File                                        | What it does                                                                                                                                                                                                                                                    |
| ---- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `src/schema/sites.table.ts`                 | A charging location: name (unique per tenant, case-insensitive, among non-deleted sites), address as JSON, map pin, time zone, opening hours as JSON (null means 24 hours), visibility, power limit, parking notes. Soft-deleted with `deleted_at`              |
| 2    | `src/schema/chargers.table.ts`              | A charge point: `ocpp_identity` (unique platform-wide, case-insensitive), `auth_mode` password or none with `password_hash`, `allow_plain_ws`, a visibility override, and everything the gateway fills in later: serials, firmware, boot fingerprint, last seen |
| 3    | `src/schema/connectors.table.ts`            | A plug: `ocpp_connector_id` (what the charger calls it, from 1), label, type, AC/DC, max power, and the last reported status                                                                                                                                    |
| 4    | `src/schema/membership-roles.table.ts`      | Now has the foreign key `(tenant_id, site_id) → sites`                                                                                                                                                                                                          |
| 5    | `src/schema/enums.ts`                       | The new enums: visibility, auth mode, OCPP version, registration status, connector type, current type, connector status                                                                                                                                         |
| 6    | `src/schema/row-level-security.ts`          | `currentChargerIdentity()`: `current_setting('app.charger_identity')`                                                                                                                                                                                           |
| 7    | `migrations/0003_sites_chargers.sql`        | Generated from the schema. Note `chargers_identity_lookup`: a second policy on `chargers` that lets a query with `app.charger_identity` set see that one charger whatever its tenant                                                                            |
| 8    | `migrations/0004_sites_chargers_grants.sql` | The API may select, insert and update sites and chargers (never delete: they are soft-deleted), and also delete connectors                                                                                                                                      |

**Composite foreign keys.** Every link between tenant tables carries the tenant id along: `chargers (tenant_id, site_id) → sites (tenant_id, id)`, `connectors (tenant_id, charger_id) → chargers (tenant_id, id)`. A row can never point into another tenant, even from a bug in the API.

**Built for the gateway.** `chargers` already holds `last_boot_at`, `last_heartbeat_at`, `last_seen_at`, `heartbeat_interval_s`, `boot_fingerprint` (vendor, model, serial from the first BootNotification) and `registration_status`; `connectors` holds the OCPP status, error code and `status_changed_at`. Module 4 updates these columns and adds sessions; it does not change the tables.

### 2. The API: `apps/api/src/modules/assets`

One Nest module for the three things, because they read each other's tables (a site's status comes from its chargers; a charger's answer names its site).

| Step | File                                                | What it does                                                                                                                                                                                                                               |
| ---- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 9    | `common/permissions/site-permission.checker.ts`     | `scopeOf`, `isAllowedAt`, `requireAt` (403 `permission_denied` "at this site"), `requireWholeTenant` (for creating a site)                                                                                                                 |
| 10   | `common/database/site-scope.condition.ts`           | Turns a `SiteScope` into a `WHERE site_id IN (...)` (or nothing, for the whole tenant)                                                                                                                                                     |
| 11   | `common/paging/page-request.ts`, `list-cursor.ts`   | `limit` and `cursor` for every list, the same way as the audit log                                                                                                                                                                         |
| 12   | `common/request/if-match.decorator.ts`              | Reads the `If-Match` header as the version the client saw: 428 `version_required` without it; the services answer 409 `version_conflict` when it is stale                                                                                  |
| 13   | `sites/sites.repository.ts`                         | Sites by name with a cursor, search over name and address, and `findFleets`: chargers and connectors by status per site in one query                                                                                                       |
| 14   | `sites/sites.service.ts`, `site-changes.service.ts` | Reads within the caller's `sites:read` scope (a site outside it answers 404, like one in another tenant). Create needs whole-company `sites:write`; edit and delete need it at that site. Delete is refused while chargers are on the site |
| 15   | `sites/site-health.ts`                              | A site's status from its fleet: `offline` when every connected charger is silent, `problem` when any is faulted or offline, else `ok`                                                                                                      |
| 16   | `chargers/charger-status.ts`                        | A charger's status, in SQL so lists can filter by it: `waiting` (never booted), `offline` (silent for 2.5 heartbeat intervals), `faulted`, `charging`, `available`, `unavailable`                                                          |
| 17   | `chargers/charger-identity.ts`                      | `WW-` + 10 Crockford Base32 characters (no I, L, O, U), or the charger's own URL-safe identity                                                                                                                                             |
| 18   | `chargers/charger-password.ts`                      | 24 unambiguous characters, stored as an scrypt hash (Node's own `crypto`); `matches` is what the gateway will call                                                                                                                         |
| 19   | `chargers/chargers.repository.ts`                   | Chargers with their site and derived status; `findByIdentity` for the gateway, run under `DatabaseSession.forChargerIdentity`                                                                                                              |
| 20   | `chargers/charger-registration.service.ts`          | Register (site must exist and the caller needs `chargers:write` there), set a new password (shown once), remove the password, forget the boot fingerprint                                                                                  |
| 21   | `chargers/charger-changes.service.ts`               | Edit (moving to another site needs `chargers:write` at both) and remove (soft delete; the identity is free again)                                                                                                                          |
| 22   | `chargers/charger-setup-card.builder.ts`            | `OCPP_URL/<identity>` (and the plain `ws://` address when allowed) from the API settings                                                                                                                                                   |
| 23   | `connectors/connectors.service.ts`                  | Add (defaults: next number, next letter), edit, remove. A connector the charger has reported cannot be removed (409 `connector_reported`); mark it unavailable instead                                                                     |
| 24   | `asset-change.recorder.ts`                          | The audit entries: `sites.created/updated/deleted`, `chargers.registered/updated/removed/password_changed/password_removed/fingerprint_reset/connector_added/connector_updated/connector_removed`                                          |
| 25   | `modules/team/role-assignment.policy.ts`            | Now also checks that every site in a role assignment exists                                                                                                                                                                                |

### 3. Endpoints

| Endpoint                                                               | Permission                           | Notes                                                                                                                            |
| ---------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/sites`, `GET /v1/sites/{id}`                                  | `sites:read`                         | `q`, `visibility`, `limit`, `cursor`. Each site carries `status`, charger and connector counts                                   |
| `POST /v1/sites`                                                       | `sites:write`                        | Whole company only. 409 `site_name_taken`                                                                                        |
| `PATCH /v1/sites/{id}`, `DELETE /v1/sites/{id}`                        | `sites:write` / `sites:delete`       | `If-Match: <version>`. Delete: 409 `site_has_chargers`                                                                           |
| `GET /v1/chargers`, `GET /v1/chargers/{id}`                            | `chargers:read`                      | `site_id`, `status` (comma-separated), `ocpp_version`, `auth_mode`, `vendor`, `q`. Each charger carries its connectors           |
| `POST /v1/chargers`                                                    | `chargers:write`                     | `identity_mode` generate or existing, `auth_mode` password or none. Answers the charger **and the setup card with the password** |
| `PATCH /v1/chargers/{id}`, `DELETE /v1/chargers/{id}`                  | `chargers:write` / `chargers:delete` | `If-Match`. 409 `identity_taken` is worded the same whoever holds the identity                                                   |
| `POST /v1/chargers/{id}/password`, `DELETE /v1/chargers/{id}/password` | `chargers:write`                     | `If-Match`. A new password is shown once in the answer                                                                           |
| `POST /v1/chargers/{id}/fingerprint/reset`                             | `chargers:write`                     | `If-Match`. Lets a replacement charger claim the identity at its next boot                                                       |
| `GET`, `POST /v1/chargers/{id}/connectors`                             | `chargers:read` / `chargers:write`   | 409 `connector_number_taken`, `connector_label_taken`                                                                            |
| `PATCH /v1/connectors/{id}`, `DELETE /v1/connectors/{id}`              | `chargers:write`                     | `If-Match`. Delete: 409 `connector_reported`                                                                                     |

**Site scoping, in one sentence.** Lists are filtered by the caller's scope for the permission; a single row outside the scope answers 404 (the same as a row in another tenant); a change checks the permission at the row's site and answers 403 `permission_denied` with "at this site" in the detail.

**Charger identity security (AST-02).** A generated identity has about 50 bits of randomness and says nothing about the tenant or site. A password is generated once, shown once and stored only as a hash. Without a password, the charger is tied to its boot fingerprint once it first connects (the gateway's job); an Owner can forget the fingerprint to swap hardware. The portal warns when someone picks a short identity with no password.

### 4. The portal

| Step | File                                                                               | What it does                                                                                                                            |
| ---- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 26   | `features/sites/sites.component.ts`                                                | Sites list with search, status and visibility filters; status as a coloured dot                                                         |
| 27   | `features/sites/site-dialog.component.ts`, `site-form.ts`, `opening-hours-form.ts` | Add or edit a site: address, map pin (typed in; a map arrives with a later module), time zone, opening hours per weekday or 24 hours    |
| 28   | `features/sites/site.component.ts`                                                 | One site: details, the chargers on it, register a charger, edit or remove the site                                                      |
| 29   | `features/chargers/chargers.component.ts`                                          | Chargers list with site, status and search filters, "Show more" paging                                                                  |
| 30   | `features/chargers/register-charger-dialog.component.ts`                           | The wizard: site, identity (made or own), security, vendor and model; then the setup card with copy buttons                             |
| 31   | `features/chargers/charger.component.ts`, `charger.store.ts`                       | One charger: connection details, what it reported, connectors as cards; new password, remove password, forget fingerprint, edit, remove |
| 32   | `features/chargers/connector-dialog.component.ts`                                  | Add or edit a connector                                                                                                                 |
| 33   | `shared/role-picker.component.ts`                                                  | For each ticked role: whole company or chosen sites. The team dialogs pass the sites when the user may see them                         |
| 34   | `shared/status-chip.component.ts`, `status-labels.ts`                              | The words and colours for site, charger and connector statuses                                                                          |

## Running it

```sh
cd deploy
./scripts/up.sh --build     # adds OCPP_URL and OCPP_PLAIN_URL to an existing .env, runs the migrations
./scripts/seed-demo.sh      # demo tenants, people, two sites, three chargers and their connectors
```

Log in as `owner@acme.test` (password `Wattwisely-demo-1`) to see Sites and Chargers for Acme Charging, or as `tech@acme.test`, who is a Technician on Riverside Car Park only: Depot North and its charger are invisible to them.

The setup card prints `OCPP_URL/<identity>`. `install.sh` sets `OCPP_URL` to `ws://ocpp.localhost/ocpp` locally and `wss://ocpp.<domain>/ocpp` on a server; the gateway that answers there arrives in module 4.

## Tests

| Test                                                                                                                                                               | What it proves                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/modules/assets/sites/sites.flow.spec.ts`                                                                                                             | Create, duplicate name, bad time zone, `If-Match` (428, 409), paging by name, a site-scoped Technician sees only their site, other tenants get 404, whole-company `sites:write` for creating, delete rules and audit entries                                                                               |
| `apps/api/src/modules/assets/chargers/chargers.flow.spec.ts`                                                                                                       | Generated identity and password shown once, own identity unique platform-wide and case-insensitive (409 for another tenant, never naming it), filters and search, a Technician cannot see or move chargers off their site, password and fingerprint endpoints, move, remove, identity reuse, audit entries |
| `apps/api/src/modules/assets/connectors/connectors.flow.spec.ts`                                                                                                   | Defaults (next number, next letter), duplicate number, edit, remove; charger status derived from connector statuses and silence; a reported connector cannot be removed                                                                                                                                    |
| `apps/api/src/common/database/row-level-security.spec.ts`                                                                                                          | Sites and chargers are kept apart per tenant; the identity lookup policy shows exactly one charger, and nothing else, to a query with `app.charger_identity` set                                                                                                                                           |
| `charger-identity.spec.ts`, `charger-password.spec.ts`, `connector-label.spec.ts`, `site-health.spec.ts`, `list-cursor.spec.ts`, `is-time-zone.constraint.spec.ts` | The small pieces on their own                                                                                                                                                                                                                                                                              |
| `apps/portal/.../opening-hours-form.spec.ts`, `opening-hours-text.spec.ts`, `member-roles.spec.ts`                                                                 | The opening hours editor and its text, and the role picker's assignments                                                                                                                                                                                                                                   |

Not yet checked in a real browser against the Docker stack (Docker was not available while building this module): the Material dialogs and the copy buttons on the setup card.

## Not in this module

| What                                               | Where                                               |
| -------------------------------------------------- | --------------------------------------------------- |
| A map to drop the pin on, and address lookup       | Later; coordinates are typed in for now             |
| Site photos, QR stickers (AST-05), site statistics | Later modules                                       |
| Live status, commands, the charger's message log   | Module 4 (OCPP 1.6J gateway) fills the columns      |
| Driver access groups per site                      | Drivers module                                      |
| OCPP 2.0.1                                         | Moved to M2; the `ocpp_version` enum already has it |

# Module 2: roles, permissions and the team

Module 1 answered **who is calling, and which tenant are they working in?** This module answers the next question on every request: **what may they do there?** It also moves tenants out of Keycloak and into our own Postgres database, lets Owners invite and remove team members, and starts the audit log.

Stories covered: ACC-02 (invite team members with roles), ACC-03 (change roles and remove access within 60 seconds, never leaving a tenant without an Owner) and the base of SEC-01 (every team change is written to an append-only audit log, which Owners can read).

## What changed since module 1

| Before (module 1)                                             | Now (module 2)                                                                                     |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| A person's tenants came from the token's `organization` claim | They come from the `tenant_memberships` table, read on every request (cached for 30 seconds)       |
| Every route was open to any member of the tenant              | Every tenant route names the permission it needs, e.g. `@RouteAccess.requires('team:manage')`      |
| No database                                                   | Postgres with Drizzle ORM; row-level security keeps tenants apart even if a query forgets a filter |
| Tenants were Keycloak organizations                           | Tenants are rows in `tenants`. Keycloak only proves who someone is                                 |

Keycloak still holds logins, passwords and two-factor. It no longer decides anything about tenants or roles, so removing someone takes effect in our database, not in Keycloak.

## The flow at a glance

```mermaid
sequenceDiagram
    actor Owner
    actor Tom as Tom (invited)
    participant Portal
    participant API
    participant DB as Postgres
    participant Mail as SMTP

    Owner->>Portal: Team > Invite tom@acme.example as Technician
    Portal->>API: POST /v1/members/invites
    API->>API: PermissionGuard: Owner holds team:manage?
    API->>API: RoleAssignmentPolicy: is Owner allowed to give these roles?
    API->>DB: membership (status invited, token hash, expires in 7 days) + roles + audit entry
    API->>Mail: e-mail with portal/invitations/{token}
    Tom->>Portal: opens the link
    Portal->>API: GET /v1/invitations/{token} (no login needed)
    Tom->>Portal: Log in / Create an account (e-mail filled in)
    Portal->>API: POST /v1/invitations/{token}/accept
    API->>DB: membership active + audit entry
    Portal->>API: GET /v1/me/permissions
    API->>Portal: Technician: chargers:read, chargers:command, ...
```

## Read the code in this order

### 1. The database: `packages/db`

A new Nx library holds the Drizzle schema and the SQL migrations. The API imports it as `@wattwisely/db`.

| Step | File                                     | What it does                                                                                                                                                      |
| ---- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `src/schema/tenants.table.ts`            | One row per company. `status` is trial, active, suspended or cancelled                                                                                            |
| 2    | `src/schema/user-accounts.table.ts`      | One row per staff person, linked to Keycloak by `keycloak_id`. E-mail is unique (case-insensitive)                                                                |
| 3    | `src/schema/tenant-memberships.table.ts` | A person in a tenant: invited, active or removed. Holds the invitation's token hash and expiry                                                                    |
| 4    | `src/schema/roles.table.ts`              | The five system roles (Owner, Operations, Finance, Technician, Read-only) have no tenant and a fixed key. Custom roles (a later module) belong to one tenant      |
| 5    | `src/schema/role-permissions.table.ts`   | Which permission keys each role holds                                                                                                                             |
| 6    | `src/schema/membership-roles.table.ts`   | Which roles a member holds, for the whole tenant (`site_id` null) or one site. The sites table arrives with the sites module, so `site_id` has no foreign key yet |
| 7    | `src/schema/audit-log.table.ts`          | Who did what to what, with before and after. The API may only insert and read                                                                                     |
| 8    | `src/schema/row-level-security.ts`       | The policies' building blocks: `current_setting('app.tenant_id')` and friends                                                                                     |
| 9    | `migrations/0000_tenancy.sql`            | Generated by `npx nx run db:generate-migration` from the schema files                                                                                             |
| 10   | `migrations/0001_app_grants.sql`         | What the API's database role may do, table by table (no DELETE on the audit log, no UPDATE on tenants)                                                            |
| 11   | `migrations/0002_system_roles.sql`       | The five system roles and their permissions (Architecture document, section 4)                                                                                    |

**Two database roles.** `wattwisely_migrator` owns the tables and only runs migrations. `wattwisely_app` is what the API connects as; it owns nothing, so Postgres applies row-level security to every query it runs.

**Row-level security.** Every table with a `tenant_id` has a policy `tenant_id = current_setting('app.tenant_id')`. The API sets that value at the start of each transaction (see step 13), so a query in tenant A cannot read or write tenant B's rows even if it has no `WHERE tenant_id = …`. Two extra policies let a person read their own memberships across tenants (for `GET /v1/me`) and let an invitation be found by its token hash before anyone has a tenant.

### 2. The API: one transaction per piece of work

| Step | File                                    | What it does                                                                                                                     |
| ---- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 12   | `common/database/database.client.ts`    | The connection pool and the Drizzle client                                                                                       |
| 13   | `common/database/transaction-runner.ts` | Opens a transaction and sets `app.tenant_id`, `app.user_account_id` and `app.invite_token_hash` for it, from a `DatabaseSession` |
| 14   | `common/database/database-session.ts`   | Names the scope of the work: `forTenant`, `forUser`, `forInvitation`                                                             |
| 15   | `apps/api/src/migration.command.ts`     | `node migrate.js` in the API image: applies new migrations as the migrator role. `up.sh` runs it before the API starts           |

### 3. Three guards on every request

Registered in this order in `common/auth/auth.module.ts`:

| Guard                                    | Question                     | Answer when it fails                                                                                                                        |
| ---------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `common/auth/authentication.guard.ts`    | Who is calling? (module 1)   | 401 `token_missing` / `token_invalid`                                                                                                       |
| `common/tenant/tenant-context.guard.ts`  | Which account, which tenant? | 403 `account_unverified` (e-mail not verified), 404 `tenant_not_found` (not your tenant), 403 `no_tenant`, 400 `tenant_required` (pick one) |
| `common/permissions/permission.guard.ts` | May they do this?            | 403 `permission_denied`, 403 `tenant_suspended` (a change in a suspended tenant)                                                            |

The second guard, step by step:

| Step | File                                        | What it does                                                                                                                                                                                                                       |
| ---- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 16   | `common/account/staff-account.resolver.ts`  | Finds the `user_accounts` row for the token's Keycloak id. At first login it links the row an invitation created, **only if Keycloak has verified the e-mail**, so nobody can claim an invitation by typing someone else's address |
| 17   | `common/tenant/tenant-access.resolver.ts`   | Loads the active membership in the requested tenant and its role grants. Cached for 30 seconds per API instance                                                                                                                    |
| 18   | `common/tenant/tenant-access.repository.ts` | The two queries: active memberships (skipping deleted and cancelled tenants), and role grants with their permissions                                                                                                               |

And the third:

| Step | File                                       | What it does                                                                                                                                            |
| ---- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 19   | `common/permissions/permission-catalog.ts` | Every permission key the platform knows, with a label and whether it only reads. Adding a key is a code change and a migration                          |
| 20   | `common/permissions/permission-set.ts`     | All the caller's role grants merged: `can('chargers:command')` and `scopeFor('chargers:command')`                                                       |
| 21   | `common/permissions/site-scope.ts`         | Where a permission applies: the whole tenant, or a list of sites. Later modules filter chargers and sites with it                                       |
| 22   | `common/auth/route-access.decorator.ts`    | `requires(permission)`, `anyMember()`, `withoutTenant()`, `public()`. A tenant route without one is refused, and a test checks every route declares one |

**Removing access within 60 seconds (ACC-03).** The access cache lives 30 seconds. The instance that makes a change forgets the person's cached access straight away, and every other instance forgets it within 30 seconds. Keycloak tokens live 5 minutes, but a token alone no longer grants anything: the membership is checked in the database.

### 4. Team endpoints

| Endpoint                                                                  | Permission    | Files                                     |
| ------------------------------------------------------------------------- | ------------- | ----------------------------------------- |
| `GET /v1/members`, `GET /v1/members/{id}`                                 | `team:read`   | `modules/team/members.controller.ts`      |
| `PUT /v1/members/{id}/roles`                                              | `team:manage` | `modules/team/member-access.service.ts`   |
| `DELETE /v1/members/{id}`                                                 | `team:manage` | same                                      |
| `POST /v1/members/invites`                                                | `team:manage` | `modules/team/member-invites.service.ts`  |
| `POST /v1/members/invites/{id}/resend`, `DELETE /v1/members/invites/{id}` | `team:manage` | same                                      |
| `GET /v1/roles`, `GET /v1/roles/{id}`, `GET /v1/permissions`              | `team:read`   | `modules/roles/`                          |
| `GET /v1/invitations/{token}`                                             | none (public) | `modules/invitations/`                    |
| `POST /v1/invitations/{token}/accept`                                     | login only    | same                                      |
| `GET /v1/me/permissions`                                                  | any member    | `modules/me/my-permissions.controller.ts` |
| `GET /v1/audit-log`, `GET /v1/audit-log/{id}`                             | `audit:read`  | `modules/audit-log/`                      |

The rules, and where they live:

| Rule                                                                                                                                                                                                                                     | File                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Nobody can give roles holding more than they hold themselves (422 `role_not_found`, 403 `role_exceeds_own_access`)                                                                                                                       | `modules/team/role-assignment.policy.ts`                                   |
| A tenant always keeps at least one active whole-tenant Owner (409 `last_owner`)                                                                                                                                                          | `modules/team/memberships.writer.ts`                                       |
| Inviting someone already in the team: 409 `already_member` / `already_invited`; a removed person can be invited again                                                                                                                    | `modules/team/invitation.saver.ts`                                         |
| The invitation link holds 32 random bytes; only its SHA-256 hash is stored. It expires after 7 days and a resend replaces it                                                                                                             | `modules/team/invitation-token.ts`                                         |
| If the mail server refuses, the invitation is kept and `is_email_sent` is false, so the Owner can resend                                                                                                                                 | `modules/team/invitation.mailer.ts`                                        |
| Only the invited person can accept (403 `invitation_for_someone_else`); an expired link answers 410                                                                                                                                      | `modules/invitations/invitations.service.ts`                               |
| Every change writes `team.member_invited`, `team.invitation_resent`, `team.invitation_cancelled`, `team.invitation_accepted`, `team.member_roles_changed` or `team.member_removed`, with roles before and after, in the same transaction | `modules/team/member-change.recorder.ts`, `common/audit/audit.recorder.ts` |

The audit log list is paged with a cursor (the time and id of the last entry), which stays fast on a large table. Splitting the table by month is left for when it grows.

### 5. The portal

| Step | File                                          | What it does                                                                                                                                               |
| ---- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 23   | `core/permissions/permissions.service.ts`     | Loads `GET /v1/me/permissions` once a tenant is chosen. `can(key)` hides menu items and buttons; the API still decides                                     |
| 24   | `core/permissions/permission.guard.ts`        | Pages with `data: { permission: … }` open only for people holding it                                                                                       |
| 25   | `features/team/team.component.ts`             | The Team page: list, search, invite, change roles, resend, cancel, remove                                                                                  |
| 26   | `features/team/team.store.ts`                 | The page's data and every change, with a message for each outcome                                                                                          |
| 27   | `features/team/invite-dialog.component.ts`    | E-mail and roles. Roles cover the whole tenant until the sites module adds a site picker (the API already takes `site_ids`)                                |
| 28   | `features/invitation/invitation.component.ts` | `/invitations/:token`, outside the login wall: shows the invitation, sends new people to Keycloak's sign-up page with their e-mail filled in, then accepts |
| 29   | `core/tenant/tenant-lost.interceptor.ts`      | If the API says the tenant is gone (the person was removed), forget it and start over                                                                      |
| 30   | `features/audit-log/audit-log.component.ts`   | Newest first, "Show older entries" loads the next page                                                                                                     |
| 31   | `layout/shell.component.html`                 | Team and Audit log in the menu only for people who may open them; a banner when the tenant is suspended                                                    |

## Running it

```sh
cd deploy
./scripts/up.sh --build     # creates the database roles, runs the migrations, starts everything
./scripts/seed-demo.sh      # demo tenants, people and roles
```

Demo users (password `Wattwisely-demo-1`): `owner@acme.test` is Owner of Acme Charging, `tech@acme.test` is a Technician there (no Team page), `multi@demo.test` is Operations at Acme and Owner of Volt Hotels. Invitation e-mails land in Mailpit at <http://localhost:8025>.

**Existing installs.** `up.sh` adds `DB_MIGRATOR_PASSWORD` and `DB_APP_PASSWORD` to `.env` if they are missing. Keycloak imports the realm file only once, so on a server set up with module 1, turn on **User registration** and **Verify email** under Realm settings > Login in the Keycloak admin console. New invitees need both.

For `npm start`, set `COMPOSE_PROFILES=dev` in `deploy/.env`: Postgres is then reachable on `127.0.0.1:5432` and Mailpit's SMTP on `127.0.0.1:1025`. Copy `DB_APP_PASSWORD` into `DATABASE_URL` in `apps/api/.env`.

## Tests

The API tests run against a real Postgres: each test file creates a fresh database and migrates it, exactly as `up.sh` does. Set `TEST_DATABASE_URL` to a superuser connection on a disposable Postgres 16, for example `postgres://postgres:postgres@localhost:5432/postgres`. Without it the database tests are skipped locally; CI starts a Postgres and fails if it is missing.

| Test                                                                                                     | What it proves                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/common/database/row-level-security.spec.ts`                                                | Every table with a `tenant_id` has row-level security and a policy; tenant A cannot read or write tenant B's rows; the audit log cannot be deleted; every granted permission is in the catalog and Owner holds all of them |
| `apps/api/src/app.module.spec.ts`                                                                        | Login and tenant rules from module 1, now from the database; an unverified e-mail never links an account                                                                                                                   |
| `apps/api/src/modules/team/team.flow.spec.ts`                                                            | Invite, e-mail, preview, accept, site-scoped permissions, someone else's invitation, resend and cancel, mail failure, last Owner, removal ending access on the next request                                                |
| `apps/api/src/common/permissions/permission.flow.spec.ts`                                                | Every route declares a known permission; `/v1/me/permissions`; a Technician cannot read the team; a suspended tenant is read-only                                                                                          |
| `apps/api/src/modules/audit-log/audit-log.flow.spec.ts`                                                  | Paging, newest first, no other tenant's entries, before and after on the detail                                                                                                                                            |
| `site-scope.spec.ts`, `permission-set.spec.ts`, `expiring-cache.spec.ts`                                 | Merging role grants across sites and the cache                                                                                                                                                                             |
| `apps/portal/.../permissions.service.spec.ts`, `member-roles.spec.ts`, `tenant-lost.interceptor.spec.ts` | Hiding by permission, keeping a member's sites when editing roles, recovering from a removed tenant                                                                                                                        |

Not yet checked in a real browser against the Docker stack (Docker was not available while building this module): the Keycloak sign-up page reached with `prompt=create`, and the invitation e-mail in Mailpit.

## Not in this module

| What                                                             | Where                       |
| ---------------------------------------------------------------- | --------------------------- |
| Custom roles and the permission matrix screen (M2 stories)       | Later, the tables are ready |
| Choosing sites when inviting                                     | Sites module                |
| Platform admin console (create tenants, suspend, support access) | Admin module                |
| API keys as audit actors                                         | Integrations module         |
| Audit log partitions by month, export, retention                 | When the table grows        |

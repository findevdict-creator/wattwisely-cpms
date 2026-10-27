# Module 19, part 1: driver accounts, invitations and who pays

Until module 18 a driver was a record the operator kept (module 13): a name, some cards, and nothing the driver could log in to. A session was paid either by the card on the QR page (module 6) or not at all, when it was started with an RFID card. This module gives a driver **a login of their own** for the driver app, **linked by an e-mailed invitation** to the record an operator keeps of them, and gives every driver, RFID card and access group a **payment mode** that says who pays for a session: the driver, always, unless an operator has marked the card, the driver or one of their groups **free**. Nothing is free by default, and no session is left unpaid: the platform earns its fee on paid sessions, so paying is the rule and free is a choice an operator makes on purpose.

This is **part 1**: the accounts, the invitations, the driver app's account pages and the payment modes themselves. **Part 2** (the next pull request) brings what the modes decide: a saved card on the driver's account, the hold on a session started with a card, the charger refusing a card whose holder has no way to pay, and the driver's sessions and places in the app.

Stories covered: Olivia opens Dana's page and presses "Invite to the app"; Dana gets an e-mail, taps the link, creates a login with that address (no authenticator app is asked of her) and accepts; both see the link at once, Olivia on Dana's page, Dana under "Your operators"; Dana reads what Acme Charging holds about her, her cards and groups, and can leave; Olivia can unlink her again, or resend and cancel an invitation that was never accepted; the depot's pool van has a card marked free, so whoever drives it charges without a login and without paying; Theo the technician sees that Dana is linked but not her address; Tess from the portal cannot call the driver app's routes with her token, and Dana cannot call the portal's with hers.

## What changed since module 18

| Before (module 18)                                                                 | Now (module 19, part 1)                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A driver was a tenant's record; nobody could log in as one                         | `driver_accounts` (migration 0032): one row per person, global, matched to their Keycloak user by verified e-mail at first login, as `user_accounts` is for staff. `drivers.driver_account_id` and `linked_at` tie a tenant's record to it, at most one record per tenant per account                                  |
| Keycloak had one login flow, and every new user had to set up an authenticator app | Two browser flows: `staff browser` (OTP required, bound to the realm, for the portal and the admin console) and `driver browser` (OTP only when the driver set one up, bound to the new public client `wattwisely-driver`). `CONFIGURE_TOTP` is no longer a default action                                             |
| Every token had the audience `wattwisely-api`                                      | The driver client's tokens carry `wattwisely-driver` instead. The API accepts both, tells them apart (`AuthenticatedUser.audience`), and lets a driver's token open only the routes marked `RouteAccess.driver()`, under `/v1/driver`; a staff token or API key there is 403, a driver token anywhere else is 403      |
| An operator could not reach a driver through the platform                          | `driver_invitations`: `POST /v1/drivers/{id}/invite` e-mails a link to `${DRIVER_URL}/invitations/<token>` (7 days, hash stored, as team invitations); resend, cancel, and `DELETE …/account-link` to unlink; all with the new permission `drivers:invite` (Owner, Operations, Managed operator)                       |
| The driver app had three pages and no login                                        | `/account` (name, phone, the operators linked, log out), `/account/operators/<tenant>` (what that operator holds about the driver, who pays, leave), `/invitations/<token>` (accept with the invited address, or decline), and an account button in the bar. Charging by QR code still needs no login                  |
| Who pays was decided by how the session started: card page paid, RFID card unpaid  | `payment_mode` on `rfid_cards`, `drivers` and `access_groups`: `inherit`, `pay` or `free`; `access_groups.hold_amount` for a hold of the group's own. Every existing row starts on `inherit`; the operator always says `pay`. The portal shows and sets all three (the driver dialog, the card menu, the group dialog) |
| The audit log knew users, API keys and the system as actors                        | `driver` is an actor type too: `drivers.invitation_accepted`, `drivers.invitation_declined` and `drivers.unlinked` (when the driver leaves) are written in the operator's audit log with the driver as actor; `drivers.invited`, `drivers.invitation_resent`, `drivers.invitation_cancelled` by staff                  |

## How a payment mode is resolved

```text
card.payment_mode     ─ pay | free ─▶ that
        │ inherit
driver.payment_mode   ─ pay | free ─▶ that
        │ inherit
any group of the driver says free? ─▶ free      (part 2 also reads the groups' hold_amount)
        │ none
the operator's standard               ─▶ pay
```

Part 1 stores the modes and shows them; part 2 applies the result when a session starts: a `pay` verdict needs a way to pay (the QR page's card, or the saved card of the login behind an RFID card), and a card whose holder has neither is refused by the charger instead of charging for nothing.

## Design decisions

| Decision                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Accounts are global, records stay with the tenant.** One person, one `driver_accounts` row, linked to one `drivers` row per tenant. The tenant's record keeps its name, reference, cards and groups; the account carries what the driver says about themselves. Unlinking changes neither                                                                                     |
| **Nothing is free unless an operator says so.** Every mode starts on `inherit`, and the operator's own answer is always `pay`. Making a card, a driver or a group free is a deliberate setting, visible in the audit log; the platform's fee depends on it                                                                                                                      |
| **A separate Keycloak client and audience, in the same realm.** One realm keeps one identity per e-mail address, so a staff member can also be a driver. The client decides the login flow (no mandatory authenticator app for drivers) and stamps the audience, so the API can keep the two worlds apart without a second issuer                                               |
| **A driver's token opens driver routes only.** `/v1/driver/*` is a world of its own: no `X-Tenant-Id`, no permissions, the driver sees across tenants what is linked to them. Row-level security has a setting for it, `app.driver_account_id`, and a policy on `drivers` that shows the linked rows. Writes into a tenant go through `switchTenant` after the link was checked |
| **The invitation is accepted by address.** The link shows the invitation to anyone; accepting needs a login whose verified e-mail is the one the invitation went to. Keycloak verifies addresses (`verifyEmail`), so a stranger with the link gets 403, not a record                                                                                                            |
| **Resending issues a new link.** The old token stops working, so a forwarded e-mail cannot be used after a resend. Cancelling closes the invitation; inviting again opens a new one                                                                                                                                                                                             |
| **Personal data rules apply to the login too.** Without `drivers:read_personal`, the address the invitation went to and the login's address are hidden, as e-mail and phone are. The status (none, invited, linked) is shown to everyone with `drivers:read`                                                                                                                    |
| **Inviting is its own permission.** `drivers:invite` is held by Owner, Operations and Managed operator; a Technician who may edit drivers at a site cannot reach into their mailbox. It is a whole-tenant permission, as every driver change is                                                                                                                                 |
| **The realm export is for new installations.** Keycloak imports `wattwisely-realm.json` only once. The flows and the client are in it for fresh realms; an existing realm gets them by hand, with the steps in `deploy/README.md`                                                                                                                                               |

## Read the code in this order

### 1. The database: `packages/db`

| Step | File                                                       | What it does                                                                                                                         |
| ---- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | `src/schema/driver-accounts.table.ts`                      | One person who drives: Keycloak id, e-mail (unique, case-insensitive), the name they go by, phone. Global, no row-level security     |
| 2    | `src/schema/drivers.table.ts`                              | `driver_account_id`, `linked_at`, `payment_mode`; the index that allows one record per tenant per account; the policy for the driver |
| 3    | `src/schema/driver-invitations.table.ts`                   | An invitation: the driver, the address, the token hash, who sent it, when it expires, how it ended; readable by its holder           |
| 4    | `src/schema/rfid-cards.table.ts`, `access-groups.table.ts` | `payment_mode` on cards; `payment_mode` and `hold_amount` on groups                                                                  |
| 5    | `src/schema/enums.ts`, `row-level-security.ts`             | `driver_payment_mode`; `driver` as an audit actor; `app.driver_account_id` and `isCurrentDriverAccount`                              |
| 6    | `src/client/database-session.ts`, `transaction-runner.ts`  | `DatabaseSession.forDriverAccount`, and the setting it becomes                                                                       |
| 7    | `migrations/0032_driver_accounts.sql`, `0033_…grants.sql`  | The tables, columns and policies; grants for `wattwisely_app`; `drivers:invite` for the built-in roles                               |

### 2. Keycloak and the login: `deploy/keycloak`, `apps/api/src/common`

| Step | File                                                                    | What it does                                                                                                                                 |
| ---- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `deploy/keycloak/realm/wattwisely-realm.json`                           | The `staff browser` and `driver browser` flows, the realm bound to the first, the `wattwisely-driver` client bound to the second             |
| 2    | `auth/keycloak-token.verifier.ts`, `auth/authenticated-user.factory.ts` | Both audiences are accepted; the token's audience becomes `AuthenticatedUser.audience` (`staff` or `driver`)                                 |
| 3    | `auth/route-access.decorator.ts`, `route-access.reader.ts`              | `RouteAccess.driver()`: a route for driver tokens only                                                                                       |
| 4    | `account/driver-account.resolver.ts`, `driver-accounts.repository.ts`   | The `driver_accounts` row behind a token: found by Keycloak id, else linked by verified e-mail (a seeded row), else created; cached a minute |
| 5    | `tenant/tenant-context.guard.ts`, `staff-context.resolver.ts`           | The gate: driver routes take driver tokens and resolve the account; everything else refuses driver tokens and goes the staff way             |
| 6    | `permissions/permission.guard.ts`, `audit/audit.recorder.ts`            | Driver routes have no permission to check; the driver is the audit actor                                                                     |

### 3. The API, the operator's side: `apps/api/src/modules/drivers/accounts`

| Step | File                                                               | What it does                                                                                                     |
| ---- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| 1    | `driver-invites.controller.ts`                                     | `POST …/invite`, `POST …/invite/resend`, `DELETE …/invite`, `DELETE …/account-link`, all with `drivers:invite`   |
| 2    | `driver-invite.transaction.ts`                                     | One change as one transaction: the permission, the driver before and after, the audit entry, the detail answered |
| 3    | `driver-invites.service.ts`                                        | Invite (the address given, else the driver's), resend with a fresh token, cancel, unlink at the version seen     |
| 4    | `driver-invitations.repository.ts`, `driver-invitation.mailer.ts`  | The invitation rows; the e-mail with the link, in the operator's brand                                           |
| 5    | `../profiles/dto/driver-account-link.dto.ts`, `driver-snapshot.ts` | `account` on every driver answer: status, address, dates; what the audit log keeps of it                         |

### 4. The API, the driver's side: `apps/api/src/modules/driver-app`

| Step | File                                                                  | What it does                                                                                                     |
| ---- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1    | `me/driver-me.controller.ts`, `driver-me.service.ts`                  | `GET`/`PATCH /v1/driver/me`: the account, and the name and phone the driver gives themselves                     |
| 2    | `operators/operator-links.repository.ts`                              | The `drivers` rows linked to the account across tenants, with the operator's name, under `app.driver_account_id` |
| 3    | `operators/operator-link.transaction.ts`                              | Finds the link, then switches the transaction into that tenant; a tenant not linked answers 404                  |
| 4    | `operators/driver-operators.service.ts`, `operator-profile.reader.ts` | The list, the profile (groups and cards as the operator holds them), and leaving                                 |
| 5    | `invitations/driver-invitation.transaction.ts`                        | The invitation by its token (under `app.invite_token_hash`), then the tenant it belongs to                       |
| 6    | `invitations/driver-invitations.service.ts`                           | Preview for anyone; accept only with the invited address, the record not deleted and not yet linked; decline     |
| 7    | `driver-link.writer.ts`                                               | Sets the record's account and writes the audit entry with the driver as actor                                    |

### 5. The driver app: `apps/driver/src/app`

| Step | File                                                                 | What it does                                                                                                    |
| ---- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1    | `core/config/runtime-config.ts`, `docker/40-write-runtime-config.sh` | `config.json` gains the Keycloak address, realm and client                                                      |
| 2    | `core/auth/driver-auth.service.ts`, `driver-auth-config.factory.ts`  | Keycloak through `angular-oauth2-oidc`, PKCE, the requested route kept across the login; `loginAs` for invitees |
| 3    | `core/auth/driver-api.interceptor.ts`, `account.guard.ts`            | The token on `/v1/driver` calls only; the account pages need a login                                            |
| 4    | `core/api/driver-api.service.ts`, `models/driver-account.ts`         | The calls and their shapes                                                                                      |
| 5    | `features/account/account.component.*`, `account.store.ts`           | Who the driver is, their operators, log out                                                                     |
| 6    | `features/account/operator.component.*`, `operator.store.ts`         | One operator: the record it holds, who pays, leave                                                              |
| 7    | `features/invitation/invitation.component.*`, `invitation.store.ts`  | The invitation page: sign up or log in with the invited address, accept or decline                              |

### 6. The portal: `apps/portal/src/app/features/drivers`

| Step | File                                                                           | What it does                                                                              |
| ---- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| 1    | `driver-account-card.component.*`, `invite-driver-dialog.component.ts`         | "App login" on the driver's page: none, invited or linked; invite, resend, cancel, unlink |
| 2    | `driver-form.ts`, `driver-dialog.component.html`                               | The driver's payment mode                                                                 |
| 3    | `card-dialog.component.ts`, `driver.component.*`                               | A card's payment mode when it is registered, and from the card's menu afterwards          |
| 4    | `access-group-form.ts`, `access-group-dialog.component.*`                      | A group's payment mode and its own hold, typed in the payment account's currency          |
| 5    | `../../core/api/drivers-api.service.ts`, `../../shared/payment-mode-labels.ts` | The calls; the words for the modes                                                        |

### 7. Endpoints

| Endpoint                                      | Who                       | Notes                                                                                                                                                                |
| --------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /v1/drivers/{id}/invite`                | `drivers:invite` (tenant) | 201; `email` optional, else the driver's. Answers the driver and `is_email_sent`. 409 `driver_already_linked`, `driver_already_invited`; 422 `driver_email_required` |
| `POST /v1/drivers/{id}/invite/resend`         | `drivers:invite` (tenant) | A fresh link, the old one dead; 409 `driver_not_invited`                                                                                                             |
| `DELETE /v1/drivers/{id}/invite`              | `drivers:invite` (tenant) | 204; 409 `driver_not_invited`                                                                                                                                        |
| `DELETE /v1/drivers/{id}/account-link`        | `drivers:invite` (tenant) | `If-Match`; 204; 409 `driver_not_linked`                                                                                                                             |
| `GET /v1/drivers/{id}`, `GET /v1/drivers`     | `drivers:read`            | Every driver now has `payment_mode` and `account` (`status`, `email`, `invited_at`, `invitation_expires_at`, `is_invitation_expired`, `linked_at`)                   |
| `PATCH /v1/drivers/{id}`, `POST /v1/drivers`  | `drivers:write` (tenant)  | `payment_mode` (`inherit`, `pay`, `free`)                                                                                                                            |
| `POST`, `PATCH /v1/drivers/{id}/cards…`       | `drivers:write` (tenant)  | `payment_mode` on a card                                                                                                                                             |
| `POST`, `PATCH /v1/access-groups…`            | `drivers:write` (tenant)  | `payment_mode`, `hold_amount` (minor units, above zero, or null for the standard hold)                                                                               |
| `GET /v1/driver/invitations/{token}`          | anyone                    | Operator, driver name, address, who invited, `expires_at`, `is_expired`; 404 `invitation_not_found` once it was answered, cancelled or replaced                      |
| `POST /v1/driver/invitations/{token}/accept`  | driver token              | 200 with `operator`; 403 `invitation_for_someone_else`, `email_unverified`; 410 `invitation_expired`; 409 `invitation_stale`, `account_already_linked`               |
| `POST /v1/driver/invitations/{token}/decline` | driver token              | 204                                                                                                                                                                  |
| `GET`, `PATCH /v1/driver/me`                  | driver token              | `display_name`, `phone`; the e-mail is Keycloak's                                                                                                                    |
| `GET /v1/driver/operators`                    | driver token              | Every operator linked: `tenant_id`, `operator_name`, `driver_name`, `reference`, `status`, `payment_mode`, `linked_at`                                               |
| `GET /v1/driver/operators/{tenantId}/profile` | driver token              | The above with `email`, `phone`, `groups`, `cards`; 404 `operator_not_found` when not linked                                                                         |
| `DELETE /v1/driver/operators/{tenantId}`      | driver token              | 204: the driver leaves; the record stays                                                                                                                             |

A staff token or an API key on a `/v1/driver` route is 403 `staff_token_not_allowed`; a driver token elsewhere is 403 `driver_token_not_allowed`.

## Running it

Apply the migrations as always. The API reads `KEYCLOAK_DRIVER_AUDIENCE` (default `wattwisely-driver`); the `driver` container reads `DRIVER_KEYCLOAK_URL`, `DRIVER_KEYCLOAK_REALM` and `DRIVER_KEYCLOAK_CLIENT_ID`; `deploy/.env` has `DRIVER_DEV_URL` for a second allowed address while developing (`install.sh --local` sets `http://localhost:4300`). Keycloak gets the `wattwisely-driver` client and the two flows from the realm file on a fresh installation; an existing realm needs the steps in `deploy/README.md`.

The demo data gives Dana a login, `dana@acme.test` (password `Wattwisely-demo-1`), already linked to her record: open `http://charge.localhost/account`, log in (no authenticator app is asked), and Acme Charging is listed; open it to see her cards and groups, or leave. On Priya's page in the portal, `owner@acme.test` presses "Invite to the app"; the e-mail lands in Mailpit, and its link leads to the invitation page. The pool van's card `DEMO-CARD-5` is free:

```sh
npm run sim -- --url ws://ocpp.localhost/ocpp --identity WW-7KQ4M2XR9T --tag DEMO-CARD-5   # Accepted, and free of charge once part 2 applies the modes
```

## Tests

| Spec                                                                    | What it proves                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/api/src/modules/drivers/accounts/driver-accounts.flow.spec.ts`    | Staff and driver tokens kept apart; an account at first request; invite once, preview for anyone, hidden address for a technician; accept by the right address, both sides linked, the audit trail; unlink at the version seen |
| `apps/api/src/modules/drivers/accounts/driver-invitations.flow.spec.ts` | Resend with a fresh link, cancel, what is refused; decline and leave from the driver's side; an address needed, a linked driver refused; payment modes on drivers, cards and groups, inherit by default, a hold above zero     |
| `apps/api/src/common/permissions/permission.flow.spec.ts`               | Every route declares who may call it, `RouteAccess.driver()` included                                                                                                                                                          |
| `apps/driver/src/app/core/auth/driver-api.interceptor.spec.ts`          | The token goes to `/v1/driver` calls only, and not while logged out                                                                                                                                                            |
| `apps/portal/src/app/features/drivers/driver-form.spec.ts`              | The driver form carries the payment mode                                                                                                                                                                                       |

The database-backed specs need `TEST_DATABASE_URL`, as before.

## Not in this part

- Part 2 of this module: the saved card on the driver's account (a platform Stripe customer), the hold on a session started with an RFID card and its release, the charger refusing a card whose holder cannot pay, `charging_sessions.start_source` and the rule applied, the driver's sessions, receipts and places in the app, Settings > Payments for the operator, and the rate limits of the driver routes.
- Cards a driver orders or blocks themselves, and a virtual card (a token the app presents instead of an RFID card).
- A staff member's and a driver's login being the same Keycloak user is allowed, but the portal and the driver app are separate sessions; nothing shows one's role in the other.
- Deleting a driver account (the data retention policy), and merging two accounts with different addresses.

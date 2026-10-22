# Module 6: card payments through Stripe Connect

Module 5 priced every charging session. This module lets a driver **pay for one by card**, with the money going straight to the operator: each tenant connects its own **Stripe Express account** (Stripe Connect, "direct charges"), a driver's page puts a **hold** on the card before the charger starts, the worker **captures the final price** from the hold once the session is priced and releases the rest, and staff see every payment next to its session and can **refund** it, with a second person approving large refunds. Everything talks to Stripe through one interface (`packages/payments`), so another provider or a managed-payments mode can be added later without touching sessions, the worker or the portal.

Stories covered: an owner connects the company to Stripe from the portal, finishes onboarding on Stripe's own pages and sees whether payments are enabled; a driver at a public charger starts a paid session without an account, confirms a hold of the company's chosen amount, charges, and is charged the receipt's total (never more than the hold); a card that is refused, a driver who never confirms, or a charger that does not start all end the session without taking money; staff see the payment on the session page and in a Payments list, request refunds, and approve each other's large ones. Webhooks from Stripe are verified, stored once and handled even when they arrive twice or out of order.

## What changed since module 5

| Before (module 5)                                                           | Now (module 6)                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Every session started at `charging`, when the charger sent StartTransaction | A paid session starts at `authorising` before the charger knows about it, moves to `starting` when the hold is confirmed (RemoteStart is sent), and to `charging` when the charger's StartTransaction **adopts** it. `ocpp_transaction_id` and `meter_start_wh` are empty until then |
| The state machine had `authorising` and `starting` but nothing used them    | New events `hold_requested` (a paid session is born) and `start_rejected` (the charger refused the start); `declined`, `start_timeout` and `transaction_started` from `starting` are in use                                                                                          |
| Sessions had no payment                                                     | `payments` (one pre-authorisation per paid session), `refunds`, `payment_accounts` (one Stripe account per tenant), `payment_webhook_events` (every event once); `charging_sessions.is_paid`; `tenants.payment_mode` (`direct` for everyone in M1)                                   |
| The worker ran three session jobs                                           | Three more: capture or release once a paid session is closed, give up on sessions that never start, retry webhook events; the live cost job stops the charger at 90% of the hold                                                                                                     |
| The API served staff only                                                   | `POST /v1/public/charges` and `/v1/public/charges/{key}` serve the driver's page with no login; `POST /v1/webhooks/stripe` serves Stripe; the raw request body is kept for the signature check                                                                                       |
| `payments:approve_refund` was in the design, not in the code                | It is in the permission catalogue and granted to Owner and Finance by migration 0010                                                                                                                                                                                                 |

## The flow at a glance

```mermaid
sequenceDiagram
    participant Driver as Driver's page
    participant API
    participant Stripe
    participant DB as Postgres
    participant Gateway as ocpp-gateway
    participant Charger
    participant Worker as worker

    Driver->>API: POST /v1/public/charges {charger_identity, ocpp_connector_id}
    API->>DB: session at authorising (tariff version copied, is_paid), history: hold_requested
    API->>Stripe: PaymentIntent capture_method=manual, on the tenant's account (hold:<session>)
    API->>DB: payments row: pending, hold amount, access key hash
    API-->>Driver: charge_key, client_secret, publishable_key, provider_account_id
    Driver->>Stripe: confirm the card (Stripe.js, stripeAccount)
    Driver->>API: POST /v1/public/charges/{key}/check
    API->>Stripe: read the PaymentIntent
    API->>DB: payment authorised (card brand, last 4); session → starting; charger_commands remote_start (NOTIFY)
    Stripe-->>API: webhook payment_intent.amount_capturable_updated (same result, no change)
    Gateway->>Charger: RemoteStartTransaction with the session's tag
    Charger->>Gateway: StartTransaction
    Gateway->>DB: the waiting session gets the transaction id and start reading → charging
    loop every 30 s
        Worker->>DB: cost so far; at 90% of the hold → remote_stop, once
    end
    Charger->>Gateway: StopTransaction, then the car leaves
    Worker->>DB: final price → completed, closed_at (module 5)
    loop every 30 s
        Worker->>Stripe: capture min(price, hold) (capture:<session>), or cancel when 0
        Worker->>DB: payment captured or released, NOTIFY session.updated with payment_status
    end
```

## Design decisions for M1

| Decision                                                                                                                                                                                                                                                                                                                                                                                                        | Why                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Direct payments only.** Each tenant has its own Stripe Express account; holds, captures and refunds happen on that account (`stripeAccount` header). The platform never holds the money. `tenants.payment_mode` exists (`direct`, `own_provider`, `managed`) but only `direct` works                                                                                                                          | The design's M1 scope; the other modes need the platform to be a merchant                                                                    |
| **One interface, two libraries.** `packages/payments` holds the `PaymentGateway` interface and everything that uses it (stores, flows, webhooks); `packages/payments-stripe` is the only code that imports `stripe`. The API and the worker provide the gateway under the `PAYMENT_GATEWAY` token; tests provide `FakePaymentGateway`                                                                           | Another provider is a second small library; sessions, the worker and the portal never change                                                 |
| **A paid session is created before the hold**, at `authorising`, by the API (`PaidSessionOpener`), with the tariff version copied as the gateway does. The gateway adopts it at StartTransaction (`SessionsRepository.findWaiting` / `adopt`) by connector and remote-start command                                                                                                                             | The payment needs a session to belong to; the price must use the tariff in force when the driver agreed to pay                               |
| **The driver's page has no login.** It holds a **charge key**: the tenant id, the payment id and a 24-byte secret packed into 75 URL characters; only the SHA-256 of the secret is stored. Anyone without it gets 404                                                                                                                                                                                           | Drivers scan a QR code and pay; an account comes with the drivers module                                                                     |
| **The hold is the company's choice** (`payment_accounts.hold_amount`, default 50.00). The live cost job asks the charger to stop once the cost reaches 90% of it, once                                                                                                                                                                                                                                          | The design's rule: never a bill the hold cannot cover, and the driver knows the most they can be charged                                     |
| **Capture = the receipt's total, never more than the hold.** Above the hold the whole hold is captured and the payment is flagged `capture_above_hold` for finance. A price of 0 (or a failed session) releases the hold                                                                                                                                                                                        | Stripe cannot capture more than was authorised; a person decides what to do about the difference                                             |
| **Capture waits for `closed_at`,** that is for module 5's finaliser, and the worker retries a failed capture with a growing wait (1, 2, 4… minutes, at most 4 hours) for 72 hours, then leaves it `capture_failed`                                                                                                                                                                                              | Card holds last about 7 days; 72 hours of retries leaves time for a person                                                                   |
| **Idempotency keys are the session's or the refund's:** `hold:<session>`, `capture:<session>`, `cancel:<session>`, `refund:<refund>`, `account:<tenant>`                                                                                                                                                                                                                                                        | A crash between the Stripe call and the database write can never charge twice                                                                |
| **Webhooks are verified, stored, then handled.** The signature is checked over the raw body (5-minute tolerance); the event is inserted into `payment_webhook_events` (`unique(provider, event_id)`, a duplicate is answered `duplicate`); handling happens in the request, and an event that could not be handled stays unprocessed for the worker's retry job. Stripe gets 200 as soon as the event is stored | Stripe resends until it gets 200; storing first means nothing is lost and nothing is handled twice                                           |
| **The webhook finds its tenant through the connected account.** `DatabaseSession.forProviderAccount(acct)` sets `app.provider_account_id`; a row-level policy on `payment_accounts` shows exactly that row                                                                                                                                                                                                      | Webhooks carry no tenant; the lookup stays inside row-level security like the charger identity lookup in module 4                            |
| **The page checks, the webhook confirms.** After the card form, the page calls `/check`, which reads the hold from Stripe and applies it; the webhook later applies the same state and changes nothing (`HoldAuthoriser` is idempotent)                                                                                                                                                                         | The charger starts within a second instead of waiting for a webhook; a lost webhook is harmless                                              |
| **Giving up:** no card within 15 minutes (`declined`), the charger rejects the start (`start_rejected`), or no StartTransaction 90 seconds after the hold (`start_timeout`). The session ends `not_started`, the queued command expires, and the settler releases the hold                                                                                                                                      | The design's windows; a driver is never left with a hold on a session that never began                                                       |
| **Refunds run in the API request** (the design has them in a job): up to 100.00 at once by anyone with `payments:refund` at the site; above that a second person with `payments:approve_refund`, never the requester, approves. Never more than captured minus refunds done or waiting                                                                                                                          | Stripe answers a refund in well under a second; a job would only add a wait. The two-person rule is the design's                             |
| **Stripe keys are environment variables** (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`), empty meaning "no card payments": the API answers 503 `payments_unavailable`, everything else works                                                                                                                                                                                         | The design names OpenBao for secrets; the stack's secrets are all environment variables so far, and this follows suit until a secrets module |
| **No pg-boss or queue.** The payment jobs are interval jobs like module 5's, tenant by tenant, each payment locked with `FOR UPDATE SKIP LOCKED`                                                                                                                                                                                                                                                                | Same shape as the rest of the worker; a queue can come when the job count asks for it                                                        |
| **Only test mode.** Nothing in this module was run against live Stripe: unit tests use Stripe's own signature helper on made-up events, flow tests use `FakePaymentGateway`                                                                                                                                                                                                                                     | Live Stripe needs a real company account; the adapter is thin and every call is covered by the fake                                          |

## Read the code in this order

### 1. The database: `packages/db`

| Step | File                                                                     | What it does                                                                                                                                               |
| ---- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `src/schema/payment-accounts.table.ts`                                   | One connected account per tenant: status (`pending`, `active`, `restricted`), what Stripe still needs, the hold amount; the provider-account lookup policy |
| 2    | `src/schema/payments.table.ts`, `refunds.table.ts`                       | A payment (hold, authorised, captured, refunded amounts, card, access key hash, retry bookkeeping) and its refunds (two-person rule columns)               |
| 3    | `src/schema/payment-webhook-events.table.ts`                             | Every provider event once; global, no tenant                                                                                                               |
| 4    | `src/schema/charging-sessions.table.ts`, `tenants.table.ts`, `enums.ts`  | `is_paid`, nullable transaction id and start reading; `payment_mode`; the new enums                                                                        |
| 5    | `src/client/database-session.ts`, `transaction-runner.ts`                | `forProviderAccount`: the webhook's way into the right tenant                                                                                              |
| 6    | `migrations/0009_stripe_payments.sql`, `0010_stripe_payments_grants.sql` | Generated tables and columns; grants for the app role and `payments:approve_refund` for Owner and Finance                                                  |
| 7    | `src/testing/test-payments.ts`, `test-sessions.ts`                       | Accounts and payments as test data; sessions the charger has not started (`hasStarted: false`)                                                             |

### 2. The payments library: `packages/payments`

| Step | File                                                                       | What it does                                                                                                                                         |
| ---- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8    | `gateway/payment-gateway.ts`, `payment-gateway.error.ts`                   | The interface: accounts and links, holds (create, read, capture, cancel), refunds, webhooks; errors with a code and whether a retry makes sense      |
| 9    | `gateway/charge-key.ts`                                                    | The driver's key: issue, parse, check in constant time                                                                                               |
| 10   | `store/*`                                                                  | Reads and writes on the four tables; `AccountStatusPolicy` turns Stripe's flags into a status                                                        |
| 11   | `flow/paid-session-opener.ts`, `command-queuer.ts`, `session-announcer.ts` | A session at `authorising`; RemoteStart and RemoteStop queued like the API does; `session.updated` with `payment_status`                             |
| 12   | `flow/hold-authoriser.ts`                                                  | What a hold's state means for the payment and the session: authorised → starting + RemoteStart; failed → not_started; captured or cancelled recorded |
| 13   | `flow/capture-policy.ts`, `payment-settler.ts`                             | The money rules (90%, never above the hold, retry waits, 72 hours) and settling one payment                                                          |
| 14   | `flow/hold-watcher.ts`, `start-watchdog.ts`                                | The auto-stop at 90%; giving up on sessions that never start                                                                                         |
| 15   | `flow/refund-policy.ts`, `refund-recorder.ts`                              | Who may refund what; recording the provider's answer                                                                                                 |
| 16   | `webhooks/webhook-inbox.ts`, `webhook-processor.ts`                        | Verify, store once, handle; the tenant from the connected account                                                                                    |
| 17   | `testing/fake-payment.gateway.ts`                                          | The provider in memory: `confirm`, `decline`, `enable`, an `outage`, and fake signed webhooks                                                        |

### 3. Stripe: `packages/payments-stripe`

| Step | File                             | What it does                                                                                                                                            |
| ---- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 18   | `src/stripe-mapper.ts`           | Stripe's PaymentIntent, Account, Refund and Event into the platform's words                                                                             |
| 19   | `src/stripe-gateway.ts`          | Express accounts, Account Links, login links, PaymentIntents with `capture_method: manual` on the connected account, idempotency keys, `constructEvent` |
| 20   | `src/payment-gateway.factory.ts` | Stripe with keys, `DisabledPaymentGateway` without                                                                                                      |

### 4. The gateway: `apps/ocpp-gateway/src`

| Step | File                                                      | What it does                                                                                                |
| ---- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 21   | `storage/sessions.repository.ts` (`findWaiting`, `adopt`) | The `starting` session on this connector or behind this remote-start command, and giving it the transaction |
| 22   | `sessions/session-opener.ts`                              | Adopt the waiting session, else open a new one as before                                                    |

### 5. The worker: `apps/worker/src`

| Step | File                                    | What it does                                                                        |
| ---- | --------------------------------------- | ----------------------------------------------------------------------------------- |
| 23   | `payments/payment-jobs.module.ts`       | The gateway from `STRIPE_SECRET_KEY`, and the three jobs                            |
| 24   | `payments/payment-settle.job.ts`        | Every 30 seconds: closed paid sessions are captured or released; failures retried   |
| 25   | `payments/session-start-timeout.job.ts` | Every 15 seconds: `authorising` and `starting` sessions checked against the windows |
| 26   | `payments/webhook-retry.job.ts`         | Every minute: stored events nobody could handle yet                                 |
| 27   | `sessions/live-cost.job.ts`             | Calls `HoldWatcher` after each cost update                                          |

### 6. The API: `apps/api/src/modules/payments`

| Step | File                                                          | What it does                                                                                                     |
| ---- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 28   | `payment-gateway.provider.ts`, `../../config/api.config.ts`   | The gateway from the three Stripe settings; `rawBody: true` in `api.server.ts`                                   |
| 29   | `account/payment-account.service.ts`                          | Connect (Express account), onboarding and dashboard links, refresh, the hold amount with If-Match; audit entries |
| 30   | `public/public-charge.service.ts`, `charge-place.lookup.ts`   | The driver's start (charger by identity, free connector, active account, tariff), status and check               |
| 31   | `webhooks/stripe-webhook.controller.ts`, `webhook.service.ts` | `POST /v1/webhooks/stripe`: raw body and `stripe-signature` into the inbox                                       |
| 32   | `payments/payments.repository.ts`, `payments.service.ts`      | Payments joined to where the session happened, site-scoped like sessions                                         |
| 33   | `refunds/refunds.service.ts`, `refund-executor.ts`            | Request, approve, cancel; the Stripe call inside the same transaction                                            |
| 34   | `../sessions/dto/session-payment.dto.ts`                      | The payment on `GET /v1/sessions/{id}`                                                                           |

### 7. Endpoints

| Endpoint                                                          | Permission                | Notes                                                                                                                                                                    |
| ----------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /v1/payment-account`                                         | `settings:payments`       | `status` is `not_connected`, `pending`, `active` or `restricted`; `is_provider_enabled` false when the API has no Stripe keys                                            |
| `POST /v1/payment-account` `{country}`                            | `settings:payments`       | Whole company. Opens the Express account; 409 `payment_account_exists`                                                                                                   |
| `POST /v1/payment-account/onboarding-link`, `dashboard-link`      | `settings:payments`       | One-time URLs; onboarding returns to `PORTAL_URL/payments?stripe=return` (or `refresh` when the link expired)                                                            |
| `POST /v1/payment-account/refresh`                                | `settings:payments`       | Re-reads the account from Stripe                                                                                                                                         |
| `PATCH /v1/payment-account` `{hold_amount}`                       | `settings:payments`       | If-Match; 1.00 to 1000.00                                                                                                                                                |
| `POST /v1/public/charges` `{charger_identity, ocpp_connector_id}` | public                    | 201 with `charge_key`, `client_secret`, `publishable_key`, `provider_account_id`; 409 `connector_busy`, `payments_not_accepted`, `no_tariff`; 503 `payments_unavailable` |
| `GET /v1/public/charges/{key}`                                    | public (the key)          | Session and payment status, energy, cost so far, card; 404 for any key not issued                                                                                        |
| `POST /v1/public/charges/{key}/check`                             | public (the key)          | Reads the hold from the provider now and applies it                                                                                                                      |
| `POST /v1/webhooks/stripe`                                        | public (signature)        | 200 `{outcome: processed \| duplicate \| deferred}`; 400 `invalid_signature`                                                                                             |
| `GET /v1/payments`, `GET /v1/payments/{id}`                       | `payments:read`           | At the caller's sites. `site_id`, `session_id`, `status` (comma list), `from`, `to`, `limit`, `cursor`; the detail lists its refunds                                     |
| `POST /v1/payments/{id}/refunds` `{amount, reason}`               | `payments:refund`         | 201 `succeeded` or `awaiting_approval`; 409 `payment_not_refundable`; 422 `refund_too_large`                                                                             |
| `GET /v1/refunds?status=awaiting_approval`                        | `payments:read`           | The approval queue                                                                                                                                                       |
| `POST /v1/refunds/{id}/approve`                                   | `payments:approve_refund` | 403 `refund_own_request` for the requester; 409 `refund_not_awaiting_approval`                                                                                           |
| `POST /v1/refunds/{id}/cancel`                                    | `payments:refund`         | Only while awaiting approval                                                                                                                                             |

### 8. The portal

| Step | File                                                                                             | What it does                                                                                                             |
| ---- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| 35   | `core/api/models/payment.ts`, `payments-api.service.ts`                                          | The payment account, payments and refunds as the API sends them                                                          |
| 36   | `features/payments/payment-account-card.component.ts`, `payment-account-action.ts`               | The Stripe account card: one button for the next step (connect, continue setup, fix, open dashboard); handles `?stripe=` |
| 37   | `features/payments/connect-stripe-dialog.component.ts`, `hold-amount-dialog.component.ts`        | Country of registration; the card hold                                                                                   |
| 38   | `features/payments/payments.component.ts`, `payments.store.ts`                                   | The Payments page: refunds waiting for approval (Approve, Cancel), the payments table with a status filter               |
| 39   | `features/sessions/session-payment.component.ts`, `features/payments/refund-dialog.component.ts` | The Payment card on a session with its refunds, and the Refund dialog                                                    |
| 40   | `shared/status-labels.ts`, `status-chip.component.ts`                                            | Words and colours for payment, refund and account statuses; new failure reasons and the `capture_above_hold` flag        |

The driver's page itself (the QR landing page that embeds Stripe's card form) is the driver web app, module 7. The public endpoints can also be driven with `curl` and Stripe's test cards: create the charge, open Stripe.js with `publishable_key` and `stripeAccount: provider_account_id`, call `stripe.confirmCardPayment(client_secret, …)`, then `POST …/check`.

## Running it

```sh
cd deploy
# In deploy/.env: STRIPE_SECRET_KEY=sk_test_…, STRIPE_PUBLISHABLE_KEY=pk_test_…, and the
# signing secret of a Connect webhook endpoint for https://API_HOST/v1/webhooks/stripe.
./scripts/up.sh --build     # runs migrations 0009 and 0010
```

Log in as `owner@acme.test`, open Payments, click Connect Stripe, and finish Stripe's test-mode onboarding (any test data; the bank account `GB82WEST12345698765432`). Back in the portal the card shows "Taking payments". Then start a paid charge against a Riverside charger with the simulator connected (module 4):

```sh
curl -s -X POST https://API_HOST/v1/public/charges \
  -H 'content-type: application/json' \
  -d '{"charger_identity":"WW-DEMO-1","ocpp_connector_id":1}'
```

Confirm the returned `client_secret` with Stripe.js and the test card `4242 4242 4242 4242`, call `POST /v1/public/charges/<charge_key>/check`, and the charger receives RemoteStartTransaction. When the session ends and is priced, the worker captures the total within a minute; the session page shows the payment. For local development use `stripe listen --forward-to localhost:3000/v1/webhooks/stripe` and put its signing secret in `apps/api/.env`.

Settings: the API reads `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`; the worker reads `STRIPE_SECRET_KEY` and `PAYMENT_SETTLE_INTERVAL_MS`, `SESSION_START_TIMEOUT_INTERVAL_MS`, `PAYMENT_WEBHOOK_RETRY_INTERVAL_MS`.

## Tests

| Test                                                                   | What it proves                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/payments/src/**/*.spec.ts`                                   | The charge key round trip and refusal; capture never above the hold and the flag; the 90% rule; retry waits and the 72-hour limit; who may refund and approve; the account status                                                             |
| `packages/payments-stripe/src/stripe-gateway.spec.ts`                  | Stripe-signed events (Stripe's own test signature helper) translated: a confirmed hold with its card, a refused card, captured and cancelled, an account update, a refund; forged, stale and unconfigured signatures refused                  |
| `packages/session-engine/src/state/session-state-machine.spec.ts`      | The new moves: `hold_requested`, `start_rejected`, `transaction_started` from `starting`                                                                                                                                                      |
| `apps/ocpp-gateway/src/sessions/paid-session.flow.spec.ts`             | With a simulated charger: a session waiting at `starting` gets the StartTransaction's transaction id and start reading and moves to `charging`; no second session is opened                                                                   |
| `apps/worker/src/payments/payment-settle.flow.spec.ts`                 | The worked example captured at 8.80 only once priced, with the session's idempotency key; a 5.00 hold captured in full and flagged when the price was 8.80; the hold of a session that never started released                                 |
| `apps/worker/src/payments/payment-watch.flow.spec.ts`                  | No card after 15 minutes → `declined`; no start after 90 seconds → `start_timeout` and the command expired; the stop at 90% of the hold sent once; a stored webhook event handled by the retry job                                            |
| `apps/api/src/modules/payments/payment-account.flow.spec.ts`           | Connect, onboarding link, the `account.updated` webhook (processed, then duplicate, forged → 400), status active; the hold changed with If-Match and audited                                                                                  |
| `apps/api/src/modules/payments/public-charge.flow.spec.ts`             | A driver's start (hold, key, client secret), a second start refused while busy, the check that sends RemoteStart with the session's tag, a declined card ending the session, the payments list within one's sites, the payment on the session |
| `apps/api/src/modules/payments/refunds.flow.spec.ts`                   | A small refund at once; a large one waiting, cancelled, requested again, refused for the requester, approved by another owner; never more than what is left; the audit trail                                                                  |
| `apps/portal/src/app/features/payments/payment-account-action.spec.ts` | The next step for each account status and what `?stripe=return                                                                                                                                                                                | refresh` means |

Nothing was run against live Stripe, and the portal's new pages were checked against the API's contract, not in a browser against Stripe's hosted onboarding. The simulator, the fake provider and Stripe's signature helper stand in.

## Not in this module

| What                                                                                             | Where                                                                                         |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| The driver's page (QR landing, Stripe's card form, the receipt), driver accounts and saved cards | Drivers module; the public endpoints and the charge key are its API                           |
| Managed payments and a tenant's own provider (`payment_mode` other than `direct`), platform fees | M2; the `PaymentGateway` interface and `payment_mode` are the seams                           |
| Disconnecting a Stripe account (`DELETE /v1/payment-account` in the API design)                  | Later, with the rules for open holds and pending refunds                                      |
| Open balances when a capture fails for good, and blocking that card from new sessions            | Drivers and billing modules; `capture_failed` payments are listed for finance                 |
| Refunds as a background job, secrets in OpenBao, a job queue                                     | Later; see the decisions above                                                                |
| Disputes, payouts, Stripe Tax, receipts by e-mail                                                | Stripe's Express dashboard (linked from the portal) for now; notifications module for e-mails |

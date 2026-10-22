# Module 7: the driver's QR charge page

Module 6 built the public charge API and left the page that uses it for later. This module is that page: a **driver web app** (`apps/driver`) that a phone opens after scanning the **QR code on a plug**. The driver sees where they are, the prices in force, whether the plug is free and whether cards are taken; pays with Stripe's card form; watches the charge run with the cost so far; can **stop** it from the phone; and gets the **receipt** once the session is priced, all without an account. The portal shows the QR code of every plug and prints a sheet of stickers. Everything a driver can reach is a **public endpoint keyed by the charge key** from module 6; nothing about drivers is stored.

Stories covered: a driver scans a sticker at a public charger, sees "Available, 0.30 per kWh now (Off-peak), 0.40 from 17:00", pays, plugs in and the charger starts; the page follows the charge (energy, time, cost so far, the hold), and the driver stops it from the phone or just unplugs; the receipt shows the lines, tax and the amount taken from the card; a plug that is busy, faulted, switched off or on a charger that is offline says so instead of a pay button; a site without a tariff, or an operator not yet taking payments, says so; the driver finds the charge again from the app's home page or by typing the charger id and plug from the sticker; an operator opens a charger in the portal and prints the stickers for its plugs.

## What changed since module 6

| Before (module 6)                                                          | Now (module 7)                                                                                                                                                                                                     |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The public charge endpoints could only be driven with `curl` and Stripe.js | `apps/driver`, a third Angular app, served at `charge.<domain>` (`DRIVER_HOST`); the QR code on a plug opens `/c/<charger id>/<plug>`                                                                              |
| Nothing public described a plug                                            | `GET /v1/public/places/{identity}/{connector}`: operator, site and address, plug type and power, availability, the tariff with its bands and the band in force now, the hold amount, whether cards are accepted    |
| A driver could only stop by unplugging                                     | `POST /v1/public/charges/{key}/stop` queues a RemoteStop for the session's transaction, once                                                                                                                       |
| `GET /v1/public/charges/{key}` gave the status, energy and cost so far     | Also the operator and site, the plug, start and end times, why a session ended without a charge, whether it can be stopped and whether a stop is waiting, and the **receipt** (lines, net, tax, gross) once priced |
| QR codes were not in the product                                           | `GET /v1/chargers/{id}/qr-codes`: one SVG per plug, drawn by the API from `DRIVER_URL`; the portal's charger page shows them and prints a sticker sheet                                                            |
| One Compose service per app: api, portal, ocpp-gateway, worker             | A `driver` service (nginx, like the portal) behind Caddy at `DRIVER_HOST`; the API's `DRIVER_URL` and CORS include it; `images.yml` builds a fifth image                                                           |

## The flow at a glance

```mermaid
sequenceDiagram
    participant Phone as Driver's phone (apps/driver)
    participant API
    participant Stripe
    participant Gateway as ocpp-gateway + charger
    participant Worker as worker

    Phone->>API: GET /v1/public/places/WW-7KQ4M2XR9T/1 (the QR code's address)
    API-->>Phone: site, plug, availability, tariff (band in force now), hold, cards accepted?
    Phone->>API: POST /v1/public/charges {charger_identity, ocpp_connector_id} (module 6)
    API-->>Phone: charge_key, client_secret, publishable_key, provider_account_id
    Note over Phone: /charges/<key>; the key is remembered on the phone
    Phone->>Stripe: Payment Element, confirmPayment (redirect only if the bank insists)
    Phone->>API: POST /v1/public/charges/{key}/check
    API->>Gateway: remote_start (module 6)
    loop every 3 s until the charge is over
        Phone->>API: GET /v1/public/charges/{key}
        API-->>Phone: status, energy, cost so far, can_stop, receipt once priced
    end
    Phone->>API: POST /v1/public/charges/{key}/stop
    API->>Gateway: remote_stop for the session's transaction (once)
    Gateway-->>API: StopTransaction → session completed
    Worker->>API: price (module 5), capture min(price, hold) (module 6)
    API-->>Phone: receipt and "Paid 8.80 with Visa ···· 4242"
```

## Design decisions for M1

| Decision                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A separate web app, not pages in the portal.** Drivers have no account and no Keycloak; the app has no login code at all, no Material tables, and one 515 kB bundle. It is the foundation of the later driver app: driver accounts, saved cards and RFID cards plug into the same pages                                                |
| **The sticker carries a plain address**, `https://charge.<domain>/c/<charger id>/<plug>`, nothing signed: a plug is public knowledge, and nothing happens until a card is confirmed. The home page lets a driver type the two values if the code is damaged                                                                              |
| **The API draws the QR codes** (`qrcode` package, SVG, error correction M) so the portal, a later admin console or a print shop get the same thing from one place, and `DRIVER_URL` lives in one setting. No files are stored                                                                                                            |
| **The place endpoint is public and tells the truth about availability** in one word (`available`, `busy`, `offline`, `out_of_service`, `faulted`), derived from the charger's connection lease, the connector's OCPP status and whether a session is open on the plug (`PlaceAvailabilityPolicy`). It never says who is charging         |
| **Prices are shown from the tariff that applies now**, with the band in force at the site's local time (`CurrentBandFinder` reuses `BandMatcher` and `LocalClock` from `packages/pricing`). Unit prices come as decimal strings, as the portal gets them; amounts (start fee, caps, the hold) as numbers in the tariff's currency        |
| **Cards are accepted when** the API has Stripe keys, the operator's account can take payments (`AccountStatusPolicy.canTakePayments`) and the site has a tariff. Otherwise the page explains which is missing in the driver's words and shows no pay button; the API would refuse the start anyway (module 6)                            |
| **Stopping is a public action with the charge key.** Only an active session with an OCPP transaction can be stopped; the command is queued once (`StopCommandLookup` finds a queued, sent or accepted remote_stop for the session), and `is_stop_requested` lets the page say "Stopping…" without pressing twice. Unplugging still works |
| **The charge page polls** `GET /v1/public/charges/{key}` every 3 seconds while the charge is live and stops once the session is over and the payment is captured, released or failed. No WebSocket for drivers in M1: the API's live events are per tenant and need a login                                                              |
| **The phone remembers its charges** (the last 20 charge keys in `localStorage`, newest first) so a driver who closed the browser finds the charge and the receipt again. The key is the only secret; it never leaves the phone except to the API                                                                                         |
| **Stripe's Payment Element with `redirect: 'if_required'`.** Most cards confirm in place; a bank that insists on a redirect returns to `/charges/<key>?returned=1`, and the page calls `/check` to apply the hold. The element is created on the operator's connected account (`stripeAccount`), as module 6 requires                    |
| **The receipt is the stored one.** `ChargeReceiptLookup` reads `charging_sessions` totals and `session_line_items`; nothing is priced in the API request. Before the worker prices the session the page shows the cost so far from module 5's live cost job                                                                              |
| **`DRIVER_URL` is required** in the API's settings (the QR codes are meaningless without it); `apps/driver` reads `config.json` for the API's address, written at container start from `DRIVER_API_URL`, exactly like the portal                                                                                                         |

## Read the code in this order

### 1. The API: `apps/api/src/modules/drivers` and `payments/public`

| Step | File                                                                                           | What it does                                                                                                                                                                                |
| ---- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `drivers/drivers.module.ts`                                                                    | The module: three controllers; imports `PaymentsModule` for the gateway, the place lookup and the charge view, `AssetsModule` for chargers and connectors                                   |
| 2    | `drivers/places/public-place.service.ts`                                                       | `GET /public/places/{identity}/{connector}`: finds the charger by identity (no tenant yet), then works inside the tenant: connector, site, tariff, availability, whether cards are accepted |
| 3    | `drivers/places/place-availability.ts`                                                         | The one word for the plug, in order: offline, faulted, out of service, busy, available                                                                                                      |
| 4    | `drivers/places/current-band.finder.ts`, `place-tariff.lookup.ts`, `place-site.lookup.ts`      | The band in force at the site's local time; the site's active tariff and its latest version; operator, site, address, time zone                                                             |
| 5    | `drivers/places/dto/public-place.dto.ts`, `public-tariff.dto.ts`                               | What the page gets: no ids, no status words that need the portal's vocabulary; prices as the portal's tariff page shows them                                                                |
| 6    | `payments/public/charge-key.resolver.ts`                                                       | Parses and checks the charge key (from module 6's `PublicChargeService`, now shared by the stop endpoint): 404 for anything not issued                                                      |
| 7    | `payments/public/charge-view.builder.ts`, `charge-receipt.lookup.ts`, `stop-command.lookup.ts` | Builds the `ChargeDto` the page polls: the session and payment, names, the receipt once priced, whether a stop is waiting, the client secret while the hold waits                           |
| 8    | `payments/public/dto/charge.dto.ts`, `charge-receipt.dto.ts`                                   | The charge as the page sees it: `can_stop`, `is_stop_requested`, `failure_reason`, `receipt`                                                                                                |
| 9    | `drivers/charges/charge-stop.service.ts`                                                       | `POST /public/charges/{key}/stop`: 409 `charge_not_running` unless active with a transaction; queues `remote_stop` once through module 4's `CommandQueuer`                                  |
| 10   | `drivers/qr/charge-url.builder.ts`, `qr-code.renderer.ts`, `qr-codes.service.ts`               | `DRIVER_URL/c/<identity>/<plug>`; the SVG; `GET /chargers/{id}/qr-codes` for anyone who can read the charger (site scope applies)                                                           |
| 11   | `config/api.config.ts`                                                                         | `DRIVER_URL`, required                                                                                                                                                                      |

### 2. The driver app: `apps/driver/src/app`

| Step | File                                                                                 | What it does                                                                                                                                                                                 |
| ---- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 12   | `app.routes.ts`, `app.config.ts`, `app.component.ts`                                 | Three routes: `/` (home), `/c/:identity/:connector` (the sticker's address), `/charges/:key`; zoneless, signals, `config.json` loaded before the app starts                                  |
| 13   | `core/api/public-api.service.ts`, `core/api/models/*`                                | The five public calls and their shapes                                                                                                                                                       |
| 14   | `core/payment/card-form.ts`, `stripe-card-form.ts`, `card-form.factory.ts`           | The card form behind an interface: `mount`, `confirm`, `destroy`. `StripeCardForm` is the only file that imports `@stripe/stripe-js`                                                         |
| 15   | `core/charges/my-charges.store.ts`, `remembered-charge.ts`                           | The charges this phone started, in `localStorage`, newest first, at most 20; survives a broken storage                                                                                       |
| 16   | `shared/charge-phase.ts`, `charge-words.ts`, `duration.pipe.ts`, `money.pipe.ts`     | A session and payment status folded into one phase (`card`, `starting`, `charging`, `finishing`, `done`, `failed`); the driver's words for statuses, failures and availability; "1 h 05 min" |
| 17   | `features/place/place.component.ts`, `place.store.ts`, `tariff-summary.component.ts` | The landing page: where, the plug, availability, the prices (the band now first), the rules, the hold, "Pay and charge"; starts the charge and moves to its page                             |
| 18   | `features/charge/charge.component.ts`, `charge.store.ts`                             | The charge page: the card form while the hold waits, then polling every 3 seconds; cost so far, energy, duration, Stop, the receipt, failure words and "Try again"                           |
| 19   | `features/charge/card-form.component.ts`, `charge-receipt.component.ts`              | Mounts the card form and reports when the card is confirmed; the receipt lines, tax and the amount taken                                                                                     |
| 20   | `features/home/home.component.ts`                                                    | What a driver sees without a QR code: type the charger id and plug, or open a remembered charge                                                                                              |
| 21   | `apps/driver/Dockerfile`, `docker/nginx.conf`, `docker/40-write-runtime-config.sh`   | The image: nginx on 8080, `/healthz`, `config.json` from `DRIVER_API_URL`                                                                                                                    |

### 3. The portal

| Step | File                                                                                    | What it does                                                                                                                                                   |
| ---- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 22   | `core/api/chargers-api.service.ts` (`qrCodes`), `models/charger.ts` (`ConnectorQrCode`) | The QR codes as the API sends them                                                                                                                             |
| 23   | `features/chargers/qr-codes-dialog.component.ts`                                        | "QR codes" on the charger page: one code per plug with its address, and Print                                                                                  |
| 24   | `features/chargers/qr-sheet.ts`                                                         | The printable sheet: one dashed sticker per plug, the plug's name above the code and the address under it; words from people are escaped, the SVG is the API's |

### 4. Endpoints

| Endpoint                                       | Permission       | Notes                                                                                                                                                                                                  |
| ---------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /v1/public/places/{identity}/{connector}` | public           | `availability`, `is_card_payment_accepted`, `hold_amount`, `tariff` (`bands`, `current_band`), the plug and the site's address; 404 `charger_not_found`, `connector_not_found`                         |
| `GET /v1/public/charges/{key}`                 | public (the key) | Module 6's answer plus `operator_name`, `site_name`, `time_zone`, `started_at`, `ended_at`, `failure_reason`, `can_stop`, `is_stop_requested`, `receipt` (`lines`, `net`, `tax`, `gross`, `priced_at`) |
| `POST /v1/public/charges/{key}/stop`           | public (the key) | 200 with the charge; queues one RemoteStop; 409 `charge_not_running` before the charger started or after it stopped; 404 for a key not issued                                                          |
| `GET /v1/chargers/{id}/qr-codes`               | `chargers:read`  | One item per connector: `connector_id`, `ocpp_connector_id`, `label`, `url`, `svg`; 404 outside the caller's sites                                                                                     |

## Running it

```sh
cd deploy
./scripts/install.sh --local    # a .env from before module 7 gets DRIVER_HOST=charge.<domain> from up.sh
./scripts/up.sh --build         # builds the driver image too; prints the driver address
./scripts/seed-demo.sh          # prints the address of plug A of the Riverside charger
```

Open <http://portal.localhost>, Chargers, the Riverside charger, "QR codes": each plug's code and its address, and Print for the sticker sheet. Open <http://charge.localhost/c/WW-7KQ4M2XR9T/1> on a phone on the same network, or on the laptop: the demo plug shows as offline until a charger or the simulator connects as `WW-7KQ4M2XR9T`, and cards are accepted once the demo company has connected Stripe (module 6) in test mode. With both in place, "Pay and charge", the test card `4242 4242 4242 4242`, and the simulator receives RemoteStartTransaction; Stop sends RemoteStopTransaction; once the worker prices the session the page shows the receipt and the amount captured.

With `npm start` the driver app runs on <http://localhost:4300> (`apps/driver/public/config.json` points it at the local API). The API needs `DRIVER_URL` (`apps/api/.env.example` has `http://localhost:4300`) and its `CORS_ORIGINS` must include the driver app's address.

Settings: the API reads `DRIVER_URL`; the `driver` container reads `DRIVER_API_URL`; `deploy/.env` has `DRIVER_HOST`, which Caddy routes to the container and the API uses for both `DRIVER_URL` and CORS.

## Tests

| Test                                                                                               | What it proves                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/modules/drivers/places/place-availability.spec.ts`                                   | The one word for a plug, in order of precedence                                                                                                                                                                                                                                                                                                                                                |
| `apps/api/src/modules/drivers/places/current-band.finder.spec.ts`                                  | The band in force at the site's local time; none when the tariff leaves a gap                                                                                                                                                                                                                                                                                                                  |
| `apps/api/src/modules/drivers/qr/charge-url.builder.spec.ts`, `qr-code.renderer.spec.ts`           | The sticker's address (trailing slashes and odd identities handled); an SVG comes out                                                                                                                                                                                                                                                                                                          |
| `apps/api/src/modules/drivers/drivers.flow.spec.ts`                                                | Against Postgres: a plug described with its operator, address, both bands and the band now; 404s for unknown charger and plug; a faulted plug and an offline charger; QR codes for a charger, refused outside a technician's site and without a token; a stop refused before the charger starts, then queued once with the transaction id; the receipt with its lines once priced and captured |
| `apps/api/src/modules/payments/public-charge.flow.spec.ts`                                         | Module 6's flow still holds with the richer charge answer                                                                                                                                                                                                                                                                                                                                      |
| `apps/driver/src/app/shared/charge-phase.spec.ts`, `charge-words.spec.ts`, `duration.pipe.spec.ts` | Which page a status pair lands on; the driver's words; durations                                                                                                                                                                                                                                                                                                                               |
| `apps/driver/src/app/core/charges/my-charges.store.spec.ts`                                        | Remembered charges: newest first, updated in place, forgotten, the limit, a storage that throws                                                                                                                                                                                                                                                                                                |
| `apps/portal/src/app/features/chargers/qr-sheet.spec.ts`                                           | One sticker per plug with the API's SVG; names from people escaped                                                                                                                                                                                                                                                                                                                             |

The driver app was built and unit-tested, not run against Stripe's card form in a browser: `StripeCardForm` follows Stripe's documented Payment Element calls and is behind the `CardForm` interface so the pages can be tested without it.

## Not in this module

| What                                                                                               | Where                                                                                        |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Driver accounts and login, saved cards, charge history across phones                               | The driver app's next step; `apps/driver` is the shell they go into                          |
| RFID cards, access groups and the tag policy (the gateway still accepts only platform-issued tags) | A later drivers module; `OCPP_ACCEPT_UNKNOWN_ID_TAGS` is the bench-testing switch until then |
| Receipts by e-mail, a PDF receipt                                                                  | Notifications module; the receipt page is the API's `receipt` and can be rendered elsewhere  |
| Operator branding on the driver's page (logo, colours, name in the title)                          | Module 8: the page shows the operator's name from the site                                   |
| Rate limiting of the public endpoints, a captcha on the start                                      | Hardening before go-live; the charge key already limits what a stranger can read             |
| A native app, push notifications when the charge ends, a map of chargers                           | Mobile module; the web app is installable (web manifest) and the pages are its screens       |
| A WebSocket for drivers instead of polling                                                         | With the admin or mobile module, when the gateway's events get a public channel              |

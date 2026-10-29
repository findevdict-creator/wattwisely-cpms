# End-to-end tests

The whole product, running, tested the way people and chargers use it: Playwright drives the
operator portal, the admin console, the driver web app and the mobile app's web build, talks
OCPP 1.6J and 2.0.1 to the gateway as a charger would, calls the public API, and scans the main
screens for accessibility problems. Maestro flows cover what only the native Android app does.

## What runs where

| Folder          | Playwright project | What it covers                                                                      |
| --------------- | ------------------ | ----------------------------------------------------------------------------------- |
| `src/setup`     | `setup`            | Signs each demo user in once (with an authenticator code for staff)                 |
| `src/portal`    | `portal`           | Sign-in, sites, chargers, live charging, tariffs, sessions, drivers, team, settings |
| `src/admin`     | `admin`            | Overview, tenants, plans, staff roles, invoices, audit log, service report          |
| `src/driver`    | `driver`           | The QR plug page and the driver account, on a phone-sized screen                    |
| `src/mobile`    | `mobile`           | The mobile app in a phone browser: sign-in, charging, sessions, account, nearby     |
| `src/ocpp`      | `ocpp`             | The gateway: handshake, bad frames, cards, transactions, pricing, load management   |
| `src/api`       | `api`              | API keys, tenant isolation, health, metrics, CORS, webhooks, the rate limit         |
| `src/quality`   | `quality`          | axe WCAG 2.1 AA scan and a full-page screenshot of 14 screens                       |
| `maestro/flows` | (Maestro)          | The native Android app on an emulator                                               |

Every test is tagged with the module it checks (`@module-5`), so the summary counts results
per module of `docs/modules`.

## Running it

```sh
npx nx run-many -t build -p api ocpp-gateway worker charger-sim-cli portal driver admin mobile
npx nx run e2e:stack-up      # Postgres, Keycloak, Mailpit in Docker, demo data, then the apps
npx nx run e2e:e2e           # all projects; add -- --project=portal for one
npx nx run e2e:report        # dist/e2e-report/summary.md and summary.json
npx nx run e2e:stack-down
```

The stack needs Docker, ports 80, 1025, 3000, 3100, 3200, 4200 to 4500, 5432 and 8025 free, and
`auth.localhost` resolving to 127.0.0.1 (add it to `/etc/hosts` if it does not). The tests
share the seeded demo tenants and run one at a time; start from a fresh `stack-up` for a
clean run, because some journeys (issuing an invoice) can only happen once.

Reports land in `dist/e2e-report`: `html/` (open `index.html`; traces, videos and screenshots
of failures), `junit.xml`, `results.json`, and the summary.

## In CI

- `.github/workflows/e2e.yml`: the Playwright suite, nightly, on every push to main and by
  hand. The reports are the `e2e-report` artifact; the summary is on the run's page.
- `.github/workflows/e2e-mobile.yml`: the Maestro flows on an Android emulator, nightly and by
  hand. The emulator reaches the stack on the runner through `adb reverse`.

## What is not covered here

- Card payments with Stripe: the stack has no Stripe keys, so these tests check that the apps
  say card payments are off. The payment flows are covered by the API's own flow tests with a
  fake provider.
- iOS: the Maestro flows are written for Android only.
- Real push notifications and real chargers.

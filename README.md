# Wattwisely CPMS

A multi-tenant platform for running EV charging networks: charge point operators (tenants) manage sites, chargers, tariffs and payments; drivers charge by app or QR code.

This one repository holds every part of the platform, managed with [Nx](https://nx.dev):

| Folder                                     | What it is                                                                   | Status                                                                                                                            |
| ------------------------------------------ | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api`                                 | REST API, NestJS on Fastify                                                  | Modules 1–9: login, tenants, roles, team, sites, chargers, commands, tariffs, sessions, payments, drivers, branding, plans, admin |
| `apps/portal`                              | Tenant portal, Angular + Angular Material                                    | Modules 1–9: login, tenants, Team, Sites, Chargers, live status, Tariffs, Sessions, Payments, QR codes, Branding, Plan            |
| `apps/ocpp-gateway`                        | Where chargers connect: OCPP 1.6J over WebSocket                             | Modules 4–6                                                                                                                       |
| `apps/worker`                              | Background jobs: prices sessions, running costs, stale sessions, card holds  | Modules 5–6                                                                                                                       |
| `apps/charger-sim`, `packages/charger-sim` | A simulated charger for tests and demos (`npm run sim`)                      | Module 4                                                                                                                          |
| `apps/driver`                              | Driver web app: what a plug's QR code opens, card payment, the receipt       | Modules 7–8: in the operator's colours and with its logo                                                                          |
| `apps/admin`                               | Admin console for Wattwisely staff: tenants, plans, add-ons, staff, audit    | Module 9                                                                                                                          |
| `apps/mobile`                              | Mobile app                                                                   | Later modules                                                                                                                     |
| `deploy/`                                  | Docker Compose file and scripts to run everything on a server                | Ready                                                                                                                             |
| `packages/db`                              | Database schema (Drizzle), SQL migrations, the database client               | Modules 2–9                                                                                                                       |
| `packages/ocpp-contracts`                  | What the API and the gateway agree on: commands, events, status words        | Modules 4–5                                                                                                                       |
| `packages/pricing`                         | The pricing engine: a tariff version and a session's usage in, a receipt out | Module 5                                                                                                                          |
| `packages/session-engine`                  | Session states, pricing a session from what is stored, finalising            | Modules 5–6                                                                                                                       |
| `packages/payments`                        | Card payments behind a provider interface: holds, capture, refunds, webhooks | Module 6                                                                                                                          |
| `packages/payments-stripe`                 | The Stripe Connect implementation of that interface                          | Module 6                                                                                                                          |
| `docs/`                                    | How each module works, in reading order                                      | Modules 1–9                                                                                                                       |

## How the work is organised

Each feature is built as a **module** on its own branch, named `N-name`, with a pull request to review:

| Branch                 | Module                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| `1-auth-keycloak`      | Repo skeleton, deployment, login with Keycloak, tenant selection                                 |
| `2-roles-permissions`  | Tenants in Postgres with row-level security, roles and permissions, team invitations, audit log  |
| `3-sites-chargers`     | Sites, chargers and connectors; site-scoped permissions in use                                   |
| `4-ocpp-gateway`       | The OCPP 1.6J gateway: charger connections, live status, commands, a charger simulator           |
| `5-sessions-pricing`   | Charging sessions, tariffs and the pricing engine, the worker app                                |
| `6-stripe-payments`    | Card payments through Stripe Connect: onboarding, holds, capture, refunds, webhooks              |
| `7-drivers-qr-page`    | The driver's QR charge page: the driver web app, public place and stop endpoints, QR codes       |
| `8-tenant-branding`    | Tenant branding: name, logo, colours and support contact on the driver's pages and e-mails       |
| `9-admin-portal-plans` | The admin console for Wattwisely staff: tenants, plans and add-ons, module switches, staff roles |
| `10-…`                 | Next module, started from `main`                                                                 |

Once a pull request is approved it is merged into `main`. A later change to an area goes on a fresh branch from `main`.

Start with [docs/modules/1-auth-keycloak.md](docs/modules/1-auth-keycloak.md): it walks through the login flow file by file. Then [docs/modules/2-roles-permissions.md](docs/modules/2-roles-permissions.md): roles, permissions and the team. Then [docs/modules/3-sites-chargers.md](docs/modules/3-sites-chargers.md): sites, chargers and connectors. Then [docs/modules/4-ocpp-gateway.md](docs/modules/4-ocpp-gateway.md): how chargers connect and are commanded. Then [docs/modules/5-sessions-pricing.md](docs/modules/5-sessions-pricing.md): charging sessions, tariffs and how a session gets its price. Then [docs/modules/6-stripe-payments.md](docs/modules/6-stripe-payments.md): how a driver pays by card through the operator's own Stripe account. Then [docs/modules/7-drivers-qr-page.md](docs/modules/7-drivers-qr-page.md): the page a driver's phone opens after scanning a plug's QR code. Then [docs/modules/8-tenant-branding.md](docs/modules/8-tenant-branding.md): how an operator's name, logo and colours reach the driver's pages, receipts and e-mails. Then [docs/modules/9-admin-portal-plans.md](docs/modules/9-admin-portal-plans.md): how Wattwisely staff run the platform, and how a plan decides what a tenant can do.

## Try it on your machine

You need Docker. This starts the whole platform with demo users:

```sh
cd deploy
./scripts/install.sh --local      # creates deploy/.env with random passwords
./scripts/up.sh --build           # builds the API, portal, driver app, admin console, OCPP gateway and worker, starts everything
./scripts/seed-demo.sh            # demo tenants, users, sites, chargers, a tariff, a session, a brand, plans and staff
```

Open <http://portal.localhost> and log in as `multi@demo.test` with password `Wattwisely-demo-1`. Keycloak asks you to set up an authenticator app (two-factor login is required), then shows the portal. See [deploy/README.md](deploy/README.md) for servers, updates and backups.

## Develop

Requirements: Node.js 22 (see `.nvmrc`) and npm 11 (`npm install -g npm@11`).

```sh
npm install
npm test          # unit and API flow tests (API database tests need TEST_DATABASE_URL, see module 2)
npm run lint      # coding standards (fails on any rule break)
npm run build
```

To change code with live reload, keep the Docker stack above running for Keycloak, then:

```sh
cp apps/api/.env.example apps/api/.env
cp apps/ocpp-gateway/.env.example apps/ocpp-gateway/.env
cp apps/worker/.env.example apps/worker/.env
npm start         # API on http://localhost:3000, portal on http://localhost:4200, driver app on http://localhost:4300, admin console on http://localhost:4400, OCPP gateway on ws://localhost:3100/ocpp, worker on :3200
npm run sim -- --identity <charger id from the portal> [--password …]   # a simulated charger against the gateway
```

The portal reads its settings from `apps/portal/public/config.json` in development, the driver app from `apps/driver/public/config.json`, the admin console from `apps/admin/public/config.json`.

## Coding standards

The rules from the Tech stack document are enforced by ESLint (`eslint.config.mjs`), so a broken rule fails the build:

- **Classes only.** All logic lives in class methods; no loose functions. `main.ts` and tool config files are the only exceptions.
- **One class, one job, one file.** File names say the role: `sessions.controller.ts`, `sessions.service.ts`, `session-price.calculator.ts`.
- **Small files and methods.** At most 200 lines per file, 30 lines per method, 4 parameters, nesting depth 3.
- **Naming.** `PascalCase` classes, `camelCase` methods, `UPPER_SNAKE_CASE` constants, booleans start with `is`/`has`/`can`. API fields are `snake_case` (only in `*.dto.ts`).
- **One direction of flow.** Frontend: component → service → API. Backend: controller → service → repository. No circular imports.

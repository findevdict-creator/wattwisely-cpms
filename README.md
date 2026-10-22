# Wattwisely CPMS

A multi-tenant platform for running EV charging networks: charge point operators (tenants) manage sites, chargers, tariffs and payments; drivers charge by app or QR code.

This one repository holds every part of the platform, managed with [Nx](https://nx.dev):

| Folder                                     | What it is                                                    | Status                                                    |
| ------------------------------------------ | ------------------------------------------------------------- | --------------------------------------------------------- |
| `apps/api`                                 | REST API, NestJS on Fastify                                   | Modules 1–3: login, tenants, roles, team, sites, chargers |
| `apps/portal`                              | Tenant portal, Angular + Angular Material                     | Modules 1–3: login, tenants, Team, Sites, Chargers        |
| `apps/ocpp-gateway`, `apps/worker`         | Charger connections and background jobs                       | Later modules                                             |
| `apps/driver`, `apps/admin`, `apps/mobile` | Driver web app, platform admin console, mobile app            | Later modules                                             |
| `deploy/`                                  | Docker Compose file and scripts to run everything on a server | Ready                                                     |
| `packages/db`                              | Database schema (Drizzle) and SQL migrations                  | Modules 2–3                                               |
| `docs/`                                    | How each module works, in reading order                       | Modules 1–3                                               |

## How the work is organised

Each feature is built as a **module** on its own branch, named `N-name`, with a pull request to review:

| Branch                | Module                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| `1-auth-keycloak`     | Repo skeleton, deployment, login with Keycloak, tenant selection                                |
| `2-roles-permissions` | Tenants in Postgres with row-level security, roles and permissions, team invitations, audit log |
| `3-sites-chargers`    | Sites, chargers and connectors; site-scoped permissions in use                                  |
| `4-…`                 | Next module, started from `main`                                                                |

Once a pull request is approved it is merged into `main`. A later change to an area goes on a fresh branch from `main`.

Start with [docs/modules/1-auth-keycloak.md](docs/modules/1-auth-keycloak.md): it walks through the login flow file by file. Then [docs/modules/2-roles-permissions.md](docs/modules/2-roles-permissions.md): roles, permissions and the team. Then [docs/modules/3-sites-chargers.md](docs/modules/3-sites-chargers.md): sites, chargers and connectors.

## Try it on your machine

You need Docker. This starts the whole platform with demo users:

```sh
cd deploy
./scripts/install.sh --local      # creates deploy/.env with random passwords
./scripts/up.sh --build           # builds the API and portal, starts everything
./scripts/seed-demo.sh            # demo tenants, users, sites and chargers
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
npm start         # API on http://localhost:3000, portal on http://localhost:4200
```

The portal reads its settings from `apps/portal/public/config.json` in development.

## Coding standards

The rules from the Tech stack document are enforced by ESLint (`eslint.config.mjs`), so a broken rule fails the build:

- **Classes only.** All logic lives in class methods; no loose functions. `main.ts` and tool config files are the only exceptions.
- **One class, one job, one file.** File names say the role: `sessions.controller.ts`, `sessions.service.ts`, `session-price.calculator.ts`.
- **Small files and methods.** At most 200 lines per file, 30 lines per method, 4 parameters, nesting depth 3.
- **Naming.** `PascalCase` classes, `camelCase` methods, `UPPER_SNAKE_CASE` constants, booleans start with `is`/`has`/`can`. API fields are `snake_case` (only in `*.dto.ts`).
- **One direction of flow.** Frontend: component → service → API. Backend: controller → service → repository. No circular imports.

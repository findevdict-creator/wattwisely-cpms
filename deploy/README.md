# Deploying Wattwisely

Everything runs with Docker Compose on one Linux server. A single server suits a pilot and the first few thousand chargers; it has no automatic failover. The same images can move to Kubernetes later without code changes.

## What runs

| Service          | Image                  | Role                                                                 | Reachable from the internet                                               |
| ---------------- | ---------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `caddy`          | caddy                  | HTTPS certificates (Let's Encrypt) and routing                       | Yes, ports 80 and 443                                                     |
| `api`            | ghcr.io/…/api          | Wattwisely REST API                                                  | Through Caddy: `api.<domain>`                                             |
| `portal`         | ghcr.io/…/portal       | Tenant portal                                                        | Through Caddy: `portal.<domain>`                                          |
| `driver`         | ghcr.io/…/driver       | Driver app: what a plug's QR code opens (prices, card, receipt)      | Through Caddy: `charge.<domain>`                                          |
| `admin`          | ghcr.io/…/admin        | Admin console for Wattwisely staff: tenants, plans, add-ons, staff   | Through Caddy: `admin.<domain>`                                           |
| `ocpp-gateway`   | ghcr.io/…/ocpp-gateway | Where chargers connect (OCPP 1.6J over WebSocket)                    | Through Caddy: `ocpp.<domain>` (wss) and `ocpp-plain.<domain>` (ws)       |
| `worker`         | ghcr.io/…/worker       | Background jobs: prices sessions, running costs, stale sessions      | No                                                                        |
| `keycloak`       | keycloak/keycloak      | Login, two-factor, SSO                                               | Through Caddy: `auth.<domain>` (admin console only from private networks) |
| `postgres`       | postgres 16            | Databases for Wattwisely and Keycloak                                | No                                                                        |
| `valkey`         | valkey                 | Reserved for live updates once the gateway runs on several instances | No                                                                        |
| `openbao`        | openbao                | Encrypted platform secrets such as Stripe keys                       | No                                                                        |
| `object-storage` | seaweedfs              | S3-compatible file storage for logos, invoices, exports              | No                                                                        |
| `mailpit`        | mailpit                | Catches e-mail in local trials only                                  | Local only                                                                |
| `prometheus`     | prometheus             | Reads every service's metrics, evaluates the alert rules (module 12) | No: `127.0.0.1:9090` on the server, with the `monitoring` profile         |
| `alertmanager`   | alertmanager           | E-mails firing alerts to `ALERT_EMAIL_TO`                            | No: `127.0.0.1:9093`, `monitoring` profile                                |
| `grafana`        | grafana-oss            | Dashboards                                                           | No: `127.0.0.1:3300`, `monitoring` profile                                |
| `node-exporter`  | node-exporter          | The server's disk, memory and CPU, and the backup scripts' metrics   | No, `monitoring` profile                                                  |

## Server checklist

1. A Linux server with at least 4 GB RAM and 40 GB disk, Docker Engine and the Compose plugin installed. Plan about 1 GB more for the monitoring profile.
2. DNS records `portal.<domain>`, `api.<domain>`, `auth.<domain>`, `charge.<domain>`, `admin.<domain>`, `ocpp.<domain>` and `ocpp-plain.<domain>` pointing at the server.
3. Ports 80 and 443 open. Nothing else needs to be open.
4. An SMTP account for e-mails (password resets and team invitations).
5. If the GitHub repository is private: `docker login ghcr.io` with a GitHub token that can read packages.

## Install

```sh
git clone https://github.com/findevdict-creator/wattwisely-cpms.git
cd wattwisely-cpms/deploy
./scripts/install.sh --domain example.com --email ops@example.com
nano .env          # fill in SMTP_*, pick WATTWISELY_VERSION
./scripts/up.sh
```

`install.sh` creates `.env` with strong random passwords. On the first start `up.sh` also initialises OpenBao and saves its unseal key to `.secrets/openbao-init.txt`. **Copy that file and `.env` to a password manager**: without them a backup cannot be restored.

Then create the first platform admin in Keycloak (`https://auth.<domain>/admin`, reachable only from the server's private network, for example through `ssh -L 8443:localhost:443`).

## Scripts

| Script                | What it does                                                                                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `install.sh`          | First-time setup: checks Docker, writes `.env` and storage settings. `--local` for a trial on this computer                                                            |
| `up.sh`               | Pulls the images, starts everything, waits until healthy, unseals OpenBao. `--build` builds from this checkout instead; `--no-pull` uses images already on the machine |
| `update.sh [version]` | Backup, then switch to a new version and restart. Example: `./scripts/update.sh 0.2.0`                                                                                 |
| `backup.sh`           | Both databases, OpenBao data, file storage, `.env` and secrets into `backups/<date>/`. Keeps `BACKUP_KEEP_DAYS` days                                                   |
| `restore.sh <dir>`    | Replaces all data with a backup, then starts everything                                                                                                                |
| `health.sh`           | Checks every container and endpoint; exit code 0 when all is well                                                                                                      |
| `logs.sh [service]`   | Follows the logs                                                                                                                                                       |
| `down.sh`             | Stops everything; data stays                                                                                                                                           |
| `seed-demo.sh`        | Demo tenants and users, local trials only                                                                                                                              |
| `restore-drill.sh`    | Restores the newest backup (or the one given) into a throw-away Postgres and checks it, without touching the running platform                                          |
| `seed-load-test.sh`   | Registers chargers `LOAD-0001`… for a load test in a tenant of their own; `--remove` deletes it again                                                                  |

Run a nightly backup and copy it off the server, and a restore drill once a month, for example with cron:

```cron
0 2 * * * cd /opt/wattwisely-cpms/deploy && ./scripts/backup.sh && rsync -a backups/ backup-host:wattwisely/
30 3 1 * * cd /opt/wattwisely-cpms/deploy && ./scripts/restore-drill.sh
```

## Backups

`backup.sh` reads each database dump back once and writes `SHA256SUMS` over every file, so a cut-off dump fails at once instead of on the day it is needed. `restore.sh` checks the sums before it replaces anything.

`restore-drill.sh` proves a backup restores: it starts a throw-away `postgres:16.15-alpine` container with no network, restores both databases, prints the row counts of the main tables, checks the Keycloak realm and the volume archives, and reports how long it took. That time is the one to plan a recovery with. With the monitoring profile, `BackupMissing` warns after 26 hours without a backup and `RestoreDrillOverdue` after 35 days without a drill.

## Monitoring

With `monitoring` in `COMPOSE_PROFILES` (what `install.sh` writes for a real server), `up.sh` also starts Prometheus, Alertmanager, Grafana and node-exporter. Alerts are e-mailed to `ALERT_EMAIL_TO` (or `ACME_EMAIL`) through the SMTP settings in `.env`; [docs/modules/12-hardening-operations.md](../docs/modules/12-hardening-operations.md) lists them. None of the three is reachable from the internet. From your laptop:

```sh
ssh -L 3300:localhost:3300 -L 9090:localhost:9090 you@server
```

Then open <http://localhost:3300> (user `admin`, password `GRAFANA_ADMIN_PASSWORD` in `.env`) for the Wattwisely overview dashboard, and <http://localhost:9090/alerts> for what Prometheus is evaluating. `health.sh` also reports how many alerts are firing.

Each service answers `GET /metrics` on the private network only; Caddy answers 404 for it from outside. To change an alert, edit `monitoring/prometheus/alerts.yml`, add a case to `alerts.test.yml` and run `./scripts/up.sh --no-pull` (CI runs the tests with promtool).

## Load test

Against a staging server, never production:

```sh
./scripts/seed-load-test.sh 1000                     # chargers LOAD-0001 … LOAD-1000
# in .env: OCPP_RATE_LIMIT_PER_IP=10000, and OCPP_ACCEPT_UNKNOWN_ID_TAGS=true for --sessions; then ./scripts/up.sh --no-pull
npm run load-test -- --url wss://ocpp.staging.example.com/ocpp --count 1000 --ramp 120 --duration 600 --sessions   # from a checkout on another machine
./scripts/seed-load-test.sh --remove                 # deletes the tenant and all it recorded
```

The tool prints answer times by message and fails when a charger cannot connect, the p95 is over 2 seconds or more than 1% of calls fail (`--max-p95`, `--max-errors`). Watch the Grafana dashboard while it runs. Set the two `.env` settings back afterwards.

## Versions and images

A GitHub Action builds the `api`, `portal`, `driver`, `admin`, `ocpp-gateway` and `worker` images and pushes them to GitHub's container registry:

| Event          | Image tags             |
| -------------- | ---------------------- |
| Push to `main` | `main`, `sha-<commit>` |
| Tag `v0.2.0`   | `0.2.0`, `0.2`         |

Set `WATTWISELY_VERSION` in `.env` to a released version on a real server. `main` always follows the latest merged code.

## Local trial

```sh
./scripts/install.sh --local
./scripts/up.sh --build
./scripts/seed-demo.sh
```

Open <http://portal.localhost>. The driver app is at <http://charge.localhost>: open a charger in the portal and press "QR codes" to see the addresses the stickers carry. Demo users (password `Wattwisely-demo-1`): `owner@acme.test` (Owner, one tenant), `tech@acme.test` (Technician, no Team page), `multi@demo.test` (two tenants), `nobody@demo.test` (no tenant); `dana@acme.test` is a driver, who logs in at <http://charge.localhost/account> without an authenticator app (module 19). The admin console is at <http://admin.localhost> for `admin@wattwisely.test` (administrator) and `support@wattwisely.test` (support); on a real server `./scripts/add-platform-admin.sh <email>` adds the first administrator. E-mails land in Mailpit at <http://localhost:8025>. The Keycloak admin console is at <http://auth.localhost/admin>.

## Good to know

- **Keycloak reads `keycloak/realm/wattwisely-realm.json` only when the realm does not exist yet.** Later changes to that file are applied by hand in the admin console, or by a migration in a later module. A realm created before module 19 needs these steps, in the admin console at `auth.<domain>/admin`, realm `wattwisely`:
  1. _Authentication > Flows_: duplicate `browser` as `staff browser`; in its forms sub-flow set _OTP Form_ to **Required** (delete the conditional 2FA sub-flow around it). Duplicate `browser` again as `driver browser` and leave it as it is (OTP asked only when the user has one). Bind `staff browser` as the realm's browser flow (_Action > Bind flow_).
  2. _Authentication > Required actions_: switch off _Set as default action_ for **Configure OTP**. Staff are still asked to set one up, by the `staff browser` flow.
  3. _Clients > Create client_: `wattwisely-driver`, OpenID Connect, client authentication off, standard flow only; root URL `${DRIVER_URL}`, valid redirect URIs `${DRIVER_URL}/*` and `${DRIVER_DEV_URL}/*`, web origins both addresses, PKCE method S256 (_Advanced_); under _Advanced > Authentication flow overrides_ choose `driver browser` for _Browser Flow_; under _Client scopes > wattwisely-driver-dedicated_ add an _Audience_ mapper with included client audience `wattwisely-driver`, in the access token.
     Then `./scripts/up.sh --no-pull`, so the `driver` container and the API read the new settings (`DRIVER_DEV_URL`, `KEYCLOAK_DRIVER_AUDIENCE`).

  A realm created before module 30 needs the mobile app's addresses on the driver client. Under _Clients > wattwisely-driver_, add `com.wattwisely.driver:/*` to _Valid redirect URIs_ and to _Valid post logout redirect URIs_, and `https://localhost` and `capacitor://localhost` to _Web origins_ (the app's pages run there on Android and iOS). Then `./scripts/up.sh --no-pull`, so the API allows the same two origins.

  A realm created before module 21 keeps Keycloak's own sign-in pages and e-mails until it is given the platform's theme. Run `./scripts/up.sh --no-pull` first, so the Keycloak container mounts `keycloak/themes/wattwisely`; then under _Realm settings > Themes_ set _Login theme_ and _Email theme_ to `wattwisely` and save. The theme takes its colors from `packages/theme/theme.json`: after a color change, `npx nx run theme:generate` rewrites its `tokens.css`, `mark.svg` and `theme-colours.ftl`, and a Keycloak restart (`docker restart wattwisely-keycloak-1`) shows them, since Keycloak caches themes on a server.

- **OpenBao is sealed after every restart.** `up.sh` unseals it with the key in `.secrets/`. If that file is lost, the secrets in OpenBao are lost too.
- **The API reference at `/docs` is off on servers** since module 12. Set `API_DOCS_ENABLED=true` in `.env` and run `./scripts/up.sh --no-pull` to publish it.
- **The portal's help button** (module 22) leads to `PORTAL_HELP_URL` in `.env`, such as your help centre, and is hidden while it is empty. Run `./scripts/up.sh --no-pull` after setting it.
- **Rate limits.** The API counts requests per client address and minute (`RATE_LIMIT_*` in `.env`): 1,200 signed-in, 300 public reads, 30 public writes such as starting a charge. A 429 answer carries `Retry-After`.
- **Old data is deleted.** The worker deletes the OCPP message log after 90 days and sent e-mails, bell notifications, drivers' addresses and processed Stripe events after the periods in `RETENTION_*`. Sessions, payments and the audit log are kept.
- **MinIO is not used.** MinIO stopped publishing free Docker images in 2025, so file storage uses SeaweedFS, which speaks the same S3 interface.

## Windows

The scripts run in Git Bash (comes with Git for Windows) or in a WSL terminal, with Docker Desktop.

- **Line endings.** `.gitattributes` makes Git check out every file with LF endings, because the shell scripts and configuration files run inside Linux containers. A clone made before that file existed still has CRLF endings. Clone again, or refresh the checkout (this discards uncommitted changes):

  ```sh
  git rm -r --cached -q . && git reset --hard
  ```

- **Paths in Git Bash.** Git Bash rewrites arguments that look like Unix paths into Windows paths before they reach `docker`. The scripts guard the container paths they pass (`//opt/...` in `seed-demo.sh`, `MSYS_NO_PATHCONV=1` in `backup.sh` and `restore.sh`). Keep that in mind when you type `docker compose exec` commands by hand.

## Troubleshooting

- **Keycloak never becomes healthy and its log says `password authentication failed for user "keycloak"`.** Keycloak's database user is created by `postgres/init/01-create-keycloak-database.sh`, which Postgres runs only when its volume is first created. If that first start failed (on Windows usually because of CRLF line endings: the Postgres log says `/bin/sh^M: bad interpreter`), the user and database are missing. `up.sh` now creates them on every start, so fix the line endings and run `./scripts/up.sh` again. On a trial machine with nothing to keep you can also start from an empty database: `./scripts/down.sh`, `docker volume rm wattwisely_postgres-data`, `./scripts/up.sh`.
- **Keycloak is "healthy" but the login page or the admin console never finishes loading.** Requests to `/realms/...` hang, and the Keycloak log shows `ARJUNA012117` transaction timeouts in `SimpleTimestamper`. This happens after the clock of the Docker machine jumps, typically when the WSL2 virtual machine behind Docker Desktop drifts hours ahead after the PC sleeps and then corrects itself. Check the clock against the real UTC time:

  ```sh
  docker exec wattwisely-postgres-1 date -u
  ```

  If the clock is wrong, run `wsl --shutdown` in PowerShell, restart Docker Desktop, then `./scripts/up.sh`. If the clock is right and Keycloak still hangs, restart it: `docker restart wattwisely-keycloak-1`.

- **`seed-demo.sh` stops with "Could not sign in to Keycloak".** The message includes Keycloak's answer. Usually Keycloak is not ready yet (`./scripts/health.sh`), or `KEYCLOAK_ADMIN_PASSWORD` in `.env` no longer matches: Keycloak takes the admin password from `.env` only on its first start.

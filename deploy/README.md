# Deploying Wattwisely

Everything runs with Docker Compose on one Linux server. A single server suits a pilot and the first few thousand chargers; it has no automatic failover. The same images can move to Kubernetes later without code changes.

## What runs

| Service          | Image                  | Role                                                                 | Reachable from the internet                                               |
| ---------------- | ---------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `caddy`          | caddy                  | HTTPS certificates (Let's Encrypt) and routing                       | Yes, ports 80 and 443                                                     |
| `api`            | ghcr.io/…/api          | Wattwisely REST API                                                  | Through Caddy: `api.<domain>`                                             |
| `portal`         | ghcr.io/…/portal       | Tenant portal                                                        | Through Caddy: `portal.<domain>`                                          |
| `driver`         | ghcr.io/…/driver       | Driver app: what a plug's QR code opens (prices, card, receipt)      | Through Caddy: `charge.<domain>`                                          |
| `ocpp-gateway`   | ghcr.io/…/ocpp-gateway | Where chargers connect (OCPP 1.6J over WebSocket)                    | Through Caddy: `ocpp.<domain>` (wss) and `ocpp-plain.<domain>` (ws)       |
| `worker`         | ghcr.io/…/worker       | Background jobs: prices sessions, running costs, stale sessions      | No                                                                        |
| `keycloak`       | keycloak/keycloak      | Login, two-factor, SSO                                               | Through Caddy: `auth.<domain>` (admin console only from private networks) |
| `postgres`       | postgres 16            | Databases for Wattwisely and Keycloak                                | No                                                                        |
| `valkey`         | valkey                 | Reserved for live updates once the gateway runs on several instances | No                                                                        |
| `openbao`        | openbao                | Encrypted platform secrets such as Stripe keys                       | No                                                                        |
| `object-storage` | seaweedfs              | S3-compatible file storage for logos, invoices, exports              | No                                                                        |
| `mailpit`        | mailpit                | Catches e-mail in local trials only                                  | Local only                                                                |

Later modules add `admin` to the same file.

## Server checklist

1. A Linux server with at least 4 GB RAM and 40 GB disk, Docker Engine and the Compose plugin installed.
2. DNS records `portal.<domain>`, `api.<domain>`, `auth.<domain>`, `charge.<domain>`, `ocpp.<domain>` and `ocpp-plain.<domain>` pointing at the server.
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

Run a nightly backup and copy it off the server, for example with cron:

```cron
0 2 * * * cd /opt/wattwisely-cpms/deploy && ./scripts/backup.sh && rsync -a backups/ backup-host:wattwisely/
```

## Versions and images

A GitHub Action builds the `api`, `portal`, `driver`, `ocpp-gateway` and `worker` images and pushes them to GitHub's container registry:

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

Open <http://portal.localhost>. The driver app is at <http://charge.localhost>: open a charger in the portal and press "QR codes" to see the addresses the stickers carry. Demo users (password `Wattwisely-demo-1`): `owner@acme.test` (Owner, one tenant), `tech@acme.test` (Technician, no Team page), `multi@demo.test` (two tenants), `nobody@demo.test` (no tenant). E-mails land in Mailpit at <http://localhost:8025>. The Keycloak admin console is at <http://auth.localhost/admin>.

## Good to know

- **Keycloak reads `keycloak/realm/wattwisely-realm.json` only when the realm does not exist yet.** Later changes to that file are applied by hand in the admin console, or by a migration in a later module.
- **OpenBao is sealed after every restart.** `up.sh` unseals it with the key in `.secrets/`. If that file is lost, the secrets in OpenBao are lost too.
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

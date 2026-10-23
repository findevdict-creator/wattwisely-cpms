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

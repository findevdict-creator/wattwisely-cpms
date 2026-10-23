# Module 12: hardening and operations

Modules 1 to 11 built what the platform does. This module makes it **safe to leave running**. Every service now publishes **metrics**, and an optional **monitoring stack** (Prometheus, Alertmanager, Grafana) watches them and e-mails the operations address when something breaks. The API has **rate limits** per client address, and it finally sees the real client address behind Caddy. **Export files move to object storage** instead of database rows. A **retention job** deletes old working data such as the OCPP message log, so the database stops growing without limit. Backups are **checked when they are made**, and a **restore drill** proves one can be restored without touching the running platform. A **load test tool** connects hundreds or thousands of simulated chargers and reports answer times. CI now scans the **dependencies** for known vulnerabilities, and Dependabot proposes the upgrades.

Stories covered: the worker stops at 03:00, and at 03:02 the operations inbox gets "worker is not answering"; the e-mail outbox backs up behind a broken SMTP password, and after 15 minutes an alert names it; 40% of chargers drop off after a network change, and an alert fires within 5 minutes; a Stripe webhook answers 500 once, and someone hears about it before payouts stall; a script hammering the driver's start endpoint gets 429 after 30 tries a minute, while a busy operator's portal is not slowed; the OCPP log of a 1,000-charger network stays at 90 days instead of growing by gigabytes a month; the monthly restore drill restores last night's backup into a scratch database in 40 seconds and reports the row counts; before go-live, 1,000 simulated chargers run for 10 minutes against staging and the p95 answer time stays under 2 seconds.

## What changed since module 11

| Before (module 11)                                              | Now (module 12)                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Health checks only: up or down                                  | `GET /metrics` on the API (`:3000`, outside `/v1`), the gateway (`:3100`) and the worker (`:3200`), in the Prometheus format. `packages/observability` names every metric `wattwisely_…` with a `service` label. Caddy answers 404 for `/metrics` from outside                                                     |
| Nobody was told when a service failed                           | `COMPOSE_PROFILES=monitoring` starts Prometheus, Alertmanager, Grafana and node-exporter (`deploy/monitoring/`). 18 alert rules, with promtool unit tests in CI, and one Grafana dashboard. `install.sh` switches the profile on for real servers                                                                  |
| No limit on how often one address may call the API              | `RateLimitGuard`, the first global guard: a fixed one-minute window per client address and policy. Over budget answers 429 `rate_limited` with `Retry-After`. `@RateLimit.exempt()` on health and the Stripe webhook; `@RateLimit.policy()` for a route that needs another budget                                  |
| Behind Caddy, the API saw Caddy's address for every request     | `TRUST_PROXY_HOPS=1`: the client address is the one Caddy saw. It is used by the rate limits and written to the audit log. Caddy replaces any `X-Forwarded-For` a client sends, so it cannot be forged                                                                                                             |
| `/docs` was public on every server                              | `API_DOCS_ENABLED`, off by default in `deploy/` and on for local trials. The API's own default stays on, for development                                                                                                                                                                                           |
| Export files were `bytea` rows in `report_exports`              | `packages/file-storage`: an S3 `FileStore` (SeaweedFS in `deploy/`), or database-only when `S3_ENDPOINT` is empty. The worker writes `exports/<tenant>/<export>.csv.gz` and records `storage_key` (migration 0019). Downloads and scheduled-report attachments read from storage, or from `data` for older exports |
| The OCPP log, the e-mail outbox and the bell grew forever       | `RetentionJob`, hourly: deletes old rows in batches, tenant by tenant under row-level security. Migration 0020 lets `wattwisely_app` delete from those tables. New indexes make the sweeps cheap                                                                                                                   |
| The worker's jobs failed silently apart from a log line         | Every job run is counted and timed. `QueueStatsJob` publishes the e-mail outbox, export and Stripe event backlogs and the open alerts, so a stuck queue raises an alert                                                                                                                                            |
| `backup.sh` wrote files nobody checked                          | Each dump is read back with `pg_restore --list`, `SHA256SUMS` covers every file, and `restore.sh` checks it first. `restore-drill.sh` restores into a scratch container. Both scripts leave metrics for the "no backup in a day" and "no drill this month" alerts                                                  |
| No way to load test the gateway                                 | `apps/load-test` (`npm run load-test`): many simulated chargers with sessions, answer times by message, pass or fail against a p95 and an error budget. `seed-load-test.sh` registers the chargers and removes them again                                                                                          |
| `npm audit` reported Fastify (high), Nodemailer (high), js-yaml | Fastify 5.12.7 through an override (the old one could be fooled by a forged `X-Forwarded-*` header with a trusted proxy), Nodemailer 10.2, js-yaml 5.4: no known vulnerability in production packages. A Security workflow fails on a new high one, also weekly; Dependabot proposes upgrades                      |
| Caddy sent no anti-framing headers                              | The portal, driver app, admin console and API answer with `X-Frame-Options: DENY` and `frame-ancestors 'none'`, unless the service set its own policy. Keycloak is left out: its session check runs in an iframe                                                                                                   |

## Metrics and alerts

| Service      | Metrics                                                                                                                                                                                                                                                                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API          | `http_request_duration_seconds{method,route,status}`: the route is the pattern (`/v1/sites/:id`), so ids never become series. `http_rate_limited_total{policy}`                                                                                                                                                                                              |
| OCPP gateway | `ocpp_connections`, `ocpp_upgrades_total{result}` (accepted, or why refused), `ocpp_calls_total{action,result}` and `ocpp_call_duration_seconds{action}` for the chargers' messages, `ocpp_commands_total{action,status}` and `ocpp_command_duration_seconds{action}`, `ocpp_message_log_dropped_total`                                                      |
| Worker       | `worker_job_runs_total{job,result}`, `worker_job_duration_seconds{job}`, `worker_job_interval_seconds{job}`, `worker_job_last_success_timestamp_seconds{job}`; `outbox_due`, `outbox_oldest_due_seconds`, `exports_queued`, `exports_oldest_queued_seconds`, `payment_webhook_events_pending`, `payment_webhook_oldest_pending_seconds`, `alerts_open{type}` |
| All three    | The Node.js process metrics: memory, CPU, event loop lag, garbage collection                                                                                                                                                                                                                                                                                 |

Actions a charger invents are counted as `other`, so a misbehaving charger cannot create new series.

| Alert                                  | Fires when                                                                       | Severity          |
| -------------------------------------- | -------------------------------------------------------------------------------- | ----------------- |
| `ServiceDown`                          | The API, the gateway or the worker has not answered Prometheus for 2 minutes     | critical          |
| `ApiErrorRate`                         | More than 5% of API requests answer 5xx for 5 minutes                            | critical          |
| `ApiSlow`                              | The API's p95 is over 2 seconds for 10 minutes                                   | warning           |
| `StripeWebhookFailing`                 | A Stripe webhook got a 5xx in the last 15 minutes                                | critical          |
| `ChargerConnectionsDropped`            | Fewer than 70% of the last hour's chargers are connected, with at least 5 before | critical          |
| `ChargerCommandsTimingOut`             | More than 20% of commands time out over 15 minutes                               | warning           |
| `ChargerCommandsSlow`                  | The p95 of command answers is over 2 seconds                                     | warning           |
| `MessageLogDropping`                   | The gateway dropped OCPP log entries because the database could not keep up      | warning           |
| `JobFailing`                           | A worker job failed 3 times in 15 minutes                                        | warning           |
| `JobStalled`                           | A job has not succeeded for 3 of its intervals, and at least 10 minutes          | critical          |
| `EmailBacklog`, `ExportBacklog`        | The oldest e-mail due has waited 15 minutes, the oldest export 30 minutes        | warning           |
| `PaymentWebhooksPending`               | A received Stripe event has waited 30 minutes to be processed                    | critical          |
| `DiskAlmostFull`, `MemoryLow`          | Less than 10% of the disk free, or of memory available                           | critical, warning |
| `BackupMissing`, `RestoreDrillOverdue` | No backup in 26 hours, no successful drill in 35 days. Mailed once a day at most | warning           |
| `MonitoringTargetMissing`              | node-exporter is not answering, so the server alerts cannot fire                 | warning           |

The thresholds are starting points; tune them in `deploy/monitoring/prometheus/alerts.yml` once real traffic shows what is normal, and extend `alerts.test.yml` with them.

## Rate limits

| Policy         | Applies to                                                                        | Default per address and minute |
| -------------- | --------------------------------------------------------------------------------- | ------------------------------ |
| `default`      | Every signed-in call                                                              | 1,200                          |
| `public`       | Public reads: the driver's place and charge pages, tenant logos, invitation links | 300                            |
| `public_write` | Public writes: starting and stopping a charge, a driver's e-mail sign-up          | 30                             |
| exempt         | `/health/*`, `/metrics` and the Stripe webhook, which is signed                   | —                              |

The budgets are per address, so one driver's phone, an office behind one address and a script each have their own. The counters are in memory: with two API replicas each counts on its own, which doubles the budget at most.

## Retention

| Data                                   | Deleted after (default)                            | Setting                         |
| -------------------------------------- | -------------------------------------------------- | ------------------------------- |
| OCPP message log                       | 90 days after it was received                      | `RETENTION_OCPP_MESSAGES_DAYS`  |
| Sent, failed or cancelled e-mails      | 30 days; e-mails still due are never deleted       | `RETENTION_OUTBOX_DAYS`         |
| Staff bell notifications               | 90 days                                            | `RETENTION_BELL_DAYS`           |
| A driver's address for session e-mails | 30 days after the charge ended                     | `RETENTION_DRIVER_EMAIL_DAYS`   |
| Expired or failed exports (the rows)   | 90 days; the file itself already goes after 7 days | `RETENTION_EXPORTS_DAYS`        |
| Processed Stripe events                | 90 days; unprocessed ones stay                     | `RETENTION_WEBHOOK_EVENTS_DAYS` |

Charging sessions, meter values, payments, refunds, alerts and the audit log are never deleted by this job: they are the records an operator, an auditor or a tax office asks for. **The periods are proposals.** The 90 days for the OCPP log come from the roadmap; the rest wait for the data retention policy, and each is one setting.

The job deletes at most 5,000 rows per transaction and 100 batches per run, so a first run on a large database spreads over a few hours instead of locking a table.

## Load test

```sh
cd deploy && ./scripts/seed-load-test.sh 1000              # LOAD-0001 … LOAD-1000 in a "Load test" tenant
npm run load-test -- --url wss://ocpp.staging.example.com/ocpp --count 1000 --ramp 120 --duration 600 --sessions
cd deploy && ./scripts/seed-load-test.sh --remove           # deletes the tenant and all it recorded
```

The gateway accepts 100 new connections per address and minute (`OCPP_RATE_LIMIT_PER_IP`), and the tool connects from one address: raise the limit on the test server first. `--sessions` needs `OCPP_ACCEPT_UNKNOWN_ID_TAGS=true` there. The run fails, with exit code 1, when a charger cannot connect or is dropped, when the p95 is over `--max-p95` (2,000 ms) or when more than `--max-errors` (1%) of calls fail.

A first run on a development container, with the gateway and Postgres on the same machine: 200 chargers with sessions, a heartbeat and meter values every 5 seconds, for 40 seconds.

| Message          | Calls | p50    | p95    | p99    |
| ---------------- | ----- | ------ | ------ | ------ |
| Heartbeat        | 1,304 | 3 ms   | 6 ms   | 14 ms  |
| MeterValues      | 1,304 | 5 ms   | 8 ms   | 24 ms  |
| StartTransaction | 200   | 8 ms   | 11 ms  | 22 ms  |
| StopTransaction  | 200   | 183 ms | 295 ms | 305 ms |
| All              | 3,808 | 5 ms   | 61 ms  | 259 ms |

No call failed. The stops are slower because all 200 arrive in the same second at the end of the run. The figure to plan with comes from the staging server, not from this.

## Backups and the restore drill

`backup.sh` reads every dump back once, writes `SHA256SUMS` and a `VERSION` file, and records when it finished for the `BackupMissing` alert. `restore.sh` refuses a backup whose files no longer match.

`restore-drill.sh [backup]` takes the newest backup unless told otherwise. It checks the files, restores both databases into a throw-away `postgres:16.15-alpine` container with no network, prints the row counts of the main tables and checks the Keycloak realm, reads the volume archives through and reports how long the restore took. The running platform is not touched. Run it monthly; the `RestoreDrillOverdue` alert reminds you after 35 days.

## Design decisions for M1

| Decision                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Prometheus pulls, nothing pushes.** Each service only answers `/metrics`; it needs no address of the monitoring stack and keeps working without it. The stack is a Compose profile, so a server can run without it                                                                                 |
| **Monitoring is reached through SSH, not the internet.** Grafana, Prometheus and Alertmanager listen on `127.0.0.1` only. Putting Grafana behind Caddy with Keycloak login is later work                                                                                                             |
| **Alertmanager's settings stay in `.env`.** Alertmanager cannot read environment variables, so a small start script writes its config inside the container from the same SMTP settings the platform uses. No SMTP password is written to the server's disk                                           |
| **Rate limits in memory, per replica.** One API container runs today. A shared counter in Valkey comes with a second replica                                                                                                                                                                         |
| **Logs stay in Docker's json-file driver.** No Loki or log shipping yet: `logs.sh` and `docker compose logs` cover a single server                                                                                                                                                                   |
| **Objects first, then the row.** The worker uploads an export before it marks the row ready, and deletes the object after the row is expired. A crash between the two can leave an orphan object, never a row pointing at nothing. Tenant logos stay in Postgres: there is one small file per tenant |
| **Retention deletes, it does not archive.** The deleted rows are in the nightly backups for `BACKUP_KEEP_DAYS`. A cold archive (for example to object storage) can come if an operator needs the OCPP log longer                                                                                     |
| **The production audit is the gate.** Development tools (the Angular build's Vite, undici in test tooling) have two open high advisories that never reach a server; Dependabot proposes their upgrades with the rest                                                                                 |

## Not in this module

- Kubernetes manifests or Helm charts: the Compose deployment stays the target for M1.
- The deployment and operations guide: a separate document.
- Legal pages (terms, privacy policy) and the external penetration test.
- Purging the data of a deleted tenant, and the decided retention policy that the periods above wait for.
- Tracing (OpenTelemetry) and centralised logs.

## Try it

On a laptop: `./scripts/install.sh --local`, add `monitoring` to `COMPOSE_PROFILES` in `deploy/.env` (`dev,monitoring`), then `./scripts/up.sh --build`. Grafana is at <http://localhost:3300> (user `admin`, password `GRAFANA_ADMIN_PASSWORD` in `.env`) with the Wattwisely overview dashboard; Prometheus's alerts are at <http://localhost:9090/alerts>. Stop the worker with `docker compose stop worker` and within 2 minutes `ServiceDown` fires and its e-mail lands in Mailpit. `./scripts/backup.sh && ./scripts/restore-drill.sh` runs a drill. `./scripts/seed-load-test.sh 50` and `npm run load-test -- --url ws://ocpp.localhost/ocpp --count 50 --ramp 10 --duration 60` run a small load test through Caddy.

## Settings

| Variable (API)                       | Default                   | What                                                                            |
| ------------------------------------ | ------------------------- | ------------------------------------------------------------------------------- |
| `RATE_LIMIT_ENABLED`                 | true                      | `false` turns every limit off                                                   |
| `RATE_LIMIT_PER_MINUTE`              | 1200                      | Signed-in calls per client address                                              |
| `RATE_LIMIT_PUBLIC_PER_MINUTE`       | 300                       | Public reads per client address                                                 |
| `RATE_LIMIT_PUBLIC_WRITE_PER_MINUTE` | 30                        | Public writes per client address                                                |
| `TRUST_PROXY_HOPS`                   | 0                         | Proxies in front of the API whose `X-Forwarded-For` is believed; 1 behind Caddy |
| `API_DOCS_ENABLED`                   | true (false in `deploy/`) | Serves `/docs` and the OpenAPI document                                         |
| `S3_ENDPOINT`                        | empty                     | Object storage; empty keeps export files in Postgres                            |
| `S3_ACCESS_KEY`, `S3_SECRET_KEY`     | —                         | Needed when `S3_ENDPOINT` is set                                                |
| `S3_BUCKET`, `S3_REGION`             | wattwisely, us-east-1     | The bucket is created at start if it is missing                                 |

| Variable (worker)         | Default       | What                                      |
| ------------------------- | ------------- | ----------------------------------------- |
| `S3_*`                    | as the API    | The same bucket as the API                |
| `RETENTION_*_DAYS`        | see Retention | How long old rows are kept                |
| `RETENTION_INTERVAL_MS`   | 3600000       | How often the retention job runs          |
| `QUEUE_STATS_INTERVAL_MS` | 30000         | How often the backlog metrics are counted |

| Variable (`deploy/.env`) | Default                  | What                                                                  |
| ------------------------ | ------------------------ | --------------------------------------------------------------------- |
| `COMPOSE_PROFILES`       | `monitoring` on a server | Add `monitoring` to start the monitoring stack                        |
| `ALERT_EMAIL_TO`         | `ACME_EMAIL`             | Who gets the alert e-mails                                            |
| `GRAFANA_ADMIN_PASSWORD` | generated                | Grafana's `admin` login                                               |
| `PROMETHEUS_RETENTION`   | 30d                      | How long Prometheus keeps metrics                                     |
| `OCPP_RATE_LIMIT_PER_IP` | 100                      | New charger connections per address and minute; raise for a load test |

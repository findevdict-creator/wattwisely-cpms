# Module 5: charging sessions and the pricing engine

Module 4 recorded what chargers report: a session row at StartTransaction, meter readings, the stop. This module turns those rows into **priced charging sessions**. A session now moves through states (charging, paused, idle, stopping, completed), the **pricing engine** (`packages/pricing`) prices it from a tariff version and the meter readings, and a new **worker** app (`apps/worker`) gives every finished session its final price, keeps a running cost while it charges, and closes sessions whose charger went silent. Operators set prices in the portal as **tariffs** with time-of-day bands, try them on a made-up session before saving, assign them to sites, and look at every session with its receipt, timeline and energy chart.

Stories covered: an operator creates a tariff with peak and off-peak bands, a start fee, an idle fee after a grace period and a minimum or maximum price, previews what a charge would cost, and assigns it to sites; new prices apply only to sessions that start afterwards. Staff see sessions at their sites with the cost so far while charging and the itemised receipt once priced, export them as CSV, and close a session that is stuck. Sessions that need a look before the driver is charged (longer than 48 hours, meter jumps, missing readings across a price change) are flagged. Payment holds, driver receipts and invoices come with later modules.

## What changed since module 4

| Before (module 4)                                                 | Now (module 5)                                                                                                                                             |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `charging_sessions.status` was `charging` or `ended`              | Nine states from the design (`authorising` … `failed`), every move written to `session_state_changes`; `ended` rows became `completed` in the migration    |
| A session only knew its connector                                 | It copies the site, the site's time zone and the tariff version in force at the start, so later edits to a site or tariff never change its price           |
| StopTransaction ended the session                                 | It moves to `stopping`; the idle fee runs until the car is unplugged; the worker prices it and moves it to `completed`                                     |
| `session.updated` carried `charging` or `ended`                   | It carries the session state and `gross_amount`; the worker adds `session.cost_updated` every 30 seconds while charging                                    |
| A connector's `active_session` was there only while `charging`    | It stays while the session is charging, paused, idle or stopping, and shows its state and cost so far; Stop charging shows only while the transaction runs |
| Sites had no prices                                               | `sites.tariff_id`; sites without a tariff still record sessions, which are completed unpriced and flagged `no_tariff`                                      |
| `apps/worker` was an empty placeholder                            | A NestJS app with three interval jobs, its own Docker image and Compose service                                                                            |
| The gateway published events with its own `ChargerEventPublisher` | It extends `ChargerEventNotifier` from `packages/session-engine`, which the worker and the API use too, so all three announce changes the same way         |

## The flow at a glance

```mermaid
sequenceDiagram
    participant Charger
    participant Gateway as ocpp-gateway
    participant DB as Postgres
    participant Worker as worker
    participant API
    participant Portal

    Charger->>Gateway: StartTransaction
    Gateway->>DB: session (site, time zone, tariff version copied), history: transaction_started → charging
    Charger->>Gateway: MeterValues (energy register)
    Gateway->>DB: meter_values, energy_wh; no increase for 2 min → idle
    loop every 30 s
        Worker->>DB: price each running session up to now (PricingEngine)
        Worker->>DB: net/tax/gross so far, NOTIFY session.cost_updated
    end
    Charger->>Gateway: StopTransaction
    Gateway->>DB: ended_at, meter_stop → stopping
    Charger->>Gateway: StatusNotification Available (the car left)
    Gateway->>DB: unplugged_at (idle time ends)
    loop every 60 s
        Worker->>DB: stopping and unplugged (or 4 h after the stop): lock row, price
        Worker->>DB: session_line_items, totals, engine version, input hash → completed, NOTIFY
    end
    DB-->>API: LISTEN charger_events
    API-->>Portal: live stream: connector card shows state and cost
    Portal->>API: GET /v1/sessions/{id}
    API-->>Portal: receipt, timeline, flags
```

## Design decisions for M1

The design leaves a few questions open; this module answers them as follows, each in one place so it is easy to change.

| Decision                                                                                                                                                                                                                                               | Why                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Money is integers.** Amounts are minor units (pence); unit prices and the tax rate are ten-thousandths (0.3450 per kWh is 3450, 20% is 2000). Each line is rounded half up on its own; tax is worked out per line                                    | The design's rule; no floating point anywhere near a receipt, and every line adds up to the total                                              |
| **A tariff is versioned.** Editing prices adds a version; a session keeps the version it started with. Archived tariffs stay readable; one still used by a site cannot be archived                                                                     | Running sessions never change price mid-charge, and every receipt can be explained later                                                       |
| **Idle starts after two minutes without new energy** (`apps/ocpp-gateway/src/sessions/idle-rule.ts`), at the reading that shows it, or at once on `SuspendedEV`                                                                                        | The design asks for idle detection without a number; two minutes rides out a slow meter. The idle fee then waits for the tariff's grace period |
| **A session with no energy is free by default** (`is_free_without_energy`, true for new tariffs)                                                                                                                                                       | A driver whose car would not charge should not pay a start fee; an operator can switch it off per tariff                                       |
| **Sessions start at `charging`.** `authorising` and `starting` are in the state machine but only used once payment holds exist                                                                                                                         | The gateway creates the session at StartTransaction; there is nothing to authorise against yet                                                 |
| **Final price at unplug, or four hours after the stop** (`finalise-policy.ts`); without a StopTransaction, four hours after the unplug from the last reading; with no readings at all the session fails `no_valid_stop_data`                           | The idle fee needs the unplug time; a car left for the night must still be priced, and the idle fee is capped anyway                           |
| **Stale = no news for 24 hours and the charger silent too.** Such sessions fail `stale`                                                                                                                                                                | A charger that is online but quiet about a long session is not stuck                                                                           |
| **Gaps are flagged, not guessed.** Energy between two readings is spread evenly; a gap over 15 minutes that crosses a band change, a meter that goes backwards or jumps beyond the connector's power, a session over 48 hours: each adds a review flag | The receipt stays reproducible, and a person decides before the card is charged (payments come later)                                          |
| **One worker, row locks.** Each job locks a session with `FOR UPDATE SKIP LOCKED` before pricing it, works tenant by tenant under row-level security, and runs one round at a time                                                                     | Two workers (or a worker and a staff member closing a session) can never price one session twice                                               |
| **Every price is reproducible:** the session stores the engine version and a hash of the whole input (tariff version and usage)                                                                                                                        | Pricing again later with the same engine gives the same hash and the same receipt. A re-price endpoint is not in this module                   |
| **Tariffs belong to the company.** Reading needs `tariffs:read`; creating, editing and archiving need `tariffs:write` / `tariffs:delete` for the whole company. Assigning a tariff to a site is a site edit (`sites:write` at that site)               | Prices are a company decision; a site manager chooses among them                                                                               |
| **API money formats:** unit prices are decimal strings with up to four decimals (`"0.3450"`), the tax rate a percentage string (`"20.00"`), all amounts integers in minor units with the currency next to them                                         | Exact in JSON both ways; the portal formats them for people                                                                                    |
| **Closing a stuck session** (`sessions:close_stuck` at its site): a stopped session is priced at once; one still running is marked `failed` (`closed_by_staff`) and nobody is charged                                                                  | Staff can clear what the charger never finished without inventing a price                                                                      |
| **CSV export is synchronous**, up to 10,000 sessions (422 `export_too_large` above that), amounts in the major unit                                                                                                                                    | Enough for a month of a small network; a background export comes with reporting                                                                |

## Read the code in this order

### 1. The pricing engine: `packages/pricing`

A pure library: no database, no clock, no Nest. Same input, same output.

| Step | File                                                                                 | What it does                                                                                                                                                   |
| ---- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `model/pricing-tariff.ts`, `tariff-band.ts`, `pricing-usage.ts`, `pricing-result.ts` | The input (a tariff version, the usage: cleaned meter series, charging and idle periods) and the output (lines, totals, minutes, flags)                        |
| 2    | `segments/local-clock.ts`, `local-time-segmenter.ts`, `band-matcher.ts`              | Splits a session into pieces of local time, each in exactly one band, through midnight and daylight-saving changes                                             |
| 3    | `segments/tariff-coverage.ts`                                                        | Checks that the bands cover every minute of the week exactly once; the API refuses a tariff otherwise, naming the gap or overlap                               |
| 4    | `meter/meter-series-cleaner.ts`, `meter-interpolator.ts`                             | Drops resets and impossible jumps (flagged), then reads the energy between any two moments                                                                     |
| 5    | `calculators/*`                                                                      | Start fee, energy per band, time per band, idle fee after the grace period and up to the cap, tax per line, one adjustment line for a minimum or maximum price |
| 6    | `review-flags.ts`, `input-hash.ts`                                                   | Why a session needs a look; the hash of the whole input                                                                                                        |
| 7    | `pricing-engine.ts`                                                                  | Puts it together: `price(tariff, usage)`                                                                                                                       |

### 2. The database: `packages/db`

| Step | File                                                                       | What it does                                                                                                                                  |
| ---- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 8    | `src/schema/tariffs.table.ts`, `tariff-versions.table.ts`                  | A tariff (name, currency, active or archived) and its numbered, never-changed price versions; bands are JSON                                  |
| 9    | `src/schema/charging-sessions.table.ts`, `charging-session-references.ts`  | New columns: site, time zone, tariff version, currency, unplugged and closed times, totals, engine version, input hash, review flags          |
| 10   | `src/schema/session-state-changes.table.ts`, `session-line-items.table.ts` | The append-only history (what happened, when, from which state to which) and the receipt lines                                                |
| 11   | `migrations/0007_sessions_pricing.sql`                                     | Hand-ordered from the generated SQL: the new status enum (old `ended` rows become `completed`), site and time zone filled in for old sessions |
| 12   | `migrations/0008_sessions_pricing_grants.sql`                              | The app role may append history, replace line items, and never delete a tariff version                                                        |
| 13   | `src/testing/test-tariffs.ts`, `test-sessions.ts`                          | The design's worked example as test data, shared by the API, gateway and worker tests                                                         |

### 3. The session engine: `packages/session-engine`

What the gateway, the worker and the API all need to know about sessions.

| Step | File                                                      | What it does                                                                                                                                     |
| ---- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 14   | `state/session-state-machine.ts`                          | The state machine as a table: which event leads where, and `null` when an event is not allowed (a resume after the stop is ignored)              |
| 15   | `store/session-transitions.ts`                            | Moves a session only if it still has the state the caller read, and writes the history row in the same transaction                               |
| 16   | `pricing/session-timeline.ts`, `session-usage-builder.ts` | Turns the history and readings into the engine's usage: charging periods, idle periods, the idle time after the stop until the unplug            |
| 17   | `pricing/session-pricer.ts`, `tariff-mapper.ts`           | Loads the session's tariff version and prices it; `no_tariff` and `no_stop_data` are answers, not errors                                         |
| 18   | `finalise/finalise-policy.ts`, `session-finaliser.ts`     | When a stopped session is due, and pricing it: receipt lines, totals, `completed`, the live event. Running it twice does nothing the second time |

### 4. The gateway: `apps/ocpp-gateway/src`

| Step | File                                                                | What it does                                                                                                              |
| ---- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 19   | `sessions/session-opener.ts`                                        | At StartTransaction: copies the site, time zone and tariff version, writes the first history row                          |
| 20   | `sessions/idle-rule.ts`, `adapters/v16/v16-meter-values.handler.ts` | Each energy reading updates the session; no increase for two minutes makes it idle, an increase makes it charging again   |
| 21   | `sessions/connector-session-effects.ts`                             | SuspendedEVSE pauses, SuspendedEV idles, Charging resumes, Available records the unplug                                   |
| 22   | `adapters/v16/v16-stop-transaction.handler.ts`                      | The stop moves the session to `stopping`; the charger's own timestamps are used, so late messages land in the right place |
| 23   | `sessions/session-recorder.ts`                                      | One place for a move plus its `session.updated` event                                                                     |

### 5. The worker: `apps/worker/src`

| Step | File                                          | What it does                                                                                      |
| ---- | --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 24   | `jobs/interval-job.ts`                        | A job runs every N ms, never overlapping itself, and logs instead of crashing                     |
| 25   | `jobs/tenant-iterator.ts`, `session-batch.ts` | Tenant by tenant under row-level security; each session locked and handled in its own transaction |
| 26   | `sessions/session-finalise.job.ts`            | Every minute: stopped sessions that are due get their final price                                 |
| 27   | `sessions/live-cost.job.ts`                   | Every 30 seconds: the cost so far of each running session, announced when it changed              |
| 28   | `sessions/stale-session-sweep.job.ts`         | Every 10 minutes: sessions silent for a day on a silent charger fail as `stale`                   |

### 6. The API: `apps/api/src/modules`

| Step | File                                                             | What it does                                                                                         |
| ---- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 29   | `tariffs/tariff-prices.ts`, `tariff-price-rules.ts`              | Decimal strings to ten-thousandths and back, exactly; the coverage and min-max checks                |
| 30   | `tariffs/tariff-changes.service.ts`                              | Create, rename, add a version, archive; each with its audit entry and If-Match                       |
| 31   | `tariffs/tariff-preview.service.ts`, `preview-usage.ts`          | Prices a made-up session with prices that are not saved yet, with the same engine                    |
| 32   | `assets/sites/…`                                                 | `tariff_id` on sites, checked to be an active tariff of the company                                  |
| 33   | `sessions/sessions.service.ts`, `sessions.repository.ts`         | Site-scoped list (newest first, cursor paging, filters) and detail with receipt, timeline and tariff |
| 34   | `sessions/session-close.service.ts`, `session-export.service.ts` | Closing a stuck session through the same finaliser the worker uses; the CSV export                   |

### 7. Endpoints

| Endpoint                                      | Permission              | Notes                                                                                                                                |
| --------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /v1/tariffs`, `GET /v1/tariffs/{id}`     | `tariffs:read`          | `status=active` (default) or `archived`; each with the prices in force and how many sites use it                                     |
| `POST /v1/tariffs` `{name, currency, prices}` | `tariffs:write`         | Whole company. 422 `tariff_invalid` names the gap or overlap; 409 `tariff_name_taken`                                                |
| `PATCH /v1/tariffs/{id}` `{name}`             | `tariffs:write`         | If-Match                                                                                                                             |
| `GET`, `POST /v1/tariffs/{id}/versions`       | `tariffs:read`, `write` | POST takes the prices and needs If-Match; 409 `tariff_archived`                                                                      |
| `DELETE /v1/tariffs/{id}`                     | `tariffs:delete`        | Archives. 409 `tariff_in_use` while sites use it                                                                                     |
| `POST /v1/tariffs/preview`                    | `tariffs:read`          | Prices, time zone, start, stop, energy and idle minutes in; lines and totals out                                                     |
| `POST`, `PATCH /v1/sites…` `{tariff_id}`      | `sites:write`           | 422 `tariff_not_found` for an unknown or archived tariff; `null` removes it                                                          |
| `GET /v1/sessions`                            | `sessions:read`         | Only sessions at the caller's sites. `site_id`, `charger_id`, `status` (comma list), `from`, `to`, `needs_review`, `limit`, `cursor` |
| `GET /v1/sessions/{id}`                       | `sessions:read`         | With `lines`, `state_changes`, `tariff`, engine version and input hash                                                               |
| `GET /v1/sessions/{id}/meter-values`          | `sessions:read`         | Energy since the start at each reading, for the chart                                                                                |
| `POST /v1/sessions/{id}/close`                | `sessions:close_stuck`  | 409 `session_closed`, 409 `session_busy` while the worker holds it; audit entry `sessions.closed`                                    |
| `GET /v1/sessions/export`                     | `sessions:export`       | `text/csv`, the same filters, at the sites the export permission covers                                                              |

### 8. The portal

| Step | File                                                                                          | What it does                                                                                                            |
| ---- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 35   | `shared/money.ts`, `money.pipe.ts`, `zoned-time.pipe.ts`                                      | Minor units to "£8.80" and back; times on the site's clock, which is what band times mean                               |
| 36   | `features/tariffs/tariff-form.ts`, `tariff-band-form.ts`                                      | The editor's fields and how they become the API's prices                                                                |
| 37   | `features/tariffs/tariff.component.ts`, `tariff-bands.component.ts`                           | New tariff or one tariff: prices, the bands table, save (a rename and, if prices changed, a new version), archive       |
| 38   | `features/tariffs/tariff-preview.component.ts`                                                | "What would this cost?" on the prices on screen                                                                         |
| 39   | `features/sessions/sessions.component.ts`, `sessions.store.ts`                                | The list with site, state and needs-a-look filters, and the CSV export                                                  |
| 40   | `features/sessions/session.component.ts`, `receipt.component.ts`, `energy-chart.component.ts` | One session: flags, receipt, the energy chart (inline SVG), timeline, Close session; follows the live stream while open |
| 41   | `features/chargers/live-event.applier.ts`, `connector-card.component.ts`                      | The connector shows the session's state and cost so far; `session.cost_updated` updates it in place                     |
| 42   | `features/sites/site-dialog.component.ts`, `site.component.ts`                                | Choose the site's tariff; the site page names it                                                                        |

## Running it

```sh
cd deploy
./scripts/up.sh --build     # runs migrations 0007 and 0008, starts the worker next to the gateway
./scripts/seed-demo.sh      # adds the Standard tariff to both Acme sites and one finished session
```

Within a minute of seeding, the worker prices the demo session at Riverside: 10 kWh off-peak (£3.00), 12 kWh peak (£4.80) and 10 billable idle minutes (£1.00), £8.80 in all with £1.47 tax, the design's worked example. Log in as `owner@acme.test`, open Sessions, then the session. To watch the cost tick, connect the simulator to a Riverside charger (module 4) and start charging from the charger page.

During development `npm start` now also runs the worker on port 3200 (`cp apps/worker/.env.example apps/worker/.env`). Its settings: `SESSION_FINALISE_INTERVAL_MS`, `SESSION_LIVE_COST_INTERVAL_MS`, `SESSION_STALE_SWEEP_INTERVAL_MS`.

## Tests

| Test                                                                                                                                         | What it proves                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/pricing/src/golden/golden.spec.ts`, `golden/cases/*.json`                                                                          | 13 sessions priced to the penny: the worked example (£8.80, £1.47 tax), midnight, a weekend boundary, both daylight-saving changes, a three-day session, idle over the cap, minimum and maximum, zero energy free and charged, a meter reset, a gap across a band change                                   |
| `packages/pricing/src/pricing-engine.property.spec.ts`                                                                                       | With random tariffs and sessions (fast-check): lines add up to the totals and each line is net plus tax, nothing is negative without a maximum price, splitting a session moves the total by at most one minor unit per line cut in two, the same input gives the same hash and any change a different one |
| `local-time-segmenter`, `tariff-coverage`, `meter-series-cleaner`, `rate` specs                                                              | Daylight saving and millisecond instants, gaps and overlaps named, resets and jumps dropped, exact rounding                                                                                                                                                                                                |
| `packages/session-engine/src/**/*.spec.ts`                                                                                                   | Every move of the state machine; the timeline's charging and idle periods; when a session is due; the finaliser against a real database (priced, no tariff, no stop data, run twice)                                                                                                                       |
| `apps/ocpp-gateway/src/sessions/session-states.flow.spec.ts`, `transport/messages.flow.spec.ts`                                              | With a simulated charger: the site's tariff and time zone copied onto a new session; paused, idle after two minutes without energy, resumed, stopping, unplugged; reports about a session that already stopped are ignored                                                                                 |
| `apps/worker/src/sessions/session-jobs.flow.spec.ts`                                                                                         | The worked example priced once the car left (and not before) and announced, the running cost kept up to date, a silent session failed as stale                                                                                                                                                             |
| `apps/api/src/modules/tariffs/*.flow.spec.ts`                                                                                                | Create, refuse gaps and contradicting limits, rename with If-Match, versions and history, permissions; preview; assign to a site; archive only when unused                                                                                                                                                 |
| `apps/api/src/modules/sessions/sessions.flow.spec.ts`                                                                                        | List within one's sites, close a stopped session (priced £8.80) and a running one (failed), the chart points, the audit entries, the CSV                                                                                                                                                                   |
| `apps/portal/.../tariff-form.spec.ts`, `money.spec.ts`, `zoned-time.pipe.spec.ts`, `energy-chart-path.spec.ts`, `live-event.applier.spec.ts` | Prices in and out of the editor exactly, money and site-clock formatting, the chart path, cost updates applied in place and the session removed once priced                                                                                                                                                |

The new portal pages were checked in Chromium against a mocked API. Not yet checked against real charger hardware or end to end on the Docker stack with Keycloak; the simulator and the flow tests stand in for both.

## Not in this module

| What                                                                                  | Where                                                                               |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Payment holds and capture; the `authorising` and `starting` states, `start_timeout`   | Payments module; the state machine already has the moves                            |
| Driver receipts, e-mails and invoices                                                 | Drivers and billing modules read `session_line_items`                               |
| Discounts and driver-group prices                                                     | Later; `tariffs:write` already says "tariffs and discounts"                         |
| Re-pricing a session with a corrected tariff                                          | Later; the stored engine version and input hash are there to check a re-run against |
| Asking a silent charger for its state (TriggerMessage) before calling a session stale | Later; the stale sweep is the one place to add it                                   |
| Showing the running cost on the charger's own display                                 | OCPP 2.0.1 (M2)                                                                     |
| A background export for very large CSV files                                          | Reporting module                                                                    |

# Module 19, part 2: paying with the driver account

Part 1 gave drivers a login and gave every card, driver and group a payment mode. This part makes the modes count. **No session is free unless an operator said so, RFID included.** A session the rules say is paid needs a way to pay: the card form on the QR page, or the driver's **saved card**. An RFID card whose holder has no saved card is now refused by the charger, instead of charging for nothing.

Stories covered: Dana saves a card in the driver app once and it works at every operator; she taps her RFID card at Riverside, the charger starts, and a minute later the hold is on her saved card; her bank refuses one day, so the charger is stopped at once and she gets an e-mail; she scans a plug while logged in and starts with one button, no card form; at the depot her group is free, so the same button starts a free charge; Guy, a login Acme has never heard of, scans an Acme plug and agrees that Acme may keep a record of him, and charges at the guest hold; Olivia sets a lower hold for her own drivers than for guests; every session in the portal and the CSV says how it was started and who decided who pays; Dana lists her charges across operators, stops one and downloads a CSV.

## What changed since part 1

| Before (part 1)                                                       | Now (part 2)                                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Payment modes were stored and shown, but nothing applied them         | `PaymentRules` (`packages/payments/src/rules`) resolves card, driver, groups and operator for every start. The result is saved on the session: `charging_sessions.start_source` and `payment_rule` (`outcome`, `decided_by`, `label`), with `is_paid` following the outcome         |
| An RFID card was accepted on access rules alone, and its session free | The gateway's `TagPolicy` also asks `PaymentAccess`: a paid card is accepted only when its holder's login has a usable default saved card and the operator's payment account takes payments. Otherwise the charger gets `Invalid`. Issued tags (staff remote starts) are free/staff |
| A driver could pay only with the card form on the QR page             | `payment_methods` (migration 0034): cards saved to a login, through a Stripe SetupIntent on the platform account. `driver_accounts.payment_customer_id` is the driver's one Stripe customer                                                                                         |
| A card-started session never had a hold                               | `SavedCardHoldJob` (worker) finds paid RFID sessions without a payment row and takes the hold off-session. A refusal, or no card at all, writes a failed payment, sends RemoteStop, flags the session `hold_refused` and e-mails the driver (`session_hold_refused`)                |
| One hold for everyone                                                 | `payment_accounts.member_hold_amount` (default 50.00) for the operator's own drivers, next to `hold_amount` for guests. A group's own `hold_amount` beats both; the lowest group hold applies                                                                                       |
| The driver app could start only an anonymous paid charge              | With a login the plug page shows who pays and starts with one button: the saved card is held, or nothing when the rule says free. `/account` lists saved cards; `/account/charges` lists charges across operators, with a detail page, a stop button and a CSV                      |
| An operator kept records only of drivers it had entered or invited    | A login that charges at an operator with no record of it gets one, `drivers.is_guest = true`, made with the driver's consent at the first start and audited as `drivers.guest_record_created` with the driver as actor                                                              |

## Who pays

```text
card.payment_mode       ─ pay | free ─▶ that              (decided_by: card)
        │ inherit
driver.payment_mode     ─ pay | free ─▶ that              (decided_by: driver)
        │ inherit
any group says free?    ─ yes ─▶ free                      (decided_by: group, label: its name)
any group says pay?     ─ yes ─▶ pay                       (decided_by: group)
        │ none
the operator            ─▶ pay                             (decided_by: operator)

hold of a paid session: the lowest hold_amount among the driver's groups,
                        else member_hold_amount, or hold_amount for a guest record
```

A guest with no login at the QR page always pays the guest hold (`decided_by: guest`). A staff remote start is free (`decided_by: staff`). Sessions from before this part keep `start_source` and `payment_rule` empty.

## Design decisions

| Decision                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **One customer on the platform account, the card copied per charge.** A saved card belongs to the driver, not to an operator. Each hold copies the payment method to the operator's connected account (`paymentMethods.create` with `stripeAccount`) and holds it there, so the money still goes straight to the operator                |
| **The platform places the RFID hold, not the gateway.** The charger does not wait for a bank. The gateway only checks that a way to pay exists and records the rule; the worker takes the hold seconds later. A refusal stops the charge at once and the driver is told, so the loss is bounded by those seconds                         |
| **Read the rule again when the hold is taken.** The worker resolves the card and driver again, and reads the default card then, so a card removed after the tap is noticed and refused                                                                                                                                                   |
| **A start from the app needs no card form.** The hold is placed off-session from the saved card; a confirmed hold sends RemoteStart through the same path a confirmed QR hold does (`RemoteSessionStarter`). A free start sends it at once                                                                                               |
| **A guest record only with consent, never merged.** The first start at a new operator asks the driver to agree to a record. If the operator already keeps a record with the same e-mail address, the start is refused with `driver_record_exists`: the operator must invite the driver, so records are never merged behind anyone's back |
| **The same refusals as at the charger.** A start from the app is refused for a blocked driver, a private site without membership, a plug that is not available, no price, no payment account or no saved card. The plug page shows the reason before the driver presses anything                                                         |
| **Existing records start on inherit.** No mode was changed by the migration. An operator whose drivers used to charge free by RFID must now mark them, their cards or their groups free, or ask them to save a card                                                                                                                      |

## Read the code in this order

| Step | Where                                                                                                    | What to look at                                                                                                   |
| ---- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1    | `packages/db/src/schema` (`payment-methods.table.ts`, `session-payment-rule.ts`)                         | Migrations 0034 and 0035: saved cards, the customer, the member hold, the session's start source and rule, guests |
| 2    | `packages/payments/src/rules`                                                                            | `PaymentRules`, `PaymentRuleResolver` (reads the levels in a tenant transaction), `SavedCardLookup`               |
| 3    | `packages/payments/src/flow` (`saved-card-hold.placer.ts`, `remote-session-starter.ts`)                  | The off-session hold, the refusal, and the start shared with the QR page                                          |
| 4    | `packages/payments-stripe/src/stripe-saved-cards.ts`                                                     | Customers, SetupIntents, and the hold that copies the card to the connected account                               |
| 5    | `apps/ocpp-gateway/src/access/payment-access.ts`, `commands/tag-policy.ts`                               | The card tap: access rules first, then whether the session can be paid                                            |
| 6    | `apps/worker/src/payments` (`saved-card-hold.job.ts`, `card-hold.taker.ts`)                              | The hold after a tap, the stop and the e-mail                                                                     |
| 7    | `apps/api/src/modules/driver-app` (`payment-methods`, `places`, `charges`)                               | Saved cards, the access block on a plug, the start, the guest record, the driver's charges                        |
| 8    | `apps/driver/src/app` (`features/account/cards`, `features/place/account-start*`, `features/my-charges`) | The screens                                                                                                       |
| 9    | `apps/portal/src/app/features/payments`, `features/sessions`                                             | Both holds in Settings > Payments; start source and who pays on sessions                                          |

## Endpoints

| Endpoint                                   | Who                          | Notes                                                                                                                                                                                                                  |
| ------------------------------------------ | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/driver/payment-methods`           | driver token                 | `items` (`brand`, `last4`, `exp_month`, `exp_year`, `is_default`), `is_provider_enabled`                                                                                                                               |
| `POST /v1/driver/payment-methods/setup`    | driver token                 | `setup_id`, `client_secret`, `publishable_key` for the card form on the platform account; opens the customer on first use. 503 `payments_unavailable`                                                                  |
| `POST /v1/driver/payment-methods`          | driver token                 | `setup_id` the form confirmed; 201 with the card, the first one default. 409 `card_setup_incomplete`                                                                                                                   |
| `PATCH /v1/driver/payment-methods/{id}`    | driver token                 | `is_default: true`; 404 `card_not_found`                                                                                                                                                                               |
| `DELETE /v1/driver/payment-methods/{id}`   | driver token                 | 204; detached at the provider; the newest other card becomes the default                                                                                                                                               |
| `GET /v1/driver/places/{identity}/{plug}`  | driver token                 | The public place plus `access`: `is_linked`, `is_guest_record`, `is_blocked`, `is_private_site`, `is_member`, `needs_consent`, `payment` (with `words`, `hold_amount`), `card`, `can_charge`, `reason`, `reason_words` |
| `POST /v1/driver/charges`                  | driver token                 | `charger_identity`, `ocpp_connector_id`, `is_consent_given`. 201 with the charge. 409 `consent_required`, `driver_record_exists`, or the `reason` the place showed; 503 on a provider outage                           |
| `GET /v1/driver/charges`                   | driver token                 | The newest 100 across every linked operator, with `start_source`, `payment_rule` and `payment`                                                                                                                         |
| `GET /v1/driver/charges/export`            | driver token                 | The same as CSV                                                                                                                                                                                                        |
| `GET /v1/driver/charges/{id}`              | driver token                 | Adds `receipt`, `can_stop`, `is_stop_requested`; `charge_key` only in the answer to a paid start. 404 `charge_not_found` for anyone else's                                                                             |
| `POST /v1/driver/charges/{id}/stop`        | driver token                 | RemoteStop, once; 409 `charge_not_running`                                                                                                                                                                             |
| `PATCH /v1/payment-account`                | `settings:payments` (tenant) | `hold_amount` and now `member_hold_amount` (either or both, 1.00 to 1,000.00)                                                                                                                                          |
| `GET /v1/sessions…`, `/v1/sessions/export` | `sessions:read`, `:export`   | `start_source` and `payment_rule` (with `words`); two new CSV columns                                                                                                                                                  |

Starting a charge and opening a card setup use the `public_write` rate limit.

## Running it

Apply the migrations. The worker reads `SAVED_CARD_HOLD_INTERVAL_MS` (default 10000). Saving cards needs the same Stripe keys as module 6; with no keys the account page says card payments are off, and free sessions still work.

In the demo data, the "Depot staff" group is now free, so Dana's `DEMO-CARD-1` is accepted and free (`Free: group Depot staff`). Priya's `DEMO-CARD-3` is refused, because her sessions are paid and she has no saved card. The pool van's `DEMO-CARD-5` is free by its own mode:

```sh
npm run sim -- --url ws://ocpp.localhost/ocpp --identity WW-7KQ4M2XR9T --tag DEMO-CARD-1   # Accepted, free (group)
npm run sim -- --url ws://ocpp.localhost/ocpp --identity WW-7KQ4M2XR9T --tag DEMO-CARD-3   # Invalid: paid, no saved card
```

**Upgrading an installation:** every record starts on `inherit`, which means pay. Before deploying, an operator whose drivers charged free by RFID should mark those drivers, cards or groups free, or those cards will be refused.

## Tests

| Spec                                                                              | What it proves                                                                                                                                      |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/modules/driver-app/driver-payment-methods.flow.spec.ts`             | Cards saved on the platform account, the first default, default moved, removed and detached, an unfinished setup refused, nobody else's cards shown |
| `apps/api/src/modules/driver-app/driver-charges.flow.spec.ts`                     | The member hold on a saved card and RemoteStart, a free group start, consent and a guest record, a refused card ending not started, list, CSV, stop |
| `apps/api/src/modules/driver-app/driver-place-access.flow.spec.ts`                | An unlinked record with the same address refused, a blocked driver, a private site                                                                  |
| `apps/ocpp-gateway/src/access/card-payment.flow.spec.ts`                          | A paid card refused until saved card and payment account exist, the session recorded as paid, a free group and a card that says pay again           |
| `apps/worker/src/payments/saved-card-hold.flow.spec.ts`                           | The hold taken once, a refusal stopping the charge with a flag and an e-mail, no card at all                                                        |
| `packages/payments/src/rules/payment-rule.spec.ts`, `driver-place-access.spec.ts` | The order of the levels, the lowest group hold, the refusals in order                                                                               |

## Not in this part

- Charging a driver's saved card when a QR guest has no login (the anonymous page keeps its own card form).
- Cards a driver orders or blocks themselves, and a virtual card in the app.
- Receipts by e-mail for app starts beyond what module 11 sends today.

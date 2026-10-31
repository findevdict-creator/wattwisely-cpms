# Module 26: driver web redesign

The driver app gets the look of the approved phone screens, the last of the redesign's apps. **The bar is the operator's**: its colour, its logo or its initials on a dark square, and the account icon; the platform's own pages show the bolt. **Every page is a column of cards**, a phone wide, with the page's name over them. **The plug page reads like a price sign**: the plug with its state, each price band with the one in force marked, the fees, and one big "Pay and charge" with the hold named above it. **A charge in progress has four steps over it**, Paid, Started, Charging and Done, and the cost so far as one big figure. **The receipt is the operator's**: paid with which card, what goes back from the hold, each line with its quantity and price, the tax and the total. The account, the charge history, an operator and the invitation follow the same cards.

URLs, permissions and `data-testid` attributes stay as they were. Every page reads the same endpoints; nothing in the API changed. Two forms that never worked in the browser now do (see "Behaviour that changed").

Stories covered: Marco scans the QR code on plug B at Riverside Car Park, reads the prices and the hold, pays by card and watches the charge from Paid to Charging; he asks for e-mail updates, stops the charge and reads the receipt, with the €31.20 left of the hold going back to his card; with no camera he types the code on the sticker; logged in, he starts with his saved card instead; Acme Charging invites him by e-mail and he accepts, then reads what Acme holds about him; he looks through his charges at every operator, narrowed to GreenPark Fleet, and saves his phone number.

## What changed

| Before                                                                                    | Now                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A bar with a bolt and the operator's name                                                 | The operator's colour with its logo or its initials on a dark square, the account icon on the right; the platform's own pages show the bolt                                                                                                                                                                                |
| Home: a card with a "No camera?" button that opened the fields, and plain rows of charges | "Scan to charge" with the fields for the code always there under "No camera? Type the code on the sticker", and "Your charges on this phone" as cards with a bolt or a receipt, the cost and the state as a chip                                                                                                           |
| Plug page: the plug, "Now" in large type, the other bands and fees as small print         | The plug as a tile with its letter, ID, type and power and a chip for its state; the prices as rows (each band with "Now" on the one in force, the start and idle fees, the minimum and maximum) and the tax under them; "Pay and charge" as a large button, the login under it, and how to reach the operator at the foot |
| A charge: one card per phase                                                              | The four steps over the charge until it is done; the cost so far in large type with energy, time and the hold under it, "Stop charging" as a large red-outlined button                                                                                                                                                     |
| The receipt: a tick, the price and a list                                                 | The price with the card it was paid with and when; a green notice with what goes back from the hold; the receipt in the operator's name with each line's kWh and unit price ("22.0 kWh at €0.40"), "Unplugged in time" for an idle fee that did not apply, the tax and the total                                           |
| Invitation: a card with the words and the buttons                                         | What linking does, as three ticks; the buttons full width; who is logged in, with "Log out", under the card                                                                                                                                                                                                                |
| Account: fields, cards, a link and the operators as plain cards                           | Your initials with your e-mail; About you; Your cards as rows with "Make default" and a named remove button; Your charges as a link card; each operator with its initials, what it calls you and who pays, and "Blocked" as a red chip                                                                                     |
| Your charges: one long list                                                               | A filter by operator, the charges under their month, the state and who paid on a third line ("Card refused · nothing taken" in red), "Free" in green                                                                                                                                                                       |
| An operator: plain lists                                                                  | Its initials, "Linked" in green right after accepting the invitation, the record as label and value pairs with each card's state as a chip, and what leaving does before the button                                                                                                                                        |

## Before and after

At 390 wide, as a phone shows them, with the API stubbed. The card form is drawn by a stand-in for the payment provider's script.

| Before                                                                       | After                                                                      |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| ![Home before](images/26-before-home.png)                                    | ![Home after](images/26-after-home.png)                                    |
| ![Typing the code before](images/26-before-home-typed.png)                   | ![Typing the code after](images/26-after-home-typed.png)                   |
| ![Plug page before](images/26-before-place.png)                              | ![Plug page after](images/26-after-place.png)                              |
| ![A plug in use before](images/26-before-place-busy.png)                     | ![A plug in use after](images/26-after-place-busy.png)                     |
| ![Another operator's colours before](images/26-before-place-other-brand.png) | ![Another operator's colours after](images/26-after-place-other-brand.png) |
| ![Plug page, logged in before](images/26-before-place-signed-in.png)         | ![Plug page, logged in after](images/26-after-place-signed-in.png)         |
| ![Paying by card before](images/26-before-charge-card.png)                   | ![Paying by card after](images/26-after-charge-card.png)                   |
| ![Starting before](images/26-before-charge-starting.png)                     | ![Starting after](images/26-after-charge-starting.png)                     |
| ![Charging before](images/26-before-charge-charging.png)                     | ![Charging after](images/26-after-charge-charging.png)                     |
| ![Stopped before](images/26-before-charge-finishing.png)                     | ![Stopped after](images/26-after-charge-finishing.png)                     |
| ![Done, with the receipt before](images/26-before-charge-done.png)           | ![Done, with the receipt after](images/26-after-charge-done.png)           |
| ![Did not start before](images/26-before-charge-failed.png)                  | ![Did not start after](images/26-after-charge-failed.png)                  |
| ![Invitation before](images/26-before-invitation.png)                        | ![Invitation after](images/26-after-invitation.png)                        |
| ![Invitation, logged in before](images/26-before-invitation-signed-in.png)   | ![Invitation, logged in after](images/26-after-invitation-signed-in.png)   |
| ![Account before](images/26-before-account.png)                              | ![Account after](images/26-after-account.png)                              |
| ![Your charges before](images/26-before-my-charges.png)                      | ![Your charges after](images/26-after-my-charges.png)                      |
| ![One of your charges before](images/26-before-my-charge.png)                | ![One of your charges after](images/26-after-my-charge.png)                |
| ![An operator, just linked before](images/26-before-operator.png)            | ![An operator, just linked after](images/26-after-operator.png)            |
| ![A blocked operator before](images/26-before-operator-blocked.png)          | ![A blocked operator after](images/26-after-operator-blocked.png)          |
| ![Leaving an operator before](images/26-before-operator-leave.png)           | ![Leaving an operator after](images/26-after-operator-leave.png)           |

## How the pieces fit

```
app.component                 the bar: logo, or initials (Initials) or the bolt; main, a phone wide
styles.scss                   panel, where, figure, caption, back, text-link, op-mark, mark
shared
├─ charge-chips.ts            a session or a plug's availability as a chip: tone and word
├─ charge-steps.ts            Paid, Started, Charging, Done for a phase; shown while live
├─ charge-hold.ts             what goes back to the card once the charge is paid
├─ unit-price.pipe.ts         "0.4000" as "€0.40" (Money.unitPrice)
└─ initials.ts                "AC" for Acme Charging
features
├─ home                       scan to charge; the code form; charges on this phone
├─ place
│  ├─ place.component         the plug, the prices, pay by card, the login, the support line
│  ├─ tariff-summary          bands with "Now", the fees, the tax
│  └─ account-start           "With your account": free, or the saved card
├─ charge
│  ├─ charge.component        the steps and one panel per phase; e-mail updates while live
│  ├─ charge-steps.component  the four bars
│  ├─ charge-done.component   the price, the hold that goes back, the receipt card
│  ├─ charge-receipt          the lines, the tax, the total
│  ├─ card-form, charge-updates
├─ invitation                 who invites, what linking does, the way in
├─ account                    account, saved cards, an operator (?linked=1)
└─ my-charges
   ├─ charge-history.ts       by month, by operator, the state in words
   └─ my-charges, my-charge
```

- **The steps follow the phase.** `ChargeSteps.of(phase)` marks each of Paid, Started, Charging and Done as behind, at or ahead of the phase `ChargePhases.of` already works out, and the bar shows only while the charge is under way: the receipt and a charge that did not start have none. The step under way is half filled; nothing in the public charge says how far along it is.
- **Chips say the state in a word.** `ChargeChips.session` gives each session state a tone and a short word ("Charging", "Paused", "Done", "Did not start"); `ChargeChips.availability` does the same for a plug. The words in sentences (the heading of a failed charge, the payment line on the receipt) are still `ChargeWords`'.
- **The hold is named twice.** Before paying, the plug page says how much is held; after, `ChargeHold.released` works out what goes back (the hold less what was taken, once the payment is captured) and the receipt says so.
- **Unit prices have the currency's sign.** `Money.unitPrice` writes the API's four-decimal prices with the currency's usual decimals, or more when the price has them ("€0.125"), for the price rows and the receipt's lines.
- **The history is laid out by `ChargeHistory`.** It groups the charges by month at the site, lists the operators for the filter and writes the third line of each row; the filter shows only when there is more than one operator.
- **"Linked" after accepting.** The invitation sends the driver to the operator's page with `?linked=1`, which shows the green notice; the page is the same without it.

## Shared pieces in packages/ui

- `.ww-large` in `_material.scss`: 48px buttons with 15px labels and the larger radius, for the one step a phone page is about (Pay and charge, Stop charging, Accept). It is the counterpart of `.ww-small`.
- Three icons: `badge-check`, `mail-open` and `user-round`.

## Behaviour that changed

- **Open on the home page and Save on the account page work.** Both forms were bound to single controls with `(ngSubmit)` and no `FormGroup`, and the app imports only the reactive forms module, so nothing listened for `ngSubmit`: Open, or Enter in the fields, reloaded the home page, and Save reloaded the account page without saving. Both are `FormGroup`s now; Open goes to the plug and Save sends the change (checked in the browser before and after).
- **The fields for the code are always shown** on the home page, as on the approved screen. `type-code` is on the line over them.
- **"Have an account? Log in to use your saved card"** moved from the account card to under "Pay and charge", where the screen has it; `login` came with it. How to reach the operator is now at the foot of the plug page whatever the plug's state, not only when it cannot be used.
- **The plug's chip says "Available"**, which fits beside the plug; the other states keep their words.
- **Labels have no asterisks** in the driver app: every field asked for is needed, and the one that is not says "optional".
- **The remove button on a saved card** is named after the card ("Remove Visa ending 4242") for screen readers.
- **Leaving an operator** explains what leaving does before the button; the second step still asks to confirm, as "Leave Acme Charging?".

## Where the build differs from the approved screens

- **The plug is typed as a number.** The screen shows "B"; the QR code's address, and the API, name the plug by its number, so the field asks for that. The plug page shows the plug's letter.
- **No card brands under "Pay and charge".** Which ways to pay the card form offers (cards, wallets, local methods) depends on the operator's payment account, so the page does not promise any.
- **"Charging" without the power.** The public charge has no power reading, so the chip says "Charging" and not "Charging · 22 kW".
- **No "Save as PDF" on the receipt**, and the tax line says "Of which tax" without the rate: the receipt carries the amount of tax, not its rate.
- **No count beside "Your charges"** on the account page, which does not load the charges.
- **Operators are initials on dark, not in their own colours**: the list of the driver's operators carries no branding.
- **Months have their year** ("October 2026") in the charge history, and the filter uses the operators' full names.
- **The step under way is half filled** rather than showing how far the charge has got, which the public charge does not say.

## Design decisions

- **The operator's colour where the driver acts, the theme's for states.** The bar, the buttons, the steps and the plug's tile take the operator's colours (module 8's `BrandTheme`); "Available", "Charging", "Now" and the red and amber chips keep theme.json's status colours on every operator's page, so a state reads the same everywhere.
- **One column of cards, 480px at most.** On a tablet or a computer the page stays a phone's width in the middle, as the receipt and the plug page are read on a phone.
- **The receipt is a component of its own** (`ChargeDoneComponent`), since it is the page a driver comes back to: what was paid, with what, what goes back, and who to ask.
- **Links stay the platform's link colour.** The operator's accent colours the support links, as since module 8; the platform's own accent is the ink colour, which would make links on its pages black.

## How it was checked

`prettier --check .` and `nx run-many -t lint test build` pass. New specs cover `ChargeChips`, `ChargeSteps`, `ChargeHold`, `ChargeHistory`, `Money.unitPrice` and `Initials`. A script compared every `data-testid` in the driver app before and after: none was lost (`price-now` is now bound to the band in force), and `steps`, `hold-released` and `linked` are new. A Playwright script pressed Open on the home page and Save on the account page on both builds: before, each reloaded the page; after, Open went to the plug and Save sent `PATCH /v1/driver/me`. The screenshots above were taken with Playwright against the built app with the API stubbed, at 390 wide.

## Read the code in this order

1. `app.component.ts` and `styles.scss`, then `shared/charge-chips.ts`, `charge-steps.ts`, `charge-hold.ts` and `money.ts` with their specs.
2. `features/home/home.component.*`.
3. `features/place/place.component.*`, `tariff-summary.component.*` and `account-start.component.*`.
4. `features/charge/charge.component.*`, `charge-steps.component.ts`, `charge-done.component.*` and `charge-receipt.component.*`; then `card-form.component.ts` and `charge-updates.component.*`.
5. `features/invitation/invitation.component.*`.
6. `features/account/account.component.*`, `cards/saved-cards.component.*` and `operator.component.*`.
7. `features/my-charges/charge-history.ts` and its spec, then `my-charges.component.*` and `my-charge.component.*`.

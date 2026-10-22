# Module 8: tenant branding

Module 7 put the operator's name on the driver's page and left its look for later. This module is the **"Branded" level** of the white-labelling design, for every plan in M1: an operator sets its **name, logo, colours and support contact** once, in the portal, and every surface a driver or a team member sees is dressed in them: the QR charge page and the rest of the driver app, the receipt, and the e-mails the platform sends on the operator's behalf. A small **"Powered by Wattwisely"** line stays on each of them. The platform's own colours are what a tenant gets until it saves something, so nothing an earlier module built changes for a tenant that never opens the screen.

Stories covered: an operator opens Settings, Branding in the portal, picks a logo, two colours and types the help desk's e-mail and phone, sees a preview of the driver's page while typing, and saves; a driver who scans a plug of that operator sees its logo in the bar, buttons in its colour, the page named after it, and "Need help? help@acme.test" at the foot; the receipt carries the logo and the support line; a person invited to the team gets an e-mail with the operator's colour bar, logo and name, sent as "Acme Charging"; a logo that is not an image, too big, or an SVG that could run is refused with a sentence; two people editing the brand at once cannot overwrite each other; every change is in the audit log with what it was before and after; nothing of one tenant's brand is visible on another tenant's plugs.

## What changed since module 7

| Before (module 7)                                                                          | Now (module 8)                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The driver app was green, named "Wattwisely", and showed the operator's name from the site | The app paints itself from the `branding` field of the place and the charge: logo or name in the bar, the operator's primary colour on buttons and the bar, the page's title and theme colour, a support line, "Powered by Wattwisely" |
| Nothing about a tenant's look was stored                                                   | `tenant_branding`: one row per tenant with the display name, two colours, support e-mail, phone and web address, and the logo's bytes, type and fingerprint, versioned and under row-level security                                    |
| `GET /v1/public/places/…` and `GET /v1/public/charges/{key}` had `operator_name`           | Both also carry `branding` (name, logo URL, colours and the text colour that reads on the primary one, support contact, `platform_name`)                                                                                               |
| Invitation e-mails were plain text from "Wattwisely"                                       | Every e-mail goes through `BrandedMailLayout`: a bar in the brand's colour with the logo and name, a button, the support line, the platform's footer; sent as the operator's name                                                      |
| The portal had no settings screens                                                         | Settings, Branding: `/settings/branding`, under `settings:read`, with a live phone-sized preview; saving needs `settings:write`                                                                                                        |
| The API knew the portal's and the driver app's public addresses                            | It also knows its own, `API_URL`, to build the public logo links; Compose derives it from `API_HOST`                                                                                                                                   |

## The flow at a glance

```mermaid
sequenceDiagram
    participant Portal as Portal (Settings, Branding)
    participant API
    participant DB as Postgres (tenant_branding)
    participant Phone as Driver's phone (apps/driver)

    Portal->>API: GET /v1/branding
    API-->>Portal: the saved fields, the logo's link, a preview, version 1 when nothing is saved
    Portal->>API: PATCH /v1/branding (If-Match: 1) {display_name, primary_color, support_email, …}
    API->>DB: insert the row (version 2), audit settings.branding_changed
    Portal->>API: PUT /v1/branding/logo (If-Match: 2) {content_type, data (base64)}
    API->>API: LogoPolicy: type, size, magic bytes, SVG safety; etag = sha256 of the bytes
    API->>DB: store the bytes (version 3), audit settings.logo_changed
    API-->>Portal: logo_url = API_URL/v1/public/branding/acme-charging/logo?v=<etag>
    Phone->>API: GET /v1/public/places/WW-7KQ4M2XR9T/1
    API-->>Phone: …, branding {name, logo_url, primary_color, on_primary_color, support_email, …}
    Phone->>Phone: BrandService sets the Material colour tokens, the title and the theme colour
    Phone->>API: GET /v1/public/branding/acme-charging/logo?v=<etag>
    API-->>Phone: the bytes, Cache-Control public 1 day, ETag, a CSP for SVG
```

## Design decisions for M1

| Decision                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Branding is settings, not a theme engine.** Seven fields and a logo. The driver app maps the two colours onto Angular Material's system tokens (`--mat-sys-primary`, a tint for containers, the text colour that reads on each), so every button, bar and chip follows without per-component styling. Fonts, layouts and custom CSS are M2's "Custom" level                               |
| **Every tenant has a brand**: `TenantBrand.of(tenantName, settings, logoUrl)` falls back field by field to the tenant's name and the platform's green. Pages never check whether a tenant "has branding"                                                                                                                                                                                    |
| **The text colour on the primary colour is computed** (`BrandColour.textOn`, WCAG relative luminance), not chosen, so an operator cannot pick a colour that makes the buttons unreadable. The API sends it as `on_primary_color`; e-mails and the app use it                                                                                                                                |
| **The logo's bytes live in the `tenant_branding` row**, at most 512 KB. One table, one backup, no bucket to configure for a file per tenant; the object store from module 1 can take over for M2's app icons and store listings. The public link carries the bytes' fingerprint (`?v=<etag>`), so the API can say "cache for a day" and a new logo still shows at once                      |
| **A logo is checked before it is stored**: one of PNG, JPEG, SVG or WebP, the first bytes must match the claimed type (a renamed file is refused), and an SVG with a script, an event handler, a `foreignObject`, an `iframe`, `javascript:` or an entity is refused, because the API serves the bytes as they are. It also serves SVG with a `Content-Security-Policy` that allows nothing |
| **The logo is public**, at `GET /v1/public/branding/{slug}/logo`, with no token: it is on the driver's page, which has no login, and in e-mails, which no mail client would fetch with a token. The slug is the tenant's, already in the URL of nothing else public, and a logo is public by nature                                                                                         |
| **The upload is JSON with base64**, not multipart: the portal already sends JSON with `If-Match` for everything, 512 KB is small, and the API keeps one body pipeline (validation, problem details, audit) for it. Multipart comes with the first file that is large                                                                                                                        |
| **The row is created on the first save.** `GET /v1/branding` on a tenant that never saved answers with empty fields and `version: 1`; the first `PATCH` or `PUT` with `If-Match: 1` inserts the row as version 2. Afterwards it is module 3's rule: every change needs the version last seen, 428 without it, 409 `version_conflict` when someone else saved first                          |
| **One mail layout for every e-mail** (`BrandedMailLayout`): subject, headline, paragraphs, an optional button, a footnote; it adds the brand's bar, the support line and "Powered by Wattwisely", and the sender's display name becomes the operator's. The invitation from module 2 is the first e-mail through it; receipts and the notifications module reuse it                         |
| **`PublicBrandingDto` is on every public answer** that shows a page, rather than a separate call: the phone has what it needs to paint the page before it has anything else, and the charge page still works when it is opened from a remembered charge without the place                                                                                                                   |
| **`settings:read` and `settings:write`** are the permissions, already in module 2's catalogue: every system role can look, only the Owner can change; nothing new to assign                                                                                                                                                                                                                 |

## Read the code in this order

### 1. The database: `packages/db`

| Step | File                                                                     | What it does                                                                                                                           |
| ---- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `src/schema/tenant-branding.table.ts`, `src/schema/bytea.ts`             | The row, its check (a logo has bytes, a type and an etag together or not at all), the tenant isolation policy; the `bytea` column type |
| 2    | `migrations/0011_tenant_branding.sql`, `0012_tenant_branding_grants.sql` | The table and the policy; what `wattwisely_app` may do with it (select, insert, update; no delete, the row stays)                      |

### 2. The API: `apps/api/src/modules/branding`

| Step | File                                                                                                            | What it does                                                                                                                                          |
| ---- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3    | `tenant-brand.ts`, `brand-colour.ts`                                                                            | What a brand is and how it falls back to the defaults; colours normalised to `#rrggbb` and the text colour that reads on them                         |
| 4    | `branding.module.ts`, `branding.controller.ts`                                                                  | `GET`/`PATCH /branding`, `PUT`/`DELETE /branding/logo`; exports `TenantBrandLookup` for the modules that show a brand                                 |
| 5    | `branding.service.ts`, `logo.service.ts`                                                                        | Which fields a PATCH changes (null or an empty string clears one), colours normalised; the logo checked, fingerprinted and stored or dropped          |
| 6    | `branding.saver.ts`, `branding.repository.ts`, `branding-record.ts`                                             | The one write path: create the row on the first save or update it with the version seen, and audit before and after in the same transaction           |
| 7    | `logo-policy.ts`, `branding-errors.ts`                                                                          | The four types, the size, the magic bytes, the SVG rules; the problem each refusal answers with                                                       |
| 8    | `tenant-brand.lookup.ts`, `logo-url.builder.ts`                                                                 | The brand of a tenant for anything that paints a page, inside a transaction or in its own; the public logo link from `API_URL`, the slug and the etag |
| 9    | `public/public-logo.controller.ts`, `public-logo.service.ts`                                                    | `GET /public/branding/{slug}/logo`: the bytes with their type, a day of caching, the ETag, and a CSP for SVG; 404 for a tenant without one            |
| 10   | `mail/branded-mail.layout.ts`                                                                                   | The HTML and the plain text of every e-mail: the brand bar, the message, the button, the support line, the platform's footer                          |
| 11   | `dto/branding.dto.ts`, `public-branding.dto.ts`, `update-branding-request.dto.ts`, `upload-logo-request.dto.ts` | What the portal gets (the fields, the logo's link, a `preview` of what drivers see, `version`); what the driver app gets; what may be sent            |
| 12   | `drivers/places/place-describer.ts`, `payments/public/charge-view.builder.ts`                                   | The place and the charge now carry `branding`, read inside the tenant's transaction                                                                   |
| 13   | `team/invitation.mailer.ts`, `common/mail/mail.sender.ts`                                                       | The invitation through the branded layout, sent as the operator's name (`fromName`)                                                                   |
| 14   | `config/api.config.ts`, `api-config.loader.ts`                                                                  | `API_URL`, required, next to the portal's and the driver app's addresses                                                                              |

### 3. The driver app: `apps/driver/src/app`

| Step | File                                                                     | What it does                                                                                                                                   |
| ---- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 15   | `core/branding/brand-theme.ts`, `brand.service.ts`                       | A brand mapped onto Material's colour tokens, the title and the theme colour; applied when a place or a charge arrives, reset on the home page |
| 16   | `app.component.ts`                                                       | The bar with the logo or the name, the "Powered by Wattwisely" foot                                                                            |
| 17   | `shared/support-contact.component.ts`                                    | "Need help?" with the e-mail, phone and web address a brand has; nothing when it has none                                                      |
| 18   | `features/place/place.component.*`, `features/charge/charge.component.*` | The operator's name from the brand; the receipt with the logo and "Charging by …, Powered by Wattwisely"                                       |

### 4. The portal: `apps/portal/src/app`

| Step | File                                                                   | What it does                                                                                                                                       |
| ---- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 19   | `core/api/branding-api.service.ts`, `models/branding.ts`               | The four calls, with `If-Match`                                                                                                                    |
| 20   | `features/settings/branding-form.ts`, `brand-colour.ts`                | The form: the same checks as the API, empty fields sent as null, and the preview built from what is typed                                          |
| 21   | `features/settings/logo-file.reader.ts`                                | The chosen file checked (type, size) and encoded for the API before anything is sent                                                               |
| 22   | `features/settings/branding.component.*`, `brand-preview.component.ts` | The screen: fields, colour pickers, the logo with Replace and Remove, Save, and a phone-sized preview of the driver's page that follows the typing |
| 23   | `app.routes.ts`, `layout/shell.component.html`                         | `/settings/branding` behind `settings:read`; "Branding" in the navigation                                                                          |

### 5. Endpoints

| Endpoint                                                  | Permission       | Notes                                                                                                                                                                                                                       |
| --------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/branding`                                        | `settings:read`  | `display_name`, `primary_color`, `accent_color`, `support_email`, `support_phone`, `support_url`, `logo_content_type`, `logo_size_bytes`, `logo_url`, `preview` (what drivers see), `updated_at`, `version` (1 until saved) |
| `PATCH /v1/branding`                                      | `settings:write` | Only the fields sent change; null or an empty string clears one. Colours are six hex digits, `support_url` needs `http(s)://`. 428 without `If-Match`, 409 `version_conflict`, 400 `validation_failed`                      |
| `PUT /v1/branding/logo`                                   | `settings:write` | `{content_type, data}` (base64). 415 `logo_type_not_allowed`, 422 `logo_too_large` (over 512 KB or empty), `logo_not_an_image` (the bytes are not the type claimed), `logo_unsafe` (an SVG that could run)                  |
| `DELETE /v1/branding/logo`                                | `settings:write` | Drops the logo; 404 `logo_not_found` without one                                                                                                                                                                            |
| `GET /v1/public/branding/{slug}/logo`                     | public           | The bytes with their type; `Cache-Control: public, max-age=86400`, `ETag`; SVG with a CSP that allows nothing; 404 `logo_not_found`                                                                                         |
| `GET /v1/public/places/…`, `GET /v1/public/charges/{key}` | public           | Now carry `branding`: `name`, `logo_url`, `primary_color`, `on_primary_color`, `accent_color`, `support_email`, `support_phone`, `support_url`, `platform_name`                                                             |

## Running it

```sh
cd deploy
./scripts/up.sh --build         # the API now gets API_URL from API_HOST; nothing to add to .env
./scripts/seed-demo.sh          # Acme Charging comes with a brand: blue and orange, a logo, help@acme.test
```

Open <http://portal.localhost> as `owner@acme.test`, Settings, Branding: the demo brand with its logo, and the preview on the right. Change the primary colour and the preview follows; Save, then open <http://charge.localhost/c/WW-7KQ4M2XR9T/1>: the bar carries the logo, the buttons the colour, the foot "Need help? help@acme.test" and "Powered by Wattwisely". Volt Hotels, which saved nothing, shows its name in the platform's green. Invite someone from Team and the e-mail (Mailpit at <http://localhost:8025> on a local trial) comes as "Acme Charging" with the blue bar.

With `npm start` the API needs `API_URL` (`apps/api/.env.example` has `http://localhost:3000`): the logo links the API hands out are built from it.

## Tests

| Test                                                                                      | What it proves                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/modules/branding/brand-colour.spec.ts`, `tenant-brand.spec.ts`              | Colours normalised; white text on dark colours and dark on light; a brand falls back field by field; no logo link without a logo                                                                                                                                                 |
| `apps/api/src/modules/branding/logo-policy.spec.ts`, `logo-url.builder.spec.ts`           | The four types accepted when the bytes match; other types, renamed, empty and oversized files refused; an SVG that could run refused; the fingerprint; the public link                                                                                                           |
| `apps/api/src/modules/branding/mail/branded-mail.layout.spec.ts`                          | An e-mail wrapped in the brand in HTML and plain text; what a brand lacks is left out                                                                                                                                                                                            |
| `apps/api/src/modules/branding/branding.flow.spec.ts`                                     | Against Postgres: the defaults before anything is saved; a save with the version seen, a conflict without it, before and after in the audit log; refusals; a logo stored, served publicly with its headers, and dropped; the four logo refusals; who may look and who may change |
| `apps/api/src/modules/branding/brand-on-pages.flow.spec.ts`                               | Against Postgres: the saved brand on the place and the charge, and nothing of it for another tenant; the invitation e-mail in the brand's colour with the logo, the support line and the platform's footer, sent as the operator                                                 |
| `apps/driver/src/app/core/branding/brand-theme.spec.ts`                                   | The brand mapped onto the colour tokens; the tint; the page's title                                                                                                                                                                                                              |
| `apps/portal/src/app/features/settings/branding-form.spec.ts`, `logo-file.reader.spec.ts` | The form loads and sends every field, refuses what the API would, previews while typing; a file encoded the way the API wants it, others refused                                                                                                                                 |

## Not in this module

| What                                                                                  | Where                                                                         |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Custom domains for the driver's page (`charge.acme.com`), a branded portal login page | M2, the "Custom" level: Caddy on demand and a Keycloak theme per tenant       |
| Branded apps in the stores, app icons and listings                                    | M2, the "Own app" level; the mobile module                                    |
| Fonts, layouts, custom CSS, a dark theme per tenant                                   | M2's "Custom" level; M1 maps two colours onto Material's tokens               |
| Receipts by e-mail, the notifications module's other e-mails                          | Notifications module: they go through `BrandedMailLayout` like the invitation |
| The logo in object storage, several sizes, a favicon per tenant                       | When logos grow beyond one small image: the row keeps the bytes for now       |
| The platform admin setting a tenant's brand on its behalf, or locking it to a plan    | The admin module; the "Branded" level is on for every plan in M1              |

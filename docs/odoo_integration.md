# Odoo Integration (Self‑Hosted)

This guide helps you run a local Odoo 16 that installs the included addon and imports read‑only inventory aggregates from this app via token.

## What’s implemented in the app
- Generate API token: `POST /api/inventories/:id/api-token` returns `{ ok, token, url }` where `url` is the full aggregate endpoint.
- Aggregate endpoint: `GET /api/public/inventory-aggregate?token=...` returns a payload with both:
  - Minimal shape (inventoryId, title, itemsCount, generatedAt, fields[])
  - Odoo‑friendly keys: `inventory` and `aggregates` → numbers + popularText

## Run Odoo locally (Docker Compose)
Prereqs: Docker + Docker Compose installed.

- From repo root:
  - `cd odoo`
  - `docker compose up -d`
  - Open http://localhost:8069 and complete the initial DB setup (database: `odoo`, master password: `admin`).

Notes
- The addon path is mounted at `/mnt/extra-addons` from `odoo/odoo_addons`.
- Config at `odoo/odoo.conf` points Odoo to the Postgres service.

## Install the addon in Odoo
- In Odoo, go to Apps → Update Apps List.
- Search for “Inventory Viewer (External Import)” and install it.
- Menu: External Inventories → Import Inventory (wizard) [or use the provided model method if exposed].

## Generate an aggregate URL
- In your app UI (Inventory settings), click “Generate / Regenerate Token”.
- The full URL is copied to clipboard and also returned by API: `${PUBLIC_BASE}/api/public/inventory-aggregate?token=...`.

## Import in Odoo
- Paste the aggregate URL (including token) into the Import wizard and run.
- The addon stores:
  - Title and description
  - Aggregate numbers (num1/num2/num3), and popular text
  - Raw `fields` metadata and raw payload for reference

## Quick API tests
- Generate token:
  ```bash
  curl -s -X POST -H "Authorization: Bearer <JWT>" \
    ${BACKEND_URL}/api/inventories/<INV_ID>/api-token
  ```
- Fetch aggregates:
  ```bash
  curl -s "${BACKEND_URL}/api/public/inventory-aggregate?token=<SECRET>" | jq .
  ```

## Acceptance checklist
- App endpoint returns token + full URL.
- Aggregate endpoint returns 200 with JSON and 401 on invalid token.
- Odoo addon installed; import succeeds and shows a record with numbers and popular text.
- Demo: Generate token in app → copy URL → Import in Odoo → see record.

## Troubleshooting
- If Odoo doesn’t see the addon, click “Update Apps List” and ensure developer mode is on.
- If aggregate returns 401, regenerate the token or ensure you are using the full URL with `token`.
- If you changed DB schema, run `prisma migrate` for the backend and restart Odoo containers if needed.


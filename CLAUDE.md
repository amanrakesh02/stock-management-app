# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

"Restock" is a mobile-first inventory/restock tracker PWA. React 19 + TypeScript, built with Vite, styled with Tailwind CSS v4, backed directly by Supabase (Postgres + JS client) with no custom backend server.

## Commands

- `npm run dev` — start the Vite dev server (PWA `devOptions.enabled` is on, so the service worker is active in dev too — see `dev-dist/`)
- `npm run build` — type-check via `tsc -b` then `vite build`
- `npm run lint` — ESLint over the whole repo (flat config in `eslint.config.js`)
- `npm run preview` — serve the production build locally

There is no test suite configured in this repo currently.

## Environment

Requires a `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see `src/lib/supabaseClient.ts`, which throws at import time if either is missing).

## Architecture

- **Data access is direct-to-Supabase from components.** There is no API layer/service module — pages import `supabase` from `src/lib/supabaseClient.ts` and call `.from(...)` queries inline. Follow this pattern for new pages rather than introducing a fetch/API abstraction.
- **Database schema lives only in Supabase**, not in this repo (no migrations/SQL checked in). The anon key can't read the OpenAPI schema endpoint; the tables/columns below were confirmed by probing the REST API:
  - `suppliers`: `id`, `name`, `contact`, `created_at`
  - `products`: `id`, `name`, `barcode`, `custom_code`, `supplier_id` → suppliers, `reorder_quantity`, `status` (`'active'` / `'discontinued'`), `created_at`. Barcode/custom code appear to be unique (errors surface as Postgres `23505`).
  - `deliveries`: `id`, `supplier_id` → suppliers, `delivered_at` (date), `reference`, `created_at`
  - `batches`: `id`, `product_id` → products, `delivery_id` → deliveries, `quantity`, `expiry_date`, `received_at`, `created_at`
  - `product_stock` (view): `product_id`, `total_stock` — per-product sum of batch quantities
  - `product_details` (view): all `products` columns plus `supplier_name` and `total_stock`
  - FK relationships are exposed, so PostgREST embedding works (e.g. `batches.select('*, deliveries(delivered_at, suppliers(name))')`, `suppliers.select('*, products(count)')`).
- **Stock model**: there is no stock-movements table. `batches.quantity` is the quantity *remaining* in that batch — deliveries insert batches, and removing stock / writing off decrements `quantity` (FIFO by `expiry_date`, then `created_at`, in `ProductDetailPage`). Queries for on-hand stock filter `quantity > 0`.
- **Shared code**:
  - `src/lib/ui.ts` — Tailwind class constants (`inputClass`, `primaryButtonClass`, `cardClass`, …). Use these rather than redefining per page.
  - `src/lib/types.ts` — `Supplier`, `Product` (a `product_details` row), `Batch`.
  - `src/lib/format.ts` — `pgQuote`/`productSearchFilter`/`productCodeFilter` (always quote user input inside `.or(...)` filters), `stockStatus` (out / low = below reorder quantity / ok), date + expiry helpers (local-time `isoDate`, `daysUntil`, …).
  - `src/lib/restockList.ts` — the restock list is per-device state in localStorage (not in Supabase), exposed via `useRestockList()` + `upsertRestockItem`/`removeRestockItem`.
  - `src/components/ProductSearch.tsx` — search-or-scan picker over active products; `inlineCamera` shows the camera inline (Restock tab) instead of a modal.
  - `src/components/Modal.tsx` — overlay dialog used for scanners and edit forms.
- **Routing**: `react-router-dom` v7, routes declared in `src/App.tsx`, pages wrapped in a single `Layout` (`src/components/Layout.tsx`) that provides the header/nav shell. Routes: `/` (`ProductsPage`), `/products/:id` (`ProductDetailPage`), `/scan` (`ScanPage`, labelled "Restock"), `/delivery` (`DeliveryPage`), `/expiry` (`ExpiryPage`), `/suppliers` (`SuppliersPage`).
- **Barcode scanning**: `src/components/BarcodeScanner.tsx` wraps `html5-qrcode`'s `Html5Qrcode`, started in a `useEffect` against a fixed-id DOM node (`elementId`), so only one scanner can be mounted at a time. It's a controlled-lifecycle component — starting/stopping the camera stream is guarded with `isRunningRef`/`cancelled` flags to avoid stopping before `start()` resolves or double-stopping on unmount. `onScan` fires once per mount; unmount (or remount via `key`) to scan again. Reuse this component (or `ProductSearch`) rather than talking to `html5-qrcode` directly elsewhere.
- **PWA**: configured via `vite-plugin-pwa` in `vite.config.ts` (manifest name "Restock", icons in `public/`). `dev-dist/` is generated dev-mode service worker output — expect it to change on every `npm run dev` run; ESLint ignores it.
- **Styling**: Tailwind v4 via `@tailwindcss/vite` plugin (no separate `tailwind.config.js`/PostCSS config — v4's Vite plugin handles it), classes used inline, no component library.

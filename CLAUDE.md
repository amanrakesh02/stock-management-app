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

- **Data access is direct-to-Supabase from components.** There is no API layer/service module — pages import `supabase` from `src/lib/supabaseClient.ts` and call `.from(...)` queries inline (see `src/pages/ProductsPage.tsx`, `src/pages/ScanPage.tsx`). Follow this pattern for new pages rather than introducing a fetch/API abstraction.
- **Database schema lives only in Supabase**, not in this repo (no migrations/SQL checked in). Known tables/views referenced from code:
  - `products` (writable table): `id`, `name`, `barcode`, `custom_code`, `reorder_quantity`, `supplier_id`, `status` (`'active'` / `'discontinued'`)
  - `product_details` (read view, likely joins supplier + stock): adds `supplier_name`, `total_stock` on top of the product fields
  - Barcode lookup matches on either `barcode` or `custom_code` via `.or(...)`.
- **Routing**: `react-router-dom` v7, routes declared in `src/App.tsx`, pages wrapped in a single `Layout` (`src/components/Layout.tsx`) that provides the header/nav shell. Current routes: `/` (`ProductsPage`) and `/scan` (`ScanPage`).
- **Barcode scanning**: `src/components/BarcodeScanner.tsx` wraps `html5-qrcode`'s `Html5Qrcode`, started in a `useEffect` against a fixed-id DOM node (`elementId`). It's a controlled-lifecycle component — starting/stopping the camera stream is guarded with `isRunningRef`/`cancelled` flags to avoid stopping before `start()` resolves or double-stopping on unmount. Reuse this component (via its `onScan`/`onError` props) rather than talking to `html5-qrcode` directly elsewhere.
- **PWA**: configured via `vite-plugin-pwa` in `vite.config.ts` (manifest name "Restock", icons in `public/`). `dev-dist/` is generated dev-mode service worker output — expect it to change on every `npm run dev` run.
- **Styling**: Tailwind v4 via `@tailwindcss/vite` plugin (no separate `tailwind.config.js`/PostCSS config — v4's Vite plugin handles it), classes used inline, no component library.

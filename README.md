# Restock

A mobile-first inventory and restock tracker PWA for a small shop. Scan barcodes, record deliveries, track stock by batch and expiry date, and build a restock list to send to suppliers.

Built with React 19, TypeScript, Vite, Tailwind CSS v4 and Supabase (Postgres, accessed directly from the browser).

## Features

- **Products**: search and filter by Active / Low / Out / Discontinued; add products with a barcode (scan it with the camera), custom code, supplier and reorder quantity.
- **Product detail**: edit details, see the batches on hand with expiry dates, remove units sold or used (soonest-expiring batches first), write off a batch, and discontinue or reactivate the product.
- **Restock list**: scan or search to add products, or add every low or out-of-stock product in one tap. The list is saved on the device and shared grouped by supplier.
- **Delivery**: record a delivery from a supplier with a reference number and line items (quantity and optional expiry). Recent deliveries are shown below the form.
- **Expiry**: batches that have expired or expire within 7, 30 or 90 days, with one-tap write-off.
- **Suppliers**: add, edit and delete suppliers; phone numbers and email addresses are tappable.

"Low stock" means on hand is below the product's reorder quantity.

## Setup

```bash
npm install
```

Create a `.env` file:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

The database schema lives in Supabase. See `CLAUDE.md` for the tables and views the app expects.

## Scripts

- `npm run dev`: dev server (the service worker is enabled in dev too)
- `npm run build`: type-check and production build
- `npm run lint`: ESLint
- `npm run preview`: serve the production build

The camera needs a secure context, so use `localhost` or HTTPS when testing scanning on a phone.

A GitHub Actions workflow (`.github/workflows/keep_alive.yml`) pings Supabase every 4 days so the free-tier project doesn't pause. It needs `SUPABASE_URL` and `SUPABASE_KEY` repository secrets.

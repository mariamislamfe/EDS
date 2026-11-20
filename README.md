# EDS — Al Esraa Dental Store

Bilingual (Arabic RTL / English) dental-supplies store with two shopping journeys — **Students** (organized by academic year, with kits) and **Dentists** (by specialty and category) — on **one product catalog**, plus a full admin dashboard.

Stack: Next.js 16 (App Router, server components) · TypeScript · Tailwind CSS 4 · Motion · Neon (Postgres, Neon Auth, Object Storage).

---

## 1. Setup on Neon (about 15 minutes)

1. **Neon project** — in console.neon.tech create a project in **AWS Frankfurt (eu-central-1)** (closest to Egypt, and supports Object Storage).
2. **Database URLs** — Project → **Connect**: copy the *pooled* string into `DATABASE_URL` and the *direct* one into `DATABASE_URL_UNPOOLED` in `.env.local` (already created; `.env.example` documents every variable).
3. **Neon Auth** — Project → **Auth** → *Enable Auth*, copy the **Auth URL** into `NEON_AUTH_BASE_URL`. `NEON_AUTH_COOKIE_SECRET` is pre-generated. For password-reset emails, configure an email provider in Auth settings.
4. **Create tables & import products**
   ```bash
   npm install
   npm run db:migrate
   npm run import:products -- data/products.csv            # add --mirror-images once storage is set up
   ```
5. **Make yourself admin** — `npm run dev`, create an account at `/register`, sign in once, then:
   ```bash
   npm run make-admin -- you@example.com
   ```
6. **Image uploads (optional, recommended)** — Project → **Object storage** → create bucket `media` with access **public_read**, create a credential (storage:read + storage:write), and fill the `AWS_*` variables. Then re-run the import with `--update --mirror-images` so product photos no longer depend on the old store's CDN.

Deploy on Vercel: add the same variables (`DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `AWS_*`, `NEON_STORAGE_BUCKET`, `NEXT_PUBLIC_SITE_URL`).

## 2. How product placement works

Every product has assignments; the storefront is built from them — nothing is duplicated:

| Assignment | Effect |
|---|---|
| **Audience**: Students / Dentists / Both / *Not decided* | Students pages show Students + Both; Dentists pages show Dentists + Both. *Not decided* products appear only in Shop all / search / category pages. |
| **Academic years** (★ = recommended essential) | Year page `/students/<year>` (audience must include students) |
| **Specialties** | `/dentists/<specialty>` (audience must include dentists) |
| **Categories** (first = main) | `/categories/<slug>`, filters, breadcrumbs |
| Flags: Featured / Best seller / New arrival | Homepage hero tray, rails on landing pages |

The product editor shows a live **"Where this product appears"** panel with warnings for conflicting assignments. **Admin → Products** has filters (incl. *Needs review*) and bulk actions (set audience, add/remove year, add category/specialty, flags, publish).

## 3. Import results (from the provided CSV)

283 products, 302 options. Full details in `reports/import-report.md`.
- 98 products were assigned to academic years **because their collection name says so** (e.g. "Collection 2nd Year", "Fixed IV Package - Delta University" → 4th year). The other 185 are left *Not decided* for review.
- Categories and specialties were mapped from collection names (table in the report). Brands were set only where the brand name appears in the title.
- 20 products have no images, 228 have no description, 1 has a SKU. 7 descriptions that were staff price notes were moved to the internal *admin notes* field.
- "Package Level 1" is a product in the CSV; recreate it as a **bundle** under Admin → Bundles.

## 4. Payments

Checkout supports the methods enabled in **Store settings → Payment methods**: cash on delivery (on by default), InstaPay and mobile-wallet transfers (off until you add your transfer instructions). These are manual: the customer pays, you mark the order *paid*.

**Online card payments are not implemented** — that needs a provider account (e.g. Paymob, Fawry, Kashier). To add one: create a `payment_methods` entry, create the provider's payment intent in a server action after `place_order`, and confirm it in a webhook route (`src/app/api/payments/<provider>/route.ts`) that sets `payment_status = 'paid'` with the service role. Never trust a client-side "success" redirect.

## 5. Architecture

```
db/migrations/           schema · pricing/order functions · seed · browse/search
scripts/                 migrate · import-products (+ lib/transform) · make-admin · verify-sql
src/app/(store)/         storefront (own root layout, ar/en, RTL)
src/app/admin/           dashboard (own root layout, English, staff only)
src/lib/catalog.ts       cached public reads (tag "catalog", revalidated on every admin save)
src/lib/admin/           auth guard, server actions, entity config
```

- **Prices are never trusted from the browser.** `quote_cart()` and `place_order()` (Postgres) recompute prices, campaigns, coupons, shipping and stock; orders reserve stock atomically and reject oversells.
- **Security**: only the Next.js server connects to the database (no client-side DB access). Customers see only their own orders (checked by user id); guests view confirmations with a secret token; every admin page and action checks the staff/admin role server-side; roles live in `profiles`, keyed by the Neon Auth user id.
- **Performance**: server components, one RPC per listing page (`browse_products`: filters + sort + pagination + facets), trigram search index, cached catalog reads, `next/image` (AVIF/WebP, responsive sizes), CSS-driven reveals, ~115 kB first-load JS on storefront pages, the proxy only runs on /account and /admin.
- **Old URLs**: `/ar/product/all/<handle>` from the previous store 301-redirects to the new product page.

## 6. Scripts

| Command | |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run db:migrate` | apply SQL migrations (tracked, re-runnable) |
| `npm run db:verify` | run all migrations + an order-flow test in an in-memory Postgres |
| `npm run import:products -- <csv> [--dry-run] [--update] [--mirror-images]` | import catalog |
| `npm run make-admin -- <email> [admin\|staff\|customer]` | set a role |

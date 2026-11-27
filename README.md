# EDS — Al Esraa Dental Store

Bilingual (Arabic RTL / English) dental-supplies store with two shopping journeys — **Students** (organized by academic year, with kits) and **Dentists** (by specialty and category) — on **one product catalog**, plus a full admin dashboard.

Stack: Next.js 16 (App Router, server components) · TypeScript · Tailwind CSS 4 · Motion · Neon (Postgres, Object Storage).

**Customer accounts** (mobile number + password): at checkout a guest can tick “Create an account” and choose a password; signed-in customers see every order and its status at `/account`. Guests can still order without an account and look an order up at `/track` with the order number + mobile. Forgotten passwords are reset by the store (no SMS provider is connected).

---

## 1. Setup on Neon (about 15 minutes)

1. **Neon project** — in console.neon.tech create a project in **AWS Frankfurt (eu-central-1)** (closest to Egypt, and supports Object Storage).
2. **Database URLs** — Project → **Connect**: copy the *pooled* string into `DATABASE_URL` and the *direct* one into `DATABASE_URL_UNPOOLED` in `.env.local` (already created; `.env.example` documents every variable).
3. **Create tables & import products**
   ```bash
   npm install
   npm run db:migrate
   npm run import:products -- data/products.csv            # add --mirror-images once storage is set up
   ```
4. **Dashboard** — `npm run dev`, open `/admin` and enter the password **123456**. Change it right away in **Store settings → Dashboard password** (changing it signs out every other device). Forgot it? `npm run reset-admin-password` sets it back to 123456.
5. **Image uploads (optional, recommended)** — Project → **Object storage** → create bucket `media` with access **public_read**, create a credential (storage:read + storage:write), and fill the `AWS_*` variables. Then re-run the import with `--update --mirror-images` so product photos no longer depend on the old store's CDN.

Deploy on Vercel: add the same variables (`DATABASE_URL`, `AWS_*`, `NEON_STORAGE_BUCKET`, `NEXT_PUBLIC_SITE_URL`).

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

## 4. What's managed from the dashboard (v2)

| Where | What |
|---|---|
| Website content → Banners → “Homepage hero slideshow” | Photos that cross-fade behind the hero headline (text stays the same) |
| Website content → Hero | Headline, text, and the photos on the Students / Dentists “doors” |
| Website content → Customer feedback | Feedback photos/screenshots, shown in identical 4:5 frames under the brands strip |
| Website content → Store branches | Pins on the homepage map (lat/lng + Google Maps link) — seeded with Damietta and Kafr El Sheikh at approximate positions: **set the exact coordinates** |
| Website content → Homepage sections | Turn each homepage section on/off |
| Academic years → a year → Subjects | Split a year into subjects; then tick subjects in each product's editor |
| Bundles → Type “Clinic setup package”, For students/dentists | Packages shown on `/clinic-setup` and in the Students/Dentists clinic sections |
| Products → Related products | Shown on both products as “Use it together” |

**Kit assistant** (“Check my list” button): a student pastes or photographs their university list; Claude (`claude-opus-5-5`) searches the live catalogue and lists what's in stock, the variants and the differences between options. Needs `ANTHROPIC_API_KEY` (see `.env.example`); limited to 15 requests per 10 minutes per visitor.

## 5. Payments

Checkout supports the methods enabled in **Store settings → Payment methods**: cash on delivery (on by default), InstaPay and mobile-wallet transfers (off until you add your transfer instructions). These are manual: the customer pays, you mark the order *paid*.

**Online card payments are not implemented** — that needs a provider account (e.g. Paymob, Fawry, Kashier). To add one: create a `payment_methods` entry, create the provider's payment intent in a server action after `place_order`, and confirm it in a webhook route (`src/app/api/payments/<provider>/route.ts`) that sets `payment_status = 'paid'` with the service role. Never trust a client-side "success" redirect.

## 6. Architecture

```
db/migrations/           schema · pricing/order functions · seed · browse/search
scripts/                 migrate · import-products (+ lib/transform) · reset-admin-password · verify-sql
src/app/(store)/         storefront (own root layout, ar/en, RTL)
src/app/admin/           dashboard (own root layout, English; /admin/login + password-protected (panel) group)
src/lib/catalog.ts       cached public reads (tag "catalog", revalidated on every admin save)
src/lib/admin/           dashboard password/session, server actions, entity config
```

- **Prices are never trusted from the browser.** `quote_cart()` and `place_order()` (Postgres) recompute prices, campaigns, coupons, shipping and stock; orders reserve stock atomically and reject oversells.
- **Security**: only the Next.js server connects to the database (no client-side DB access). Customers view their order with a secret token link (or order number + phone at `/track`). The dashboard uses one password (scrypt-hashed in `settings` key `private_admin_auth`, never read by the storefront) and a signed httpOnly cookie; every admin page and action checks it server-side; wrong attempts are rate-limited.
- **Performance**: server components, one RPC per listing page (`browse_products`: filters + sort + pagination + facets), trigram search index, cached catalog reads, `next/image` (AVIF/WebP, responsive sizes), CSS-driven reveals, ~115 kB first-load JS on storefront pages.
- **Old URLs**: `/ar/product/all/<handle>` from the previous store 301-redirects to the new product page.

## 7. Scripts

| Command | |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run db:migrate` | apply SQL migrations (tracked, re-runnable) |
| `npm run db:verify` | run all migrations + an order-flow test in an in-memory Postgres |
| `npm run import:products -- <csv> [--dry-run] [--update] [--mirror-images]` | import catalog |
| `npm run reset-admin-password` | reset the dashboard password to 123456 |

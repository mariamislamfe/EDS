-- =====================================================================
-- EDS — Al Esraa Dental Store : core schema
-- One unified catalog. Storefront visibility is driven entirely by a
-- product's assignments (audience, academic years, specialties, categories).
-- =====================================================================

create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- ---------- enums ----------
create type public.user_role      as enum ('customer', 'staff', 'admin');
create type public.audience       as enum ('unassigned', 'student', 'dentist', 'both');
create type public.order_status   as enum ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
create type public.payment_status as enum ('unpaid', 'pending_verification', 'paid', 'refunded');
create type public.bundle_pricing as enum ('fixed', 'sum_of_items');
create type public.discount_type  as enum ('percent', 'fixed');
create type public.campaign_scope as enum ('all', 'category', 'brand', 'specialty', 'year', 'audience', 'products');

-- ---------- helpers ----------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------- profiles ----------
-- One row per Neon Auth (Better Auth) user, created by the app on first sign-in.
-- Only the Next.js server connects to the database; authorization (customer /
-- staff / admin) is enforced there, in src/lib/auth and src/lib/admin.
create table public.profiles (
  id          text primary key,              -- Neon Auth user id
  email       text,
  full_name   text,
  phone       text,
  role        public.user_role not null default 'customer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index profiles_email_idx on public.profiles (lower(email));
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------- taxonomy ----------
create table public.brands (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  logo_url    text,
  is_featured boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table public.categories (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name_en         text not null,
  name_ar         text,
  description_en  text,
  description_ar  text,
  image_url       text,
  parent_id       uuid references public.categories(id) on delete set null,
  sort_order      int not null default 0,
  is_visible      boolean not null default true,
  show_on_home    boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger categories_touch before update on public.categories
  for each row execute function public.touch_updated_at();

create table public.specialties (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name_en         text not null,
  name_ar         text,
  description_en  text,
  description_ar  text,
  image_url       text,
  sort_order      int not null default 0,
  is_visible      boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger specialties_touch before update on public.specialties
  for each row execute function public.touch_updated_at();

create table public.academic_years (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,          -- e.g. first-year
  number          int not null,                  -- 1..n, used for ordering & display
  name_en         text not null,
  name_ar         text,
  tagline_en      text,
  tagline_ar      text,
  intro_en        text,
  intro_ar        text,
  hero_image_url  text,
  is_enabled      boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger years_touch before update on public.academic_years
  for each row execute function public.touch_updated_at();

-- ---------- products ----------
create table public.products (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,
  legacy_handle       text unique,                 -- handle from the previous store, for redirects
  sku                 text,
  name_en             text,
  name_ar             text,
  description_en      text,                        -- sanitized HTML
  description_ar      text,
  short_description_en text,
  short_description_ar text,
  admin_notes         text,                        -- internal only, never shown on storefront
  brand_id            uuid references public.brands(id) on delete set null,
  primary_category_id uuid references public.categories(id) on delete set null,
  product_type        text,                        -- free-form (instrument, material, device…)
  price               numeric(12,2) not null check (price >= 0),
  compare_at_price    numeric(12,2) check (compare_at_price is null or compare_at_price >= 0),
  cost_price          numeric(12,2),
  track_inventory     boolean not null default false,
  stock_qty           int not null default 0,
  low_stock_threshold int not null default 3,
  allow_backorder     boolean not null default false,
  audience            public.audience not null default 'unassigned',
  is_published        boolean not null default false,
  is_featured         boolean not null default false,
  is_best_seller      boolean not null default false,
  is_new_arrival      boolean not null default false,
  bundle_eligible     boolean not null default true,
  specifications      jsonb not null default '[]'::jsonb,  -- [{label_en,label_ar,value}]
  option_names        jsonb not null default '[]'::jsonb,  -- ["Size","Color"]
  source_collections  text[] not null default '{}',        -- raw collection names from import
  sales_count         int not null default 0,
  is_low_stock        boolean generated always as (track_inventory and stock_qty <= low_stock_threshold) stored,
  search_text         text generated always as (
                        lower(coalesce(name_en,'') || ' ' || coalesce(name_ar,'') || ' ' || coalesce(sku,''))
                      ) stored,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint products_has_name check (coalesce(name_en, name_ar) is not null)
);
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

create index products_published_idx  on public.products (is_published, audience);
create index products_brand_idx      on public.products (brand_id);
create index products_pcat_idx       on public.products (primary_category_id);
create index products_created_idx    on public.products (created_at desc);
create index products_sales_idx      on public.products (sales_count desc);
create index products_price_idx      on public.products (price);
create index products_flags_idx      on public.products (is_featured, is_best_seller, is_new_arrival) where is_published;
create index products_search_trgm    on public.products using gin (search_text gin_trgm_ops);

create table public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  url         text not null,
  alt         text,
  sort_order  int not null default 0
);
create index product_images_product_idx on public.product_images (product_id, sort_order);

create table public.product_variants (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references public.products(id) on delete cascade,
  sku              text,
  options          jsonb not null default '{}'::jsonb,   -- {"Size":"#25","Taper":"4%"}
  price            numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2),
  cost_price       numeric(12,2),
  stock_qty        int,                 -- null = stock not tracked for this variant
  image_url        text,
  is_active        boolean not null default true,
  sort_order       int not null default 0
);
create index product_variants_product_idx on public.product_variants (product_id, sort_order);

create table public.product_categories (
  product_id  uuid references public.products(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  primary key (product_id, category_id)
);
create index product_categories_cat_idx on public.product_categories (category_id);

create table public.product_years (
  product_id  uuid references public.products(id) on delete cascade,
  year_id     uuid references public.academic_years(id) on delete cascade,
  is_essential boolean not null default false,       -- shown in "recommended essentials"
  primary key (product_id, year_id)
);
create index product_years_year_idx on public.product_years (year_id);

create table public.product_specialties (
  product_id   uuid references public.products(id) on delete cascade,
  specialty_id uuid references public.specialties(id) on delete cascade,
  primary key (product_id, specialty_id)
);
create index product_specialties_spec_idx on public.product_specialties (specialty_id);

create table public.related_products (
  product_id  uuid references public.products(id) on delete cascade,
  related_id  uuid references public.products(id) on delete cascade,
  sort_order  int not null default 0,
  primary key (product_id, related_id),
  check (product_id <> related_id)
);

-- ---------- bundles ----------
create table public.bundles (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  name_en          text not null,
  name_ar          text,
  description_en   text,
  description_ar   text,
  year_id          uuid references public.academic_years(id) on delete set null,
  image_url        text,
  gallery          text[] not null default '{}',
  pricing_mode     public.bundle_pricing not null default 'fixed',
  price            numeric(12,2),                     -- used when pricing_mode = fixed
  compare_at_price numeric(12,2),
  discount_percent numeric(5,2) not null default 0,  -- used when pricing_mode = sum_of_items
  is_published     boolean not null default false,
  is_featured      boolean not null default false,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (pricing_mode <> 'fixed' or price is not null)
);
create trigger bundles_touch before update on public.bundles
  for each row execute function public.touch_updated_at();
create index bundles_year_idx on public.bundles (year_id) where is_published;

create table public.bundle_items (
  id          uuid primary key default gen_random_uuid(),
  bundle_id   uuid not null references public.bundles(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete restrict,
  variant_id  uuid references public.product_variants(id) on delete set null,
  quantity    int not null default 1 check (quantity > 0),
  sort_order  int not null default 0
);
create index bundle_items_bundle_idx on public.bundle_items (bundle_id, sort_order);

-- optional "required tools" checklist per year
create table public.year_checklist_items (
  id          uuid primary key default gen_random_uuid(),
  year_id     uuid not null references public.academic_years(id) on delete cascade,
  label_en    text not null,
  label_ar    text,
  product_id  uuid references public.products(id) on delete set null,
  sort_order  int not null default 0
);
create index year_checklist_year_idx on public.year_checklist_items (year_id, sort_order);

-- ---------- promotions ----------
create table public.campaigns (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  discount_type  public.discount_type not null default 'percent',
  value          numeric(12,2) not null check (value > 0),
  scope          public.campaign_scope not null default 'all',
  scope_ids      uuid[] not null default '{}',
  scope_audience public.audience,
  starts_at      timestamptz,
  ends_at        timestamptz,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

create table public.coupons (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  discount_type public.discount_type not null default 'percent',
  value         numeric(12,2) not null check (value > 0),
  min_subtotal  numeric(12,2) not null default 0,
  max_uses      int,
  used_count    int not null default 0,
  starts_at     timestamptz,
  ends_at       timestamptz,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ---------- content ----------
create table public.banners (
  id           uuid primary key default gen_random_uuid(),
  placement    text not null,  -- home_promo | students_hero | dentists_hero | announcement
  title_en     text,
  title_ar     text,
  subtitle_en  text,
  subtitle_ar  text,
  cta_label_en text,
  cta_label_ar text,
  cta_href     text,
  image_url    text,
  is_active    boolean not null default true,
  sort_order   int not null default 0,
  starts_at    timestamptz,
  ends_at      timestamptz,
  created_at   timestamptz not null default now()
);

create table public.testimonials (
  id          uuid primary key default gen_random_uuid(),
  author      text not null,
  role_en     text,
  role_ar     text,
  quote       text not null,
  is_visible  boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table public.settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------- shipping ----------
create table public.governorates (
  id           uuid primary key default gen_random_uuid(),
  name_en      text not null,
  name_ar      text not null,
  shipping_fee numeric(12,2),            -- null = not configured (shipping shown as "confirmed by phone")
  is_active    boolean not null default true,
  sort_order   int not null default 0
);

-- ---------- orders ----------
create sequence public.order_number_seq start 10001;

create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text not null unique default ('EDS-' || nextval('public.order_number_seq')),
  access_token     uuid not null default gen_random_uuid(),   -- lets guests view their confirmation
  user_id          text references public.profiles(id) on delete set null,
  status           public.order_status not null default 'pending',
  payment_method   text not null,
  payment_status   public.payment_status not null default 'unpaid',
  customer_name    text not null,
  phone            text not null,
  email            text,
  governorate_id   uuid references public.governorates(id),
  governorate_name text not null,
  city             text not null,
  address          text not null,
  notes            text,
  coupon_code      text,
  subtotal         numeric(12,2) not null,
  discount_total   numeric(12,2) not null default 0,
  shipping_total   numeric(12,2) not null default 0,
  shipping_pending boolean not null default false,
  total            numeric(12,2) not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();
create index orders_user_idx    on public.orders (user_id, created_at desc);
create index orders_status_idx  on public.orders (status, created_at desc);
create index orders_created_idx on public.orders (created_at desc);

create table public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  uuid references public.products(id) on delete set null,
  variant_id  uuid references public.product_variants(id) on delete set null,
  bundle_id   uuid references public.bundles(id) on delete set null,
  name        text not null,
  variant_label text,
  sku         text,
  image_url   text,
  unit_price  numeric(12,2) not null,
  quantity    int not null check (quantity > 0),
  line_total  numeric(12,2) not null
);
create index order_items_order_idx on public.order_items (order_id);

create table public.order_status_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  status      public.order_status not null,
  note        text,
  created_by  text references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index order_history_order_idx on public.order_status_history (order_id, created_at);

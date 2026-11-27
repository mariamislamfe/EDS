-- =====================================================================
-- v2: customer accounts, subjects inside academic years, clinic-setup
-- bundles, store locations (map), image feedback, browse by subject.
-- =====================================================================

-- ---------- customer accounts (phone + password) ----------
create table public.customers (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  phone          text not null,
  phone_key      text not null unique,          -- last 10 digits, used to sign in
  email          text,
  password_hash  text not null,
  session_version int not null default 1,      -- bump to sign out every device
  governorate_id uuid references public.governorates(id) on delete set null,
  city           text,
  address        text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger customers_touch before update on public.customers
  for each row execute function public.touch_updated_at();

alter table public.orders add column customer_id uuid references public.customers(id) on delete set null;
create index orders_customer_idx on public.orders (customer_id, created_at desc);

-- ---------- subjects inside each academic year ----------
create table public.year_subjects (
  id             uuid primary key default gen_random_uuid(),
  year_id        uuid not null references public.academic_years(id) on delete cascade,
  slug           text not null,
  name_en        text not null,
  name_ar        text,
  description_en text,
  description_ar text,
  image_url      text,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now(),
  unique (year_id, slug)
);
create index year_subjects_year_idx on public.year_subjects (year_id, sort_order);

create table public.product_subjects (
  product_id uuid references public.products(id) on delete cascade,
  subject_id uuid references public.year_subjects(id) on delete cascade,
  primary key (product_id, subject_id)
);
create index product_subjects_subject_idx on public.product_subjects (subject_id);

-- ---------- bundles: student kits vs clinic setups ----------
alter table public.bundles add column kind text not null default 'kit' check (kind in ('kit', 'clinic_setup'));
alter table public.bundles add column audience public.audience not null default 'student';

drop view if exists public.catalog_bundles;
create view public.catalog_bundles with (security_invoker = true) as
select b.*, public.bundle_price(b.id) as effective_price,
       public.bundle_items_value(b.id) as items_value,
       public.bundle_in_stock(b.id) as in_stock,
       (select count(*) from public.bundle_items i where i.bundle_id = b.id) as item_count,
       y.slug as year_slug, y.name_en as year_name_en, y.name_ar as year_name_ar, y.number as year_number
from public.bundles b
left join public.academic_years y on y.id = b.year_id;

-- ---------- store branches on the map ----------
create table public.store_locations (
  id          uuid primary key default gen_random_uuid(),
  name_en     text not null,
  name_ar     text,
  address_en  text,
  address_ar  text,
  phone       text,
  hours_en    text,
  hours_ar    text,
  lat         numeric(9,6) not null,
  lng         numeric(9,6) not null,
  maps_url    text,                         -- Google Maps link; built from lat/lng when empty
  image_url   text,
  sort_order  int not null default 0,
  is_visible  boolean not null default true,
  created_at  timestamptz not null default now()
);
insert into public.store_locations (name_en, name_ar, address_en, address_ar, lat, lng, sort_order) values
  ('EDS Damietta', 'EDS دمياط', 'Damietta', 'دمياط', 31.416500, 31.813300, 1),
  ('EDS Kafr El Sheikh', 'EDS كفر الشيخ', 'Kafr El Sheikh', 'كفر الشيخ', 31.110700, 30.938800, 2);

-- ---------- feedback: screenshots / photos ----------
alter table public.testimonials add column image_url text;
alter table public.testimonials alter column quote drop not null;
alter table public.testimonials alter column author drop not null;
create or replace function public.browse_products(p jsonb)
returns jsonb language plpgsql stable security invoker set search_path = public as $$
declare
  v_q        text    := nullif(lower(trim(p->>'q')), '');
  v_cat      text    := nullif(p->>'category', '');
  v_brands   text[]  := case when nullif(p->>'brand','') is null then null else string_to_array(p->>'brand', ',') end;
  v_year     text    := nullif(p->>'year', '');
  v_essential boolean := coalesce((p->>'essential')::boolean, false);
  v_spec     text    := nullif(p->>'specialty', '');
  v_subject  uuid    := nullif(p->>'subject', '')::uuid;
  v_aud      text    := nullif(p->>'audience', '');
  v_min      numeric := nullif(p->>'min_price', '')::numeric;
  v_max      numeric := nullif(p->>'max_price', '')::numeric;
  v_stock    boolean := coalesce((p->>'in_stock')::boolean, false);
  v_type     text    := nullif(p->>'type', '');
  v_flag     text    := nullif(p->>'flag', '');
  v_sort     text    := coalesce(nullif(p->>'sort', ''), 'featured');
  v_page     int     := greatest(coalesce((p->>'page')::int, 1), 1);
  v_per      int     := least(greatest(coalesce((p->>'per_page')::int, 24), 1), 96);
  v_ids      uuid[]  := case when p ? 'ids' then array(select jsonb_array_elements_text(p->'ids'))::uuid[] end;
  v_cat_ids  uuid[];
  v_result   jsonb;
begin
  if v_cat is not null then
    with recursive tree as (
      select id from public.categories where slug = v_cat
      union all
      select c.id from public.categories c join tree t on c.parent_id = t.id)
    select array_agg(id) into v_cat_ids from tree;
  end if;

  with base as (
    select c.* from public.catalog_products c
    where c.is_published
      and (v_ids is null or c.id = any(v_ids))
      and (v_q is null or c.search_text ilike '%' || v_q || '%' or c.search_text % v_q)
      and (v_cat is null or c.primary_category_id = any(v_cat_ids)
           or exists (select 1 from public.product_categories pc where pc.product_id = c.id and pc.category_id = any(v_cat_ids)))
      and (v_year is null or exists (select 1 from public.product_years py join public.academic_years y on y.id = py.year_id
                                     where py.product_id = c.id and y.slug = v_year and (not v_essential or py.is_essential)))
      and (v_spec is null or exists (select 1 from public.product_specialties ps join public.specialties s on s.id = ps.specialty_id
                                     where ps.product_id = c.id and s.slug = v_spec))
      and (v_subject is null or exists (select 1 from public.product_subjects ps2 where ps2.product_id = c.id and ps2.subject_id = v_subject))
      and (v_aud is null or c.audience::text = v_aud or c.audience = 'both')
      and (v_min is null or c.price >= v_min)
      and (v_max is null or c.price <= v_max)
      and (not v_stock or c.in_stock)
      and (v_type is null or c.product_type = v_type)
      and (v_flag is null
           or (v_flag = 'featured' and c.is_featured)
           or (v_flag = 'best' and (c.is_best_seller or c.sales_count > 0))
           or (v_flag = 'new' and c.is_new_arrival)
           or (v_flag = 'sale' and c.compare_at_price is not null))
  ),
  filtered as (
    select * from base where v_brands is null or brand_slug = any(v_brands)
  ),
  page as (
    select * from filtered
    order by
      case when v_sort = 'price_asc'  then price end asc nulls last,
      case when v_sort = 'price_desc' then price end desc nulls last,
      case when v_sort = 'newest'     then created_at end desc,
      case when v_sort = 'best'       then sales_count end desc,
      case when v_sort = 'featured'   then (is_featured::int * 4 + is_best_seller::int * 2 + (image_url is not null)::int) end desc,
      case when v_q is not null then similarity(search_text, v_q) end desc,
      created_at desc, id
    offset (v_page - 1) * v_per limit v_per
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(pg) - 'search_text') from page pg), '[]'::jsonb),
    'total', (select count(*) from filtered),
    'page', v_page, 'per_page', v_per,
    'facets', jsonb_build_object(
      'brands', coalesce((select jsonb_agg(jsonb_build_object('slug', brand_slug, 'name', brand_name, 'count', n) order by brand_name)
                          from (select brand_slug, brand_name, count(*) n from base where brand_slug is not null group by 1, 2) b), '[]'::jsonb),
      'price_min', (select floor(min(price)) from base),
      'price_max', (select ceil(max(price)) from base),
      'in_stock', (select count(*) from filtered where in_stock),
      'types', coalesce((select jsonb_agg(jsonb_build_object('value', product_type, 'count', n) order by product_type)
                         from (select product_type, count(*) n from base where product_type is not null group by 1) t), '[]'::jsonb)
    )
  ) into v_result;
  return v_result;
end $$;

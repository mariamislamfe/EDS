-- =====================================================================
-- browse_products: one round-trip for listing pages
-- (filters + sort + pagination + facet counts).
-- =====================================================================
create or replace function public.browse_products(p jsonb)
returns jsonb language plpgsql stable security invoker set search_path = public as $$
declare
  v_q        text    := nullif(lower(trim(p->>'q')), '');
  v_cat      text    := nullif(p->>'category', '');
  v_brands   text[]  := case when nullif(p->>'brand','') is null then null else string_to_array(p->>'brand', ',') end;
  v_year     text    := nullif(p->>'year', '');
  v_essential boolean := coalesce((p->>'essential')::boolean, false);
  v_spec     text    := nullif(p->>'specialty', '');
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


-- variants with campaign pricing applied (RLS of product_variants still applies)
create or replace view public.catalog_variants with (security_invoker = true) as
select v.id, v.product_id, v.sku, v.options, v.stock_qty, v.image_url, v.is_active, v.sort_order,
       v.price as base_price,
       public.campaign_price(v.product_id, v.price) as price,
       case when public.campaign_price(v.product_id, v.price) < v.price then greatest(coalesce(v.compare_at_price, v.price), v.price)
            when v.compare_at_price > v.price then v.compare_at_price end as compare_at_price
from public.product_variants v;

-- counts used on landing pages (published products per taxonomy node)
-- per-node product counts + up to 3 cover images (best-selling published products with images)
create or replace view public.taxonomy_counts with (security_invoker = true) as
select 'category' as kind, c.slug,
  (select count(distinct p.id) from public.product_categories pc join public.products p on p.id = pc.product_id and p.is_published
    where pc.category_id = c.id) as products,
  array(select pi.url from public.product_categories pc join public.products p on p.id = pc.product_id and p.is_published
        join lateral (select url from public.product_images i where i.product_id = p.id order by sort_order limit 1) pi on true
        where pc.category_id = c.id order by p.is_featured desc, p.sales_count desc, p.created_at desc limit 3) as covers
from public.categories c
union all
select 'specialty', s.slug,
  (select count(distinct p.id) from public.product_specialties ps join public.products p on p.id = ps.product_id and p.is_published
    and p.audience in ('dentist','both') where ps.specialty_id = s.id),
  array(select pi.url from public.product_specialties ps join public.products p on p.id = ps.product_id and p.is_published
        and p.audience in ('dentist','both')
        join lateral (select url from public.product_images i where i.product_id = p.id order by sort_order limit 1) pi on true
        where ps.specialty_id = s.id order by p.is_featured desc, p.sales_count desc, p.created_at desc limit 3)
from public.specialties s
union all
select 'year', y.slug,
  (select count(distinct p.id) from public.product_years py join public.products p on p.id = py.product_id and p.is_published
    and p.audience in ('student','both') where py.year_id = y.id),
  array(select pi.url from public.product_years py join public.products p on p.id = py.product_id and p.is_published
        and p.audience in ('student','both')
        join lateral (select url from public.product_images i where i.product_id = p.id order by sort_order limit 1) pi on true
        where py.year_id = y.id order by py.is_essential desc, p.sales_count desc, p.created_at desc limit 3)
from public.academic_years y;


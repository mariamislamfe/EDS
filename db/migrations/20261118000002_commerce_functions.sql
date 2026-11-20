-- =====================================================================
-- Pricing, catalog view, cart quoting and order placement.
-- All money math happens here so the browser can never set a price.
-- =====================================================================

-- Best price after any active campaign that targets the product.
create or replace function public.campaign_price(p_product uuid, p_price numeric)
returns numeric language sql stable security definer set search_path = public as $$
  with p as (select * from public.products where id = p_product),
  eligible as (
    select c.* from public.campaigns c, p
    where c.is_active
      and (c.starts_at is null or c.starts_at <= now())
      and (c.ends_at   is null or c.ends_at   >  now())
      and (
        c.scope = 'all'
        or (c.scope = 'products'  and p.id = any(c.scope_ids))
        or (c.scope = 'brand'     and p.brand_id = any(c.scope_ids))
        or (c.scope = 'category'  and (p.primary_category_id = any(c.scope_ids)
              or exists (select 1 from public.product_categories pc
                         where pc.product_id = p.id and pc.category_id = any(c.scope_ids))))
        or (c.scope = 'specialty' and exists (select 1 from public.product_specialties ps
                         where ps.product_id = p.id and ps.specialty_id = any(c.scope_ids)))
        or (c.scope = 'year'      and exists (select 1 from public.product_years py
                         where py.product_id = p.id and py.year_id = any(c.scope_ids)))
        or (c.scope = 'audience'  and (p.audience = c.scope_audience
              or (p.audience = 'both' and c.scope_audience in ('student','dentist'))))
      )
  )
  select round(least(
           p_price,
           coalesce(min(case when e.discount_type = 'percent'
                             then p_price * (1 - least(e.value, 100) / 100)
                             else greatest(p_price - e.value, 0) end), p_price)
         ), 2)
  from eligible e;
$$;

-- Storefront projection of products (callers filter is_published).
create or replace view public.catalog_products with (security_invoker = true) as
select
  p.id, p.slug, p.sku, p.name_en, p.name_ar,
  p.short_description_en, p.short_description_ar,
  p.brand_id, b.name as brand_name, b.slug as brand_slug,
  p.primary_category_id, p.product_type, p.audience,
  p.is_published, p.is_featured, p.is_best_seller, p.is_new_arrival, p.bundle_eligible,
  p.sales_count, p.created_at, p.updated_at, p.option_names,
  p.price as base_price,
  public.campaign_price(p.id, p.price) as price,
  case
    when public.campaign_price(p.id, p.price) < p.price then greatest(coalesce(p.compare_at_price, p.price), p.price)
    when p.compare_at_price > p.price then p.compare_at_price
    else null
  end as compare_at_price,
  (select pi.url from public.product_images pi where pi.product_id = p.id order by pi.sort_order limit 1) as image_url,
  (select pi.url from public.product_images pi where pi.product_id = p.id order by pi.sort_order offset 1 limit 1) as image_url_2,
  (
    p.allow_backorder
    or (exists (select 1 from public.product_variants v where v.product_id = p.id and v.is_active)
        and exists (select 1 from public.product_variants v where v.product_id = p.id and v.is_active
                    and (v.stock_qty is null or v.stock_qty > 0)))
    or (not exists (select 1 from public.product_variants v where v.product_id = p.id and v.is_active)
        and (not p.track_inventory or p.stock_qty > 0))
  ) as in_stock,
  exists (select 1 from public.product_variants v where v.product_id = p.id and v.is_active) as has_variants,
  p.search_text
from public.products p
left join public.brands b on b.id = p.brand_id;

-- Bundle price (fixed, or sum of included items minus a percentage).
create or replace function public.bundle_price(p_bundle uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select case
    when b.pricing_mode = 'fixed' then b.price
    else round(coalesce((
      select sum(i.quantity * public.campaign_price(i.product_id,
                   coalesce(v.price, pr.price)))
      from public.bundle_items i
      join public.products pr on pr.id = i.product_id
      left join public.product_variants v on v.id = i.variant_id
      where i.bundle_id = b.id), 0) * (1 - b.discount_percent / 100), 2)
  end
  from public.bundles b where b.id = p_bundle;
$$;

-- Value of a bundle's items at regular prices (shown as "worth").
create or replace function public.bundle_items_value(p_bundle uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select round(coalesce(sum(i.quantity * coalesce(v.price, pr.price)), 0), 2)
  from public.bundle_items i
  join public.products pr on pr.id = i.product_id
  left join public.product_variants v on v.id = i.variant_id
  where i.bundle_id = p_bundle;
$$;

create or replace function public.bundle_in_stock(p_bundle uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(bool_and(
    pr.is_published and (
      pr.allow_backorder
      or (i.variant_id is not null and (v.stock_qty is null or v.stock_qty >= i.quantity))
      or (i.variant_id is null and (not pr.track_inventory or pr.stock_qty >= i.quantity)))), false)
  from public.bundle_items i
  join public.products pr on pr.id = i.product_id
  left join public.product_variants v on v.id = i.variant_id
  where i.bundle_id = p_bundle;
$$;

create or replace view public.catalog_bundles with (security_invoker = true) as
select b.*, public.bundle_price(b.id) as effective_price,
       public.bundle_items_value(b.id) as items_value,
       public.bundle_in_stock(b.id) as in_stock,
       (select count(*) from public.bundle_items i where i.bundle_id = b.id) as item_count,
       y.slug as year_slug, y.name_en as year_name_en, y.name_ar as year_name_ar, y.number as year_number
from public.bundles b
left join public.academic_years y on y.id = b.year_id;

-- ---------------------------------------------------------------------
-- quote_cart: authoritative prices, availability and totals.
-- p_items: [{"type":"product"|"bundle","id":uuid,"variant_id":uuid|null,"qty":int}]
-- ---------------------------------------------------------------------
create or replace function public.quote_cart(p_items jsonb, p_coupon text default null, p_governorate uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  it jsonb; lines jsonb := '[]'::jsonb;
  v_type text; v_id uuid; v_variant uuid; v_qty int;
  pr public.products; va public.product_variants; bu public.bundles;
  v_unit numeric; v_name text; v_label text; v_img text; v_avail int; v_ok boolean; v_err text;
  v_subtotal numeric := 0; v_discount numeric := 0; v_shipping numeric := 0; v_pending boolean := false;
  c public.coupons; v_coupon_msg text := null; v_coupon_ok boolean := false;
  g public.governorates; v_free numeric;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    return jsonb_build_object('lines', '[]'::jsonb, 'subtotal', 0, 'discount', 0, 'shipping', 0,
                              'shipping_pending', false, 'total', 0, 'coupon_valid', false, 'coupon_message', null);
  end if;
  if jsonb_array_length(p_items) > 100 then raise exception 'Too many cart lines'; end if;

  for it in select * from jsonb_array_elements(p_items) loop
    v_type := coalesce(it->>'type', 'product');
    v_id := nullif(it->>'id', '')::uuid;
    v_variant := nullif(it->>'variant_id', '')::uuid;
    v_qty := greatest(1, least(coalesce((it->>'qty')::int, 1), 999));
    v_ok := true; v_err := null; v_label := null; v_img := null; v_avail := null;

    if v_type = 'bundle' then
      select * into bu from public.bundles where id = v_id and is_published;
      if not found then
        lines := lines || jsonb_build_object('type','bundle','id',v_id,'qty',v_qty,'ok',false,'error','unavailable');
        continue;
      end if;
      v_unit := public.bundle_price(bu.id);
      v_name := coalesce(bu.name_en, bu.name_ar);
      v_img := bu.image_url;
      if not public.bundle_in_stock(bu.id) then v_ok := false; v_err := 'out_of_stock'; end if;
      lines := lines || jsonb_build_object('type','bundle','id',bu.id,'variant_id',null,'qty',v_qty,
        'name_en',bu.name_en,'name_ar',bu.name_ar,'slug',bu.slug,'image_url',v_img,
        'unit_price',v_unit,'line_total',round(v_unit*v_qty,2),'ok',v_ok,'error',v_err);
      if v_ok then v_subtotal := v_subtotal + round(v_unit*v_qty,2); end if;
      continue;
    end if;

    select * into pr from public.products where id = v_id and is_published;
    if not found then
      lines := lines || jsonb_build_object('type','product','id',v_id,'variant_id',v_variant,'qty',v_qty,'ok',false,'error','unavailable');
      continue;
    end if;

    if exists (select 1 from public.product_variants where product_id = pr.id and is_active) then
      select * into va from public.product_variants where id = v_variant and product_id = pr.id and is_active;
      if not found then
        lines := lines || jsonb_build_object('type','product','id',pr.id,'variant_id',v_variant,'qty',v_qty,
          'name_en',pr.name_en,'name_ar',pr.name_ar,'slug',pr.slug,'ok',false,'error','choose_variant');
        continue;
      end if;
      v_unit := public.campaign_price(pr.id, va.price);
      select string_agg(value, ' / ' order by key) into v_label from jsonb_each_text(va.options);
      v_img := coalesce(va.image_url, (select url from public.product_images where product_id = pr.id order by sort_order limit 1));
      if va.stock_qty is not null and not pr.allow_backorder then
        v_avail := va.stock_qty;
        if va.stock_qty < v_qty then v_ok := false; v_err := case when va.stock_qty <= 0 then 'out_of_stock' else 'insufficient_stock' end; end if;
      end if;
    else
      v_variant := null;
      v_unit := public.campaign_price(pr.id, pr.price);
      v_img := (select url from public.product_images where product_id = pr.id order by sort_order limit 1);
      if pr.track_inventory and not pr.allow_backorder then
        v_avail := pr.stock_qty;
        if pr.stock_qty < v_qty then v_ok := false; v_err := case when pr.stock_qty <= 0 then 'out_of_stock' else 'insufficient_stock' end; end if;
      end if;
    end if;

    lines := lines || jsonb_build_object('type','product','id',pr.id,'variant_id',v_variant,'qty',v_qty,
      'name_en',pr.name_en,'name_ar',pr.name_ar,'slug',pr.slug,'variant_label',v_label,'sku',coalesce(va.sku, pr.sku),
      'image_url',v_img,'unit_price',v_unit,'line_total',round(v_unit*v_qty,2),'available',v_avail,'ok',v_ok,'error',v_err);
    if v_ok then v_subtotal := v_subtotal + round(v_unit*v_qty,2); end if;
    va := null;
  end loop;

  -- coupon
  if nullif(trim(p_coupon), '') is not null then
    select * into c from public.coupons where lower(code) = lower(trim(p_coupon));
    if not found or not c.is_active then v_coupon_msg := 'invalid';
    elsif c.starts_at is not null and c.starts_at > now() then v_coupon_msg := 'not_started';
    elsif c.ends_at is not null and c.ends_at <= now() then v_coupon_msg := 'expired';
    elsif c.max_uses is not null and c.used_count >= c.max_uses then v_coupon_msg := 'exhausted';
    elsif v_subtotal < c.min_subtotal then v_coupon_msg := 'min_subtotal:' || c.min_subtotal;
    else
      v_coupon_ok := true;
      v_discount := case when c.discount_type = 'percent'
                         then round(v_subtotal * least(c.value,100) / 100, 2)
                         else least(c.value, v_subtotal) end;
    end if;
  end if;

  -- shipping
  if p_governorate is not null then
    select * into g from public.governorates where id = p_governorate and is_active;
    if found then
      select nullif(value->>'free_shipping_threshold','')::numeric into v_free from public.settings where key = 'shipping';
      if v_free is not null and (v_subtotal - v_discount) >= v_free then v_shipping := 0;
      elsif g.shipping_fee is null then v_pending := true; v_shipping := 0;
      else v_shipping := g.shipping_fee; end if;
    end if;
  end if;

  return jsonb_build_object(
    'lines', lines, 'subtotal', v_subtotal, 'discount', v_discount,
    'shipping', v_shipping, 'shipping_pending', v_pending,
    'total', greatest(v_subtotal - v_discount, 0) + v_shipping,
    'coupon_valid', v_coupon_ok, 'coupon_message', v_coupon_msg);
end $$;

-- ---------------------------------------------------------------------
-- place_order: validates, prices, reserves stock and writes the order.
-- ---------------------------------------------------------------------
create or replace function public.place_order(p_payload jsonb, p_user_id text default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  q jsonb; l jsonb; cust jsonb := p_payload->'customer';
  v_method text := p_payload->>'payment_method';
  v_methods jsonb; g public.governorates; o public.orders;
  v_coupon text := nullif(trim(p_payload->>'coupon_code'), '');
  v_email_required boolean;
begin
  -- customer validation
  if length(trim(coalesce(cust->>'name',''))) < 2 then raise exception 'invalid_name'; end if;
  if coalesce(cust->>'phone','') !~ '^\+?[0-9 ]{8,16}$' then raise exception 'invalid_phone'; end if;
  if length(trim(coalesce(cust->>'city',''))) < 2 then raise exception 'invalid_city'; end if;
  if length(trim(coalesce(cust->>'address',''))) < 5 then raise exception 'invalid_address'; end if;
  select coalesce((value->>'email_required')::boolean, false) into v_email_required from public.settings where key = 'checkout';
  if coalesce(v_email_required,false) and coalesce(cust->>'email','') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email';
  end if;

  select * into g from public.governorates where id = nullif(cust->>'governorate_id','')::uuid and is_active;
  if not found then raise exception 'invalid_governorate'; end if;

  -- payment method must be enabled by the store
  select value into v_methods from public.settings where key = 'payment_methods';
  if v_methods is null or not exists (
       select 1 from jsonb_array_elements(v_methods) m
       where m->>'id' = v_method and coalesce((m->>'enabled')::boolean,false)) then
    raise exception 'invalid_payment_method';
  end if;

  q := public.quote_cart(p_payload->'items', v_coupon, g.id);
  if jsonb_array_length(q->'lines') = 0 then raise exception 'empty_cart'; end if;
  if exists (select 1 from jsonb_array_elements(q->'lines') x where not (x->>'ok')::boolean) then
    raise exception 'cart_changed';
  end if;
  if v_coupon is not null and not (q->>'coupon_valid')::boolean then raise exception 'invalid_coupon'; end if;

  insert into public.orders (user_id, payment_method, customer_name, phone, email, governorate_id, governorate_name,
                             city, address, notes, coupon_code, subtotal, discount_total, shipping_total,
                             shipping_pending, total)
  values (p_user_id, v_method, trim(cust->>'name'), trim(cust->>'phone'), nullif(trim(cust->>'email'),''),
          g.id, g.name_ar, trim(cust->>'city'), trim(cust->>'address'), nullif(trim(cust->>'notes'),''),
          case when (q->>'coupon_valid')::boolean then upper(v_coupon) end,
          (q->>'subtotal')::numeric, (q->>'discount')::numeric, (q->>'shipping')::numeric,
          (q->>'shipping_pending')::boolean, (q->>'total')::numeric)
  returning * into o;

  for l in select * from jsonb_array_elements(q->'lines') loop
    insert into public.order_items (order_id, product_id, variant_id, bundle_id, name, variant_label, sku,
                                    image_url, unit_price, quantity, line_total)
    values (o.id,
            case when l->>'type' = 'product' then (l->>'id')::uuid end,
            nullif(l->>'variant_id','')::uuid,
            case when l->>'type' = 'bundle' then (l->>'id')::uuid end,
            coalesce(l->>'name_en', l->>'name_ar'), l->>'variant_label', l->>'sku', l->>'image_url',
            (l->>'unit_price')::numeric, (l->>'qty')::int, (l->>'line_total')::numeric);

    if l->>'type' = 'product' then
      update public.products set sales_count = sales_count + (l->>'qty')::int where id = (l->>'id')::uuid;
      if nullif(l->>'variant_id','') is not null then
        update public.product_variants v set stock_qty = v.stock_qty - (l->>'qty')::int
        where v.id = (l->>'variant_id')::uuid and v.stock_qty is not null;
      else
        update public.products set stock_qty = stock_qty - (l->>'qty')::int
        where id = (l->>'id')::uuid and track_inventory;
      end if;
    else
      -- bundle: reserve stock of each included item
      update public.products p set stock_qty = p.stock_qty - i.quantity * (l->>'qty')::int,
                                   sales_count = p.sales_count + i.quantity * (l->>'qty')::int
      from public.bundle_items i
      where i.bundle_id = (l->>'id')::uuid and i.product_id = p.id and i.variant_id is null and p.track_inventory;
      update public.product_variants v set stock_qty = v.stock_qty - i.quantity * (l->>'qty')::int
      from public.bundle_items i
      where i.bundle_id = (l->>'id')::uuid and v.id = i.variant_id and v.stock_qty is not null;
    end if;
  end loop;

  -- a product bought both on its own and inside a bundle could pass the per-line
  -- checks yet oversell in total: re-check after reserving (rolls back the whole order)
  if exists (
       with touched as (
         select oi.product_id as pid, oi.variant_id as vid from public.order_items oi
         where oi.order_id = o.id and oi.product_id is not null
         union
         select bi.product_id, bi.variant_id from public.order_items oi
         join public.bundle_items bi on bi.bundle_id = oi.bundle_id where oi.order_id = o.id)
       select 1 from touched t join public.products p on p.id = t.pid
       left join public.product_variants v on v.id = t.vid
       where not p.allow_backorder
         and ((t.vid is null and p.track_inventory and p.stock_qty < 0)
              or (t.vid is not null and v.stock_qty is not null and v.stock_qty < 0))) then
    raise exception 'cart_changed';
  end if;

  if o.coupon_code is not null then
    update public.coupons set used_count = used_count + 1 where lower(code) = lower(o.coupon_code);
  end if;

  insert into public.order_status_history (order_id, status, note, created_by)
  values (o.id, 'pending', 'Order placed', p_user_id);

  return jsonb_build_object('id', o.id, 'order_number', o.order_number, 'access_token', o.access_token);
end $$;

-- Guest-safe order lookup for the confirmation page.
create or replace function public.get_order_public(p_id uuid, p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'order', to_jsonb(o) - 'access_token' - 'user_id',
    'items', coalesce((select jsonb_agg(to_jsonb(i) order by i.name) from public.order_items i where i.order_id = o.id), '[]'::jsonb),
    'history', coalesce((select jsonb_agg(jsonb_build_object('status', h.status, 'created_at', h.created_at) order by h.created_at)
                         from public.order_status_history h where h.order_id = o.id), '[]'::jsonb))
  from public.orders o where o.id = p_id and o.access_token = p_token;
$$;

-- Change status + record history atomically (the app checks the caller is staff).
create or replace function public.set_order_status(p_order uuid, p_status public.order_status, p_note text default null, p_actor text default null)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  update public.orders set status = p_status where id = p_order;
  insert into public.order_status_history (order_id, status, note, created_by)
  values (p_order, p_status, nullif(trim(p_note), ''), p_actor);
end $$;

-- Search suggestions (trigram + prefix).
create or replace function public.search_products(p_query text, p_limit int default 8)
returns setof public.catalog_products language sql stable security invoker set search_path = public as $$
  select * from public.catalog_products c
  where c.is_published
    and (c.search_text ilike '%' || lower(trim(p_query)) || '%'
         or c.search_text % lower(trim(p_query)))
  order by (c.search_text ilike lower(trim(p_query)) || '%') desc,
           similarity(c.search_text, lower(trim(p_query))) desc,
           c.sales_count desc
  limit least(greatest(p_limit, 1), 50);
$$;

-- Dashboard aggregates.
create or replace function public.admin_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  return jsonb_build_object(
    'orders_total', (select count(*) from public.orders),
    'orders_pending', (select count(*) from public.orders where status = 'pending'),
    'revenue_total', (select coalesce(sum(total),0) from public.orders where status not in ('cancelled','refunded')),
    'revenue_30d', (select coalesce(sum(total),0) from public.orders where status not in ('cancelled','refunded') and created_at > now() - interval '30 days'),
    'products_total', (select count(*) from public.products),
    'products_published', (select count(*) from public.products where is_published),
    'products_unassigned', (select count(*) from public.products where audience = 'unassigned'),
    'low_stock', (select count(*) from public.products where track_inventory and stock_qty <= low_stock_threshold),
    'sales_by_day', (select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'total', coalesce(s.total,0), 'orders', coalesce(s.n,0)) order by d), '[]'::jsonb)
                     from generate_series(current_date - 29, current_date, interval '1 day') d
                     left join (select created_at::date as day, sum(total) as total, count(*) as n from public.orders
                                where status not in ('cancelled','refunded') and created_at > now() - interval '31 days'
                                group by 1) s on s.day = d::date)
  );
end $$;


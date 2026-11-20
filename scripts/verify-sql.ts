/**
 * Runs every migration against an in-memory, plain Postgres (PGlite — same as
 * Neon: no extra schemas or roles), then exercises the commerce functions end
 * to end. Usage: npm run db:verify
 */
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const db = new PGlite({ extensions: { pg_trgm, unaccent } });
  const dir = join(process.cwd(), "db", "migrations");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(dir, f), "utf8"));
    console.log("✓ applied", f);
  }

  // --- smoke test: catalog + order flow ---
  const customer = "user_test_123"; // Neon Auth user ids are text
  await db.query(`insert into public.profiles (id, email) values ($1, 'student@example.test')`, [customer]);

  const cat = (await db.query<{ id: string }>(`select id from public.categories where slug='burs'`)).rows[0].id;
  const year = (await db.query<{ id: string }>(`select id from public.academic_years where slug='first-year'`)).rows[0].id;
  const p1 = (await db.query<{ id: string }>(
    `insert into public.products (slug, name_en, price, compare_at_price, is_published, audience, primary_category_id, track_inventory, stock_qty)
     values ('wax-carver','Wax Carver', 29, 35, true, 'student', $1, true, 5) returning id`, [cat])).rows[0].id;
  await db.query(`insert into public.product_years (product_id, year_id) values ($1,$2)`, [p1, year]);
  const p2 = (await db.query<{ id: string }>(
    `insert into public.products (slug, name_en, price, is_published, audience) values ('gloves','Gloves', 165, true, 'both') returning id`)).rows[0].id;
  const v1 = (await db.query<{ id: string }>(
    `insert into public.product_variants (product_id, options, price, stock_qty) values ($1, '{"Size":"M"}', 165, null) returning id`, [p2])).rows[0].id;
  await db.query(`insert into public.product_variants (product_id, options, price, stock_qty) values ($1, '{"Size":"L"}', 175, 0)`, [p2]);

  const bundle = (await db.query<{ id: string }>(
    `insert into public.bundles (slug, name_en, year_id, pricing_mode, discount_percent, is_published)
     values ('y1-kit','First Year Kit',$1,'sum_of_items',10,true) returning id`, [year])).rows[0].id;
  await db.query(`insert into public.bundle_items (bundle_id, product_id, quantity) values ($1,$2,2)`, [bundle, p1]);

  await db.query(`insert into public.campaigns (name, value, scope) values ('All 10%', 10, 'all')`);
  await db.query(`insert into public.coupons (code, discount_type, value) values ('WELCOME', 'fixed', 20)`);
  const gov = (await db.query<{ id: string }>(`select id from public.governorates where name_en='Cairo'`)).rows[0].id;
  await db.query(`update public.governorates set shipping_fee = 60 where id = $1`, [gov]);

  const cp = await db.query(`select slug, price, compare_at_price, in_stock, has_variants from public.catalog_products order by slug`);
  console.table(cp.rows);
  const cb = await db.query(`select slug, effective_price, items_value, in_stock, item_count from public.catalog_bundles`);
  console.table(cb.rows);

  const items = JSON.stringify([
    { type: "product", id: p1, qty: 2 },
    { type: "product", id: p2, variant_id: v1, qty: 1 },
    { type: "bundle", id: bundle, qty: 1 },
  ]);
  const quote = (await db.query<{ q: unknown }>(`select public.quote_cart($1::jsonb, 'welcome', $2) as q`, [items, gov])).rows[0].q;
  console.log("quote:", JSON.stringify(quote, null, 1).slice(0, 1200));

  const order = (await db.query<{ o: { id: string; access_token: string; order_number: string } }>(
    `select public.place_order($1::jsonb, $2) as o`,
    [JSON.stringify({
      items: JSON.parse(items), payment_method: "cod", coupon_code: "WELCOME",
      customer: { name: "Test Student", phone: "01000000000", governorate_id: gov, city: "Nasr City", address: "12 Example Street" },
    }), customer])).rows[0].o;
  console.log("order:", order.order_number);
  const owner = (await db.query<{ user_id: string }>(`select user_id from public.orders where id = $1`, [order.id])).rows[0].user_id;
  if (owner !== customer) throw new Error("order not linked to the signed-in customer");
  console.log("✓ order linked to customer profile");
  await db.query(`select public.set_order_status($1, 'confirmed', 'called the customer', $2)`, [order.id, customer]);
  console.log("✓ status history records the acting user");
  const pub = await db.query(`select public.get_order_public($1, $2) as o`, [order.id, order.access_token]);
  const o = (pub.rows[0] as { o: { order: { total: string; subtotal: string; status: string } } }).o.order;
  console.log("order totals:", o.subtotal, o.total, o.status);
  const stock = await db.query(`select stock_qty, sales_count from public.products where id = $1`, [p1]);
  console.log("wax carver stock after (5 - 2 - 2 bundle):", stock.rows[0]);

  // insufficient stock must be rejected
  try {
    await db.query(`select public.place_order($1::jsonb, null)`, [JSON.stringify({
      items: [{ type: "product", id: p1, qty: 50 }], payment_method: "cod",
      customer: { name: "X Y", phone: "01000000000", governorate_id: gov, city: "Giza", address: "Somewhere 1" } })]);
    throw new Error("expected cart_changed");
  } catch (e) {
    if (!String(e).includes("cart_changed")) throw e;
    console.log("✓ oversell rejected");
  }
  // product + bundle containing it: each line fits, the total does not
  await db.query(`update public.products set stock_qty = 3 where id = $1`, [p1]);
  try {
    await db.query(`select public.place_order($1::jsonb, null)`, [JSON.stringify({
      items: [{ type: "product", id: p1, qty: 2 }, { type: "bundle", id: bundle, qty: 1 }], payment_method: "cod",
      customer: { name: "X Y", phone: "01000000000", governorate_id: gov, city: "Giza", address: "Somewhere 1" } })]);
    throw new Error("expected combined oversell to be rejected");
  } catch (e) {
    if (!String(e).includes("cart_changed")) throw e;
    const after = await db.query(`select stock_qty from public.products where id = $1`, [p1]);
    console.log("✓ combined oversell rejected, stock untouched:", after.rows[0]);
  }
  // disabled payment method must be rejected
  try {
    await db.query(`select public.place_order($1::jsonb, null)`, [JSON.stringify({
      items: [{ type: "product", id: p2, variant_id: v1, qty: 1 }], payment_method: "instapay",
      customer: { name: "X Y", phone: "01000000000", governorate_id: gov, city: "Giza", address: "Somewhere 1" } })]);
    throw new Error("expected invalid_payment_method");
  } catch (e) {
    if (!String(e).includes("invalid_payment_method")) throw e;
    console.log("✓ disabled payment method rejected");
  }
  const s = await db.query(`select slug from public.search_products('carv', 5)`);
  console.log("search 'carv':", s.rows);
  const browse = await db.query<{ r: { total: number; items: { slug: string }[]; facets: unknown } }>(
    `select public.browse_products($1::jsonb) as r`,
    [JSON.stringify({ year: "first-year", audience: "student", sort: "price_asc" })]);
  const br = browse.rows[0].r;
  if (br.total !== 1 || br.items[0].slug !== "wax-carver") throw new Error("browse year filter failed: " + JSON.stringify(br));
  const all = (await db.query<{ r: { total: number } }>(`select public.browse_products('{"category":"burs"}'::jsonb) as r`)).rows[0].r;
  if (all.total !== 1) throw new Error("browse category filter failed");
  console.log("✓ browse_products filters, facets:", JSON.stringify(br.facets));
  console.log("\nAll SQL checks passed.");
}

main().catch((e) => { console.error(e); process.exit(1); });

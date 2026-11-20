/**
 * Import the exported store CSV into the Neon database.
 *
 *   npm run import:products -- ./data/products.csv --dry-run
 *   npm run import:products -- ./data/products.csv
 *   npm run import:products -- ./data/products.csv --update          # overwrite already-imported products
 *   npm run import:products -- ./data/products.csv --mirror-images   # copy images into Neon Object Storage
 *
 * Needs DATABASE_URL in .env.local (and the AWS_* / NEON_STORAGE_BUCKET
 * variables for --mirror-images).
 */
import { config } from "dotenv";
import pg from "pg";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, resolve } from "node:path";
import { buildReport, parseCsv, transform, slugify, type ProductRecord } from "./lib/transform";

config({ path: ".env.local" });
config();

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const DRY = args.includes("--dry-run");
const UPDATE = args.includes("--update");
const MIRROR = args.includes("--mirror-images");

if (!file) {
  console.error("Usage: npm run import:products -- <path-to-csv> [--dry-run] [--update] [--mirror-images]");
  process.exit(1);
}

async function main() {
  const content = readFileSync(resolve(file!), "utf8");
  const rows = parseCsv(content);
  const result = transform(rows);
  mkdirSync("reports", { recursive: true });
  writeFileSync("reports/import-report.md", buildReport(result, basename(file!), rows.length));
  writeFileSync("reports/import-preview.json", JSON.stringify(result.products, null, 2));
  console.log(`Parsed ${rows.length} rows → ${result.products.length} products. Report: reports/import-report.md`);
  if (DRY) return;

  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL in .env.local");
  const db = new pg.Client({ connectionString: url });
  await db.connect();

  const lookup = async (table: string) =>
    new Map((await db.query<{ id: string; slug: string }>(`select id, slug from ${table}`)).rows.map((r) => [r.slug, r.id]));
  const categories = await lookup("categories");
  const years = await lookup("academic_years");
  const specialties = await lookup("specialties");
  const brands = await lookup("brands");

  for (const name of new Set(result.products.map((p) => p.brand).filter(Boolean) as string[])) {
    const slug = slugify(name);
    if (brands.has(slug)) continue;
    const { rows: [b] } = await db.query<{ id: string }>(`insert into brands (slug, name) values ($1, $2) returning id`, [slug, name]);
    brands.set(slug, b.id);
  }

  const existing = (await db.query<{ id: string; legacy_handle: string | null; slug: string }>(`select id, legacy_handle, slug from products`)).rows;
  const byHandle = new Map(existing.map((p) => [p.legacy_handle, p.id]));
  const takenSlugs = new Set(existing.map((p) => p.slug));

  let created = 0, updated = 0, skipped = 0, failed = 0;
  for (const p of result.products) {
    const existingId = byHandle.get(p.legacy_handle);
    if (existingId && !UPDATE) { skipped++; continue; }
    try {
      const images = MIRROR ? await mirrorImages(p) : p.images;
      await db.query("begin");
      await upsertProduct(db, p, existingId, images, {
        brandId: p.brand ? brands.get(slugify(p.brand)) ?? null : null,
        categoryIds: p.category_slugs.map((s) => categories.get(s)).filter(Boolean) as string[],
        yearIds: p.year_slugs.map((s) => years.get(s)).filter(Boolean) as string[],
        specialtyIds: p.specialty_slugs.map((s) => specialties.get(s)).filter(Boolean) as string[],
        takenSlugs,
      });
      await db.query("commit");
      if (existingId) updated++; else created++;
      process.stdout.write(`\r${created} created, ${updated} updated, ${skipped} skipped, ${failed} failed`);
    } catch (e) {
      await db.query("rollback");
      failed++;
      console.error(`\nFailed: ${p.legacy_handle}:`, e);
    }
  }
  await db.end();
  console.log(`\nDone. ${created} created, ${updated} updated, ${skipped} already imported (use --update to overwrite), ${failed} failed.`);
}

async function upsertProduct(
  db: pg.Client, p: ProductRecord, existingId: string | undefined, images: string[],
  refs: { brandId: string | null; categoryIds: string[]; yearIds: string[]; specialtyIds: string[]; takenSlugs: Set<string> },
) {
  const cols = {
    legacy_handle: p.legacy_handle, sku: p.sku, name_en: p.name_en, name_ar: p.name_ar,
    description_en: p.description_en, description_ar: p.description_ar,
    short_description_en: p.short_description_en, short_description_ar: p.short_description_ar,
    admin_notes: p.admin_notes, brand_id: refs.brandId, primary_category_id: refs.categoryIds[0] ?? null,
    price: p.price, compare_at_price: p.compare_at_price, cost_price: p.cost_price,
    track_inventory: p.track_inventory, stock_qty: p.stock_qty, audience: p.audience,
    is_published: p.is_published, option_names: JSON.stringify(p.option_names), source_collections: p.source_collections,
    specifications: JSON.stringify(p.specifications),
  };
  const keys = Object.keys(cols) as (keyof typeof cols)[];
  let id = existingId;
  if (id) {
    await db.query(`update products set ${keys.map((k, i) => `${k} = $${i + 2}`).join(", ")} where id = $1`, [id, ...keys.map((k) => cols[k])]);
    for (const t of ["product_images", "product_variants", "product_categories", "product_years", "product_specialties"])
      await db.query(`delete from ${t} where product_id = $1`, [id]);
  } else {
    let slug = p.slug;
    for (let i = 2; refs.takenSlugs.has(slug); i++) slug = `${p.slug}-${i}`;
    refs.takenSlugs.add(slug);
    const all = { ...cols, slug, ...(p.created_at ? { created_at: p.created_at } : {}) } as Record<string, unknown>;
    const k2 = Object.keys(all);
    const { rows: [r] } = await db.query<{ id: string }>(
      `insert into products (${k2.join(", ")}) values (${k2.map((_, i) => `$${i + 1}`).join(", ")}) returning id`, k2.map((k) => all[k]));
    id = r.id;
  }
  for (const [i, url] of images.entries())
    await db.query(`insert into product_images (product_id, url, sort_order) values ($1, $2, $3)`, [id, url, i]);
  for (const v of p.variants)
    await db.query(
      `insert into product_variants (product_id, sku, options, price, compare_at_price, cost_price, stock_qty, image_url, sort_order)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, v.sku, JSON.stringify(v.options), v.price, v.compare_at_price, v.cost_price, v.stock_qty, v.image_url, v.sort_order]);
  await db.query(`insert into product_categories (product_id, category_id) select $1, unnest($2::uuid[]) on conflict do nothing`, [id, refs.categoryIds]);
  await db.query(`insert into product_years (product_id, year_id) select $1, unnest($2::uuid[]) on conflict do nothing`, [id, refs.yearIds]);
  await db.query(`insert into product_specialties (product_id, specialty_id) select $1, unnest($2::uuid[]) on conflict do nothing`, [id, refs.specialtyIds]);
}

// ---------------- Neon Object Storage ----------------
let s3: S3Client | null = null;
async function mirrorImages(p: ProductRecord): Promise<string[]> {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const bucket = process.env.NEON_STORAGE_BUCKET ?? "media";
  if (!endpoint || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY)
    throw new Error("--mirror-images needs AWS_ENDPOINT_URL_S3, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY (see README)");
  s3 ??= new S3Client({
    region: process.env.AWS_REGION ?? "us-east-2", endpoint, forcePathStyle: true, requestChecksumCalculation: "WHEN_REQUIRED",
    credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY },
  });
  const out: string[] = [];
  for (const [i, src] of p.images.entries()) {
    try {
      const res = await fetch(src, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = res.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
      const ext = (type.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
      const key = `products/${crypto.randomUUID()}-${i}.${ext}`;
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: new Uint8Array(await res.arrayBuffer()), ContentType: type, CacheControl: "public, max-age=31536000, immutable" }));
      out.push(`${endpoint.replace(/\/$/, "")}/${bucket}/${key}`);
    } catch (e) {
      console.warn(`\n  image kept on old CDN (${String(e)}): ${src}`);
      out.push(src);
    }
  }
  return out;
}

main().catch((e) => { console.error(e); process.exit(1); });

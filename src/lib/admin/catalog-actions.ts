"use server";
import sanitizeHtml from "sanitize-html";
import { z } from "zod";
import { requireAdmin, requireStaff } from "./auth";
import { refreshStorefront, type ActionResult } from "./actions";
import { dbErrorMessage, one, q, tx } from "@/lib/db";
import { putObject } from "@/lib/storage";
import { insertRow, updateRow } from "./sql";

const uuid = z.string().uuid();
const optText = (max = 4000) => z.string().trim().max(max).nullish().transform((v) => (v ? v : null));
const money = z.coerce.number().min(0).max(100000000);
const optMoney = z.union([z.literal(""), z.null(), z.undefined(), money]).transform((v) => (v === "" || v == null ? null : Number(v)));
const slug = z.string().trim().min(1).max(90).regex(/^[a-z0-9؀-ۿ]+(?:-[a-z0-9؀-ۿ]+)*$/, "Slug: lowercase letters, numbers and dashes");

const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "ul", "ol", "li", "strong", "b", "em", "i", "h2", "h3", "h4", "hr", "table", "tbody", "tr", "td", "th", "a"],
  allowedAttributes: { "*": ["dir"], a: ["href"] },
  allowedSchemes: ["https", "http", "mailto", "tel"],
};
/** Plain text (no tags) becomes paragraphs; HTML is sanitized. */
function cleanHtml(v: string | null) {
  if (!v) return null;
  const html = /<\/?[a-z][\s\S]*>/i.test(v)
    ? v
    : v.split(/\n{2,}/).map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>`).join("");
  const out = sanitizeHtml(html, SANITIZE).trim();
  return out || null;
}

// ======================= products =======================
const productSchema = z.object({
  id: uuid.nullish(),
  slug,
  sku: optText(80),
  name_en: optText(300),
  name_ar: optText(300),
  description_en: optText(30000),
  description_ar: optText(30000),
  short_description_en: optText(400),
  short_description_ar: optText(400),
  admin_notes: optText(4000),
  brand_id: uuid.nullish().or(z.literal("")).transform((v) => v || null),
  product_type: optText(80),
  price: money,
  compare_at_price: optMoney,
  cost_price: optMoney,
  track_inventory: z.boolean(),
  stock_qty: z.coerce.number().int().min(-100000).max(1000000),
  low_stock_threshold: z.coerce.number().int().min(0).max(100000),
  allow_backorder: z.boolean(),
  audience: z.enum(["unassigned", "student", "dentist", "both"]),
  is_published: z.boolean(),
  is_featured: z.boolean(),
  is_best_seller: z.boolean(),
  is_new_arrival: z.boolean(),
  bundle_eligible: z.boolean(),
  specifications: z.array(z.object({ label_en: z.string().trim().min(1).max(120), label_ar: optText(120), value: z.string().trim().min(1).max(500) })).max(60),
  option_names: z.array(z.string().trim().min(1).max(60)).max(3),
  images: z.array(z.string().trim().url().max(1000)).max(30),
  variants: z.array(z.object({
    id: uuid.nullish(),
    sku: optText(80),
    options: z.record(z.string(), z.string().trim().min(1).max(120)),
    price: money,
    compare_at_price: optMoney,
    stock_qty: z.union([z.literal(""), z.null(), z.undefined(), z.coerce.number().int().min(-100000).max(1000000)]).transform((v) => (v === "" || v == null ? null : Number(v))),
    image_url: z.string().trim().url().max(1000).nullish().or(z.literal("")).transform((v) => v || null),
    is_active: z.boolean(),
  })).max(400),
  category_ids: z.array(uuid).max(50),
  primary_category_id: uuid.nullish().or(z.literal("")).transform((v) => v || null),
  years: z.array(z.object({ year_id: uuid, is_essential: z.boolean() })).max(20),
  specialty_ids: z.array(uuid).max(30),
  related_ids: z.array(uuid).max(24),
}).superRefine((p, ctx) => {
  if (!p.name_en && !p.name_ar) ctx.addIssue({ code: "custom", path: ["name_en"], message: "Enter a name in English or Arabic" });
  if (p.compare_at_price != null && p.compare_at_price > 0 && p.compare_at_price <= p.price)
    ctx.addIssue({ code: "custom", path: ["compare_at_price"], message: "Original price must be higher than the selling price" });
});
export type ProductPayload = z.input<typeof productSchema>;
export type ProductData = z.output<typeof productSchema>;


const fail = (e: unknown): ActionResult => ({ ok: false, error: dbErrorMessage(e) });
const firstIssue = (e: z.ZodError) => { const i = e.issues[0]; return `${i.path.join(".")}: ${i.message}`; };

export async function saveProduct(input: ProductPayload): Promise<ActionResult> {
  await requireStaff();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const p = parsed.data;
  const activeVariants = p.variants.filter((v) => v.is_active);
  // product price mirrors the cheapest active option so listings show "from"
  const cheapest = activeVariants.length ? [...activeVariants].sort((a, b) => a.price - b.price)[0] : null;
  const categoryIds = [...new Set([...(p.primary_category_id ? [p.primary_category_id] : []), ...p.category_ids])];

  const row = {
    slug: p.slug, sku: p.sku, name_en: p.name_en, name_ar: p.name_ar,
    description_en: cleanHtml(p.description_en), description_ar: cleanHtml(p.description_ar),
    short_description_en: p.short_description_en, short_description_ar: p.short_description_ar, admin_notes: p.admin_notes,
    brand_id: p.brand_id, product_type: p.product_type,
    price: cheapest ? cheapest.price : p.price,
    compare_at_price: cheapest ? cheapest.compare_at_price : p.compare_at_price,
    cost_price: p.cost_price,
    track_inventory: p.track_inventory, stock_qty: p.stock_qty, low_stock_threshold: p.low_stock_threshold, allow_backorder: p.allow_backorder,
    audience: p.audience, is_published: p.is_published, is_featured: p.is_featured, is_best_seller: p.is_best_seller,
    is_new_arrival: p.is_new_arrival, bundle_eligible: p.bundle_eligible,
    specifications: p.specifications, option_names: p.option_names,
    primary_category_id: categoryIds[0] ?? null,
  };

  try {
    const id = await tx(async (c) => {
      const pid = p.id ? await updateRow(c, "products", p.id, row) : await insertRow(c, "products", row);

      await c.query(`delete from product_images where product_id = $1`, [pid]);
      for (const [i, url] of p.images.entries())
        await c.query(`insert into product_images (product_id, url, sort_order) values ($1, $2, $3)`, [pid, url, i]);

      // variants: diff to keep ids stable (orders and bundles reference them)
      const existing = (await c.query<{ id: string }>(`select id from product_variants where product_id = $1`, [pid])).rows.map((r) => r.id);
      const keep = new Set(p.variants.map((v) => v.id).filter(Boolean) as string[]);
      const removed = existing.filter((vid) => !keep.has(vid));
      if (removed.length) {
        // variants used in a bundle can't be deleted: deactivate those instead
        await c.query(`update product_variants set is_active = false where id = any($1::uuid[]) and id in (select variant_id from bundle_items where variant_id is not null)`, [removed]);
        await c.query(`delete from product_variants where id = any($1::uuid[]) and id not in (select variant_id from bundle_items where variant_id is not null)`, [removed]);
      }
      for (const [i, v] of p.variants.entries()) {
        const vrow = { product_id: pid, sku: v.sku, options: v.options, price: v.price, compare_at_price: v.compare_at_price, stock_qty: v.stock_qty, image_url: v.image_url, is_active: v.is_active, sort_order: i };
        if (v.id && existing.includes(v.id)) await updateRow(c, "product_variants", v.id, vrow);
        else await insertRow(c, "product_variants", vrow);
      }

      await c.query(`delete from product_categories where product_id = $1`, [pid]);
      await c.query(`insert into product_categories (product_id, category_id) select $1, unnest($2::uuid[])`, [pid, categoryIds]);
      await c.query(`delete from product_years where product_id = $1`, [pid]);
      for (const y of p.years)
        await c.query(`insert into product_years (product_id, year_id, is_essential) values ($1, $2, $3)`, [pid, y.year_id, y.is_essential]);
      await c.query(`delete from product_specialties where product_id = $1`, [pid]);
      await c.query(`insert into product_specialties (product_id, specialty_id) select $1, unnest($2::uuid[])`, [pid, p.specialty_ids]);
      await c.query(`delete from related_products where product_id = $1`, [pid]);
      for (const [i, rid] of p.related_ids.filter((r) => r !== pid).entries())
        await c.query(`insert into related_products (product_id, related_id, sort_order) values ($1, $2, $3)`, [pid, rid, i]);
      return pid;
    });
    await refreshStorefront();
    return { ok: true, id };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  await requireStaff();
  try {
    await q(`delete from products where id = $1`, [uuid.parse(id)]);
  } catch (e) {
    const err = e as { code?: string };
    return { ok: false, error: err.code === "23503" ? "This product is part of a bundle. Remove it from the bundle first, or unpublish it instead." : dbErrorMessage(e) };
  }
  await refreshStorefront();
  return { ok: true };
}

const bulkSchema = z.object({
  ids: z.array(uuid).min(1).max(500),
  action: z.discriminatedUnion("type", [
    z.object({ type: z.literal("audience"), value: z.enum(["unassigned", "student", "dentist", "both"]) }),
    z.object({ type: z.literal("publish"), value: z.boolean() }),
    z.object({ type: z.literal("flag"), flag: z.enum(["is_featured", "is_best_seller", "is_new_arrival"]), value: z.boolean() }),
    z.object({ type: z.literal("add_year"), year_id: uuid }),
    z.object({ type: z.literal("remove_year"), year_id: uuid }),
    z.object({ type: z.literal("add_category"), category_id: uuid }),
    z.object({ type: z.literal("add_specialty"), specialty_id: uuid }),
    z.object({ type: z.literal("delete") }),
  ]),
});

export async function bulkUpdateProducts(input: z.input<typeof bulkSchema>): Promise<ActionResult> {
  await requireStaff();
  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid bulk action" };
  const { ids, action: a } = parsed.data;
  try {
    switch (a.type) {
      case "audience": await q(`update products set audience = $2 where id = any($1::uuid[])`, [ids, a.value]); break;
      case "publish": await q(`update products set is_published = $2 where id = any($1::uuid[])`, [ids, a.value]); break;
      case "flag": await q(`update products set "${a.flag}" = $2 where id = any($1::uuid[])`, [ids, a.value]); break;
      case "add_year": await q(`insert into product_years (product_id, year_id) select unnest($1::uuid[]), $2 on conflict do nothing`, [ids, a.year_id]); break;
      case "remove_year": await q(`delete from product_years where product_id = any($1::uuid[]) and year_id = $2`, [ids, a.year_id]); break;
      case "add_category": await q(`insert into product_categories (product_id, category_id) select unnest($1::uuid[]), $2 on conflict do nothing`, [ids, a.category_id]); break;
      case "add_specialty": await q(`insert into product_specialties (product_id, specialty_id) select unnest($1::uuid[]), $2 on conflict do nothing`, [ids, a.specialty_id]); break;
      case "delete": await q(`delete from products where id = any($1::uuid[])`, [ids]); break;
    }
  } catch (e) {
    const err = e as { code?: string };
    return { ok: false, error: err.code === "23503" ? "Some products are in bundles and can't be deleted. Unpublish them instead." : dbErrorMessage(e) };
  }
  await refreshStorefront();
  return { ok: true };
}

/** Product picker search for admin forms (includes unpublished). */
export async function adminSearchProducts(term: string) {
  await requireStaff();
  const t = z.string().trim().max(80).parse(term).toLowerCase();
  const rows = await q<{ id: string; slug: string; name: string; price: number; published: boolean; image: string | null }>(
    `select p.id, p.slug, coalesce(p.name_en, p.name_ar) as name, p.price, p.is_published as published,
            (select url from product_images i where i.product_id = p.id order by sort_order limit 1) as image
       from products p
      where $1 = '' or p.search_text like '%' || $1 || '%'
      order by p.name_en nulls last limit 20`, [t]);
  return rows;
}

export async function adminProductVariants(productId: string) {
  await requireStaff();
  return q<{ id: string; options: Record<string, string>; price: number; is_active: boolean }>(
    `select id, options, price, is_active from product_variants where product_id = $1 order by sort_order`, [uuid.parse(productId)]);
}

/** Admin image upload → Neon Object Storage (public_read bucket). */
export async function uploadMedia(form: FormData): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireStaff();
  const file = form.get("file");
  const folder = String(form.get("folder") ?? "uploads").replace(/[^a-z0-9-]/gi, "").slice(0, 30) || "uploads";
  if (!(file instanceof File)) return { ok: false, error: "No file" };
  if (!/^image\/(png|jpe?g|webp|avif|gif)$/.test(file.type)) return { ok: false, error: "Choose a PNG, JPG, WebP, AVIF or GIF image" };
  if (file.size > 8 * 1024 * 1024) return { ok: false, error: "Images must be under 8 MB" };
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const key = `${folder}/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  try {
    const url = await putObject(key, new Uint8Array(await file.arrayBuffer()), file.type);
    return { ok: true, url };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
// ======================= bundles =======================
const bundleSchema = z.object({
  id: uuid.nullish(),
  slug,
  name_en: z.string().trim().min(1).max(200),
  name_ar: optText(200),
  description_en: optText(20000),
  description_ar: optText(20000),
  year_id: uuid.nullish().or(z.literal("")).transform((v) => v || null),
  image_url: z.string().url().nullish().or(z.literal("")).transform((v) => v || null),
  gallery: z.array(z.string().url()).max(12),
  pricing_mode: z.enum(["fixed", "sum_of_items"]),
  price: optMoney,
  compare_at_price: optMoney,
  discount_percent: z.coerce.number().min(0).max(90),
  is_published: z.boolean(),
  is_featured: z.boolean(),
  sort_order: z.coerce.number().int().min(-10000).max(10000),
  items: z.array(z.object({ product_id: uuid, variant_id: uuid.nullish().or(z.literal("")).transform((v) => v || null), quantity: z.coerce.number().int().min(1).max(999) })).max(200),
}).superRefine((b, ctx) => {
  if (b.pricing_mode === "fixed" && (b.price == null || b.price <= 0)) ctx.addIssue({ code: "custom", path: ["price"], message: "Set the bundle price" });
  if (b.is_published && !b.items.length) ctx.addIssue({ code: "custom", path: ["items"], message: "Add at least one product before publishing" });
});
export type BundlePayload = z.input<typeof bundleSchema>;
export type BundleData = z.output<typeof bundleSchema>;

// ======================= academic years =======================
const yearSchema = z.object({
  id: uuid.nullish(),
  slug,
  number: z.coerce.number().int().min(1).max(20),
  name_en: z.string().trim().min(1).max(80),
  name_ar: optText(80),
  tagline_en: optText(200), tagline_ar: optText(200),
  intro_en: optText(3000), intro_ar: optText(3000),
  hero_image_url: z.string().url().nullish().or(z.literal("")).transform((v) => v || null),
  is_enabled: z.boolean(),
  sort_order: z.coerce.number().int().min(-1000).max(1000),
  checklist: z.array(z.object({ label_en: z.string().trim().min(1).max(200), label_ar: optText(200), product_id: uuid.nullish().or(z.literal("")).transform((v) => v || null) })).max(150),
});
export type YearPayload = z.input<typeof yearSchema>;
export type YearData = z.output<typeof yearSchema>;

// ======================= settings (admin only) =======================
const settingSchemas = {
  store: z.object({
    name_en: z.string().trim().min(1).max(120), name_ar: z.string().trim().min(1).max(160),
    phone: optText(40), whatsapp: optText(40), email: z.string().email().nullish().or(z.literal("")).transform((v) => v || null),
    address_en: optText(300), address_ar: optText(300),
    instagram: z.string().url().nullish().or(z.literal("")).transform((v) => v || null),
    facebook: z.string().url().nullish().or(z.literal("")).transform((v) => v || null),
    working_hours_en: optText(200), working_hours_ar: optText(200),
  }),
  announcement: z.object({ enabled: z.boolean(), text_en: z.string().max(200), text_ar: z.string().max(200), href: z.string().max(300).regex(/^(\/|https?:\/\/)/).nullish().or(z.literal("")).transform((v) => v || null) }),
  checkout: z.object({ email_required: z.boolean() }),
  shipping: z.object({ free_shipping_threshold: optMoney }),
  payment_methods: z.array(z.object({
    id: z.string().regex(/^[a-z_]+$/).max(30), enabled: z.boolean(),
    label_en: z.string().trim().min(1).max(80), label_ar: z.string().trim().min(1).max(80),
    instructions_en: z.string().max(1000), instructions_ar: z.string().max(1000),
  })).min(1).max(10),
  home_sections: z.record(z.string(), z.boolean()),
  meta_pixel: z.object({ ids: z.array(z.string().trim().regex(/^\d{5,20}$/, "Pixel IDs contain digits only")).max(5) }),
  home_hero: z.object({
    title_en: z.string().max(160), title_ar: z.string().max(160), subtitle_en: z.string().max(400), subtitle_ar: z.string().max(400),
    student_image: z.string().url().nullish().or(z.literal("")).transform((v) => v || null),
    dentist_image: z.string().url().nullish().or(z.literal("")).transform((v) => v || null),
  }),
} as const;


export async function saveBundle(input: BundlePayload): Promise<ActionResult> {
  await requireStaff();
  const parsed = bundleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { id: bid, items, ...b } = parsed.data;
  const row = { ...b, description_en: cleanHtml(b.description_en), description_ar: cleanHtml(b.description_ar) };
  try {
    const id = await tx(async (c) => {
      const id = bid ? await updateRow(c, "bundles", bid, row) : await insertRow(c, "bundles", row);
      await c.query(`delete from bundle_items where bundle_id = $1`, [id]);
      for (const [n, i] of items.entries())
        await c.query(`insert into bundle_items (bundle_id, product_id, variant_id, quantity, sort_order) values ($1, $2, $3, $4, $5)`,
          [id, i.product_id, i.variant_id, i.quantity, n]);
      return id;
    });
    await refreshStorefront();
    return { ok: true, id };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteBundle(id: string): Promise<ActionResult> {
  await requireStaff();
  try { await q(`delete from bundles where id = $1`, [uuid.parse(id)]); } catch (e) { return fail(e); }
  await refreshStorefront();
  return { ok: true };
}

export async function saveYear(input: YearPayload): Promise<ActionResult> {
  await requireStaff();
  const parsed = yearSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { id: yid, checklist, ...y } = parsed.data;
  try {
    const id = await tx(async (c) => {
      const id = yid ? await updateRow(c, "academic_years", yid, y) : await insertRow(c, "academic_years", y);
      await c.query(`delete from year_checklist_items where year_id = $1`, [id]);
      for (const [i, item] of checklist.entries())
        await c.query(`insert into year_checklist_items (year_id, label_en, label_ar, product_id, sort_order) values ($1, $2, $3, $4, $5)`,
          [id, item.label_en, item.label_ar, item.product_id, i]);
      return id;
    });
    await refreshStorefront();
    return { ok: true, id };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteYear(id: string): Promise<ActionResult> {
  await requireStaff();
  try { await q(`delete from academic_years where id = $1`, [uuid.parse(id)]); } catch (e) { return fail(e); }
  await refreshStorefront();
  return { ok: true };
}

// ======================= orders =======================
const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"] as const;

export async function updateOrderStatus(orderId: string, status: string, note: string): Promise<ActionResult> {
  const staff = await requireStaff();
  const p = z.object({ orderId: uuid, status: z.enum(STATUSES), note: z.string().max(500) }).safeParse({ orderId, status, note });
  if (!p.success) return { ok: false, error: "Invalid status" };
  try {
    await q(`select public.set_order_status($1, $2::order_status, $3, $4)`, [p.data.orderId, p.data.status, p.data.note, staff.id]);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function updatePaymentStatus(orderId: string, status: string): Promise<ActionResult> {
  await requireStaff();
  const p = z.object({ orderId: uuid, status: z.enum(["unpaid", "pending_verification", "paid", "refunded"]) }).safeParse({ orderId, status });
  if (!p.success) return { ok: false, error: "Invalid payment status" };
  try {
    await q(`update orders set payment_status = $2::payment_status where id = $1`, [p.data.orderId, p.data.status]);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function saveSetting(key: string, value: unknown): Promise<ActionResult> {
  await requireAdmin();
  if (!(key in settingSchemas)) return { ok: false, error: "Unknown setting" };
  const parsed = settingSchemas[key as keyof typeof settingSchemas].safeParse(value);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  try {
    await q(`insert into settings (key, value, updated_at) values ($1, $2::jsonb, now())
             on conflict (key) do update set value = excluded.value, updated_at = now()`, [key, JSON.stringify(parsed.data)]);
  } catch (e) {
    return fail(e);
  }
  await refreshStorefront();
  return { ok: true };
}

// ======================= team (admin only) =======================
export async function setUserRole(email: string, role: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const p = z.object({ email: z.string().email(), role: z.enum(["customer", "staff", "admin"]) }).safeParse({ email, role });
  if (!p.success) return { ok: false, error: "Enter a valid email and role" };
  const target = await one<{ id: string }>(`select id from profiles where lower(email) = lower($1)`, [p.data.email.trim()]);
  if (!target) return { ok: false, error: "No account with that email. Ask them to create an account and sign in once first." };
  if (target.id === admin.id && p.data.role !== "admin") return { ok: false, error: "You can't remove your own admin access." };
  await q(`update profiles set role = $2::user_role where id = $1`, [target.id, p.data.role]);
  return { ok: true };
}

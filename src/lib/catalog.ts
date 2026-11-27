import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { one, q } from "@/lib/db";
import type {
  AcademicYear, Banner, Brand, BrowseFilters, BrowseResult, BundleItem, CatalogBundle, CatalogProduct,
  Category, PaymentMethod, ProductDetail, StoreSettings, Taxon,
} from "@/lib/types";

/**
 * Public catalog reads (published content only). Every function is cached with
 * the "catalog" tag, re-validated whenever an admin saves anything
 * (lib/admin/actions.ts → refreshStorefront), with a time-based fallback so
 * stock levels never go stale for long.
 */
const TAG = "catalog";
const REVALIDATE = 120;

function cached<A extends unknown[], R>(key: string, fn: (...args: A) => Promise<R>) {
  return unstable_cache(fn, [key], { tags: [TAG], revalidate: REVALIDATE });
}

const LIST_COLUMNS =
  "id, slug, sku, name_en, name_ar, short_description_en, short_description_ar, brand_id, brand_name, brand_slug, primary_category_id, product_type, audience, is_published, is_featured, is_best_seller, is_new_arrival, sales_count, created_at, option_names, base_price, price, compare_at_price, image_url, image_url_2, in_stock, has_variants";

// ---------------- browse ----------------
export const browseProducts = cached("browse", async (filters: BrowseFilters): Promise<BrowseResult> => {
  const row = await one<{ r: BrowseResult }>(`select public.browse_products($1::jsonb) as r`, [JSON.stringify(filters)]);
  return row!.r;
});

export const searchSuggestions = cached("suggest", async (term: string): Promise<CatalogProduct[]> => {
  if (term.trim().length < 2) return [];
  return q<CatalogProduct>(`select ${LIST_COLUMNS} from public.search_products($1, 8)`, [term]);
});

export const getProductsByIds = cached("by-ids", async (ids: string[]): Promise<CatalogProduct[]> => {
  if (!ids.length) return [];
  const rows = await q<CatalogProduct>(`select ${LIST_COLUMNS} from catalog_products where is_published and id = any($1::uuid[])`, [ids.slice(0, 60)]);
  return ids.map((id) => rows.find((r) => r.id === id)).filter(Boolean) as CatalogProduct[];
});

// ---------------- product detail ----------------
export const getProduct = cache(
  cached("product", async (slug: string): Promise<ProductDetail | null> => {
    const base = await one<CatalogProduct>(`select ${LIST_COLUMNS} from catalog_products where slug = $1 and is_published`, [slug]);
    if (!base) return null;
    const [full, images, variants, categories, years, specialties] = await Promise.all([
      one<Pick<ProductDetail, "description_en" | "description_ar" | "specifications" | "track_inventory" | "stock_qty" | "low_stock_threshold" | "allow_backorder">>(
        `select description_en, description_ar, specifications, track_inventory, stock_qty, low_stock_threshold, allow_backorder from products where id = $1`, [base.id]),
      q<{ url: string; alt: string | null }>(`select url, alt from product_images where product_id = $1 order by sort_order`, [base.id]),
      q<ProductDetail["variants"][number]>(
        `select id, sku, options, price, compare_at_price, stock_qty, image_url, is_active, sort_order
           from catalog_variants where product_id = $1 and is_active order by sort_order`, [base.id]),
      q<Taxon>(`select c.id, c.slug, c.name_en, c.name_ar from product_categories pc join categories c on c.id = pc.category_id
                 where pc.product_id = $1 and c.is_visible order by (c.id = $2) desc, c.sort_order`, [base.id, base.primary_category_id]),
      q<Taxon>(`select y.id, y.slug, y.name_en, y.name_ar from product_years py join academic_years y on y.id = py.year_id
                 where py.product_id = $1 and y.is_enabled order by y.number`, [base.id]),
      q<Taxon>(`select s.id, s.slug, s.name_en, s.name_ar from product_specialties ps join specialties s on s.id = ps.specialty_id
                 where ps.product_id = $1 and s.is_visible order by s.sort_order`, [base.id]),
    ]);
    return { ...base, ...full!, images, variants, categories, years, specialties };
  }),
);

export const getRelatedProducts = cached("related", async (productId: string, categoryIds: string[]): Promise<CatalogProduct[]> => {
  return q<CatalogProduct>(
    `with manual as (
       select related_id as id, sort_order as rank from related_products where product_id = $1
     ), same_cat as (
       select distinct pc.product_id as id, 1000 as rank from product_categories pc
       where pc.category_id = any($2::uuid[]) and pc.product_id <> $1
     ), picked as (
       select id, min(rank) as rank from (select * from manual union all select * from same_cat) x group by id
     )
     select ${LIST_COLUMNS.split(", ").map((c) => `c.${c}`).join(", ")}
       from picked p join catalog_products c on c.id = p.id
      where c.is_published
      order by p.rank, c.in_stock desc, c.sales_count desc
      limit 12`,
    [productId, categoryIds],
  );
});

/** Products linked in the dashboard (“Related products”), in both directions: items that are used together. */
export const getPairedProducts = cached("paired", async (productId: string): Promise<CatalogProduct[]> =>
  q<CatalogProduct>(
    `with pairs as (
       select related_id as id, sort_order from related_products where product_id = $1
       union
       select product_id as id, 1000 + sort_order from related_products where related_id = $1
     )
     select ${LIST_COLUMNS.split(", ").map((c) => `c.${c}`).join(", ")}
       from (select id, min(sort_order) as rank from pairs group by id) p join catalog_products c on c.id = p.id
      where c.is_published order by p.rank limit 12`, [productId]));

// ---------------- taxonomy ----------------
export const getYears = cached("years", async (): Promise<AcademicYear[]> =>
  q<AcademicYear>(`select * from academic_years where is_enabled order by sort_order, number`));

export const getYear = cache(async (slug: string) => (await getYears()).find((y) => y.slug === slug) ?? null);

export const getCategories = cached("categories", async (): Promise<Category[]> =>
  q<Category>(`select * from categories where is_visible order by sort_order, name_en`));

export const getSpecialties = cached("specialties", async (): Promise<Taxon[]> =>
  q<Taxon>(`select * from specialties where is_visible order by sort_order`));

export const getBrands = cached("brands", async (): Promise<Brand[]> =>
  q<Brand>(`select * from brands order by sort_order, name`));

export type TaxStat = { count: number; covers: string[] };
export const getTaxonomyCounts = cached("tax-counts", async () => {
  const rows = await q<{ kind: string; slug: string; products: number; covers: string[] | null }>(`select * from taxonomy_counts`);
  const map = { category: {} as Record<string, TaxStat>, specialty: {} as Record<string, TaxStat>, year: {} as Record<string, TaxStat> };
  rows.forEach((r) => {
    (map as Record<string, Record<string, TaxStat>>)[r.kind][r.slug] = { count: Number(r.products), covers: r.covers ?? [] };
  });
  return map;
});

// ---------------- bundles ----------------
export const getBundles = cached("bundles", async (opts: { yearSlug?: string; featured?: boolean; kind?: "kit" | "clinic_setup"; audience?: "student" | "dentist" } = {}): Promise<CatalogBundle[]> =>
  q<CatalogBundle>(
    `select * from catalog_bundles
      where is_published and ($1::text is null or year_slug = $1) and (not $2 or is_featured)
        and kind = coalesce($3, kind) and ($4::text is null or audience::text = $4 or audience = 'both')
      order by year_number nulls last, sort_order`,
    [opts.yearSlug ?? null, Boolean(opts.featured), opts.kind ?? null, opts.audience ?? null],
  ));

export type YearSubject = { id: string; year_id: string; slug: string; name_en: string; name_ar: string | null; description_en: string | null; image_url: string | null; products: number; covers: string[] };
export const getYearSubjects = cached("subjects", async (yearId: string): Promise<YearSubject[]> =>
  q<YearSubject>(
    `select s.id, s.year_id, s.slug, s.name_en, s.name_ar, s.description_en, s.image_url,
            (select count(*) from product_subjects ps join products p on p.id = ps.product_id and p.is_published where ps.subject_id = s.id) as products,
            array(select pi.url from product_subjects ps join products p on p.id = ps.product_id and p.is_published
                  join lateral (select url from product_images i where i.product_id = p.id order by sort_order limit 1) pi on true
                  where ps.subject_id = s.id order by p.is_featured desc, p.sales_count desc limit 3) as covers
       from year_subjects s where s.year_id = $1 order by s.sort_order`, [yearId]));

export type StoreLocation = { id: string; name_en: string; name_ar: string | null; address_en: string | null; phone: string | null; hours_en: string | null; lat: number; lng: number; maps_url: string | null; image_url: string | null };
export const getStoreLocations = cached("locations", async (): Promise<StoreLocation[]> =>
  q<StoreLocation>(`select id, name_en, name_ar, address_en, phone, hours_en, lat, lng, maps_url, image_url from store_locations where is_visible order by sort_order`));

export const getBundle = cache(cached("bundle", async (slug: string) => {
  const b = await one<CatalogBundle>(`select * from catalog_bundles where slug = $1 and is_published`, [slug]);
  if (!b) return null;
  const items = await q<{ id: string; quantity: number; product_id: string; variant_id: string | null; options: Record<string, string> | null }>(
    `select i.id, i.quantity, i.product_id, i.variant_id, v.options
       from bundle_items i left join product_variants v on v.id = i.variant_id
      where i.bundle_id = $1 order by i.sort_order`, [b.id]);
  const products = await getProductsByIds(items.map((i) => i.product_id));
  const resolved: BundleItem[] = items.map((i) => {
    const p = products.find((x) => x.id === i.product_id);
    return p ? { id: i.id, quantity: i.quantity, product: p, variant: i.variant_id && i.options ? { id: i.variant_id, options: i.options } : null } : null;
  }).filter(Boolean) as BundleItem[];
  return { bundle: b, items: resolved };
}));

export const getYearChecklist = cached("checklist", async (yearId: string) =>
  q<{ id: string; label_en: string; label_ar: string | null; product_id: string | null; product_slug: string | null }>(
    `select c.id, c.label_en, c.label_ar, c.product_id, p.slug as product_slug
       from year_checklist_items c left join products p on p.id = c.product_id and p.is_published
      where c.year_id = $1 order by c.sort_order`, [yearId]));

// ---------------- content & settings ----------------
export const getSettings = cached("settings", async () => {
  const rows = await q<{ key: string; value: unknown }>(`select key, value from settings where key not like 'private_%'`);
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, unknown>;
  return {
    store: (map.store ?? {}) as StoreSettings,
    announcement: (map.announcement ?? { enabled: false }) as { enabled: boolean; text_en: string; text_ar: string; href: string | null },
    checkout: (map.checkout ?? { email_required: false }) as { email_required: boolean },
    shipping: (map.shipping ?? {}) as { free_shipping_threshold: number | null },
    paymentMethods: ((map.payment_methods ?? []) as PaymentMethod[]),
    homeSections: (map.home_sections ?? {}) as Record<string, boolean>,
    metaPixel: (map.meta_pixel ?? { ids: [] }) as { ids: string[] },
    homeHero: (map.home_hero ?? {}) as { title_en?: string; title_ar?: string; subtitle_en?: string; subtitle_ar?: string; student_image?: string | null; dentist_image?: string | null; happy_clients?: number | null; rating?: number | null },
  };
});

export const getBanners = cached("banners", async (placement: string): Promise<Banner[]> =>
  q<Banner>(
    `select * from banners where placement = $1 and is_active
        and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())
      order by sort_order`, [placement]));

export type Feedback = { id: string; author: string | null; role_en: string | null; role_ar: string | null; quote: string | null; image_url: string | null };
export const getTestimonials = cached("testimonials", async (): Promise<Feedback[]> =>
  q<Feedback>(`select id, author, role_en, role_ar, quote, image_url from testimonials where is_visible order by sort_order`));

export const getGovernorates = cached("governorates", async () =>
  q<{ id: string; name_en: string; name_ar: string; shipping_fee: number | null }>(
    `select id, name_en, name_ar, shipping_fee from governorates where is_active order by sort_order`));

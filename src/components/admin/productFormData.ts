import "server-only";
import { one, q } from "@/lib/db";
import type { ProductFormData } from "./ProductForm";
import type { PickedProduct } from "./ui";

type Opt = { value: string; label: string; slug?: string };

export async function loadProductOptions() {
  const [brands, categories, years, specialties, types, subjects] = await Promise.all([
    q<Opt>(`select id as value, name as label from brands order by name`),
    q<Opt>(`select id as value, name_en as label, slug from categories order by sort_order`),
    q<Opt>(`select id as value, name_en as label from academic_years order by number`),
    q<Opt>(`select id as value, name_en as label from specialties order by sort_order`),
    q<{ product_type: string }>(`select distinct product_type from products where product_type is not null order by 1`),
    q<{ value: string; label: string; year_id: string }>(`select id as value, name_en as label, year_id from year_subjects order by sort_order`),
  ]);
  return { brands, categories, years, specialties, types: types.map((t) => t.product_type), subjects };
}

export const EMPTY_PRODUCT: ProductFormData = {
  id: null, slug: "", sku: null, name_en: "", name_ar: "", description_en: "", description_ar: "",
  short_description_en: "", short_description_ar: "", admin_notes: "", brand_id: null, product_type: "",
  price: 0, compare_at_price: null, cost_price: null, track_inventory: false, stock_qty: 0, low_stock_threshold: 3,
  allow_backorder: false, audience: "unassigned", is_published: false, is_featured: false, is_best_seller: false,
  is_new_arrival: true, bundle_eligible: true, specifications: [], option_names: [], images: [], variants: [],
  category_ids: [], primary_category_id: null, years: [], specialty_ids: [], subject_ids: [], related_ids: [],
};

export async function loadProduct(id: string): Promise<{ data: ProductFormData; related: PickedProduct[] } | null> {
  const p = await one<Record<string, unknown> & { id: string; primary_category_id: string | null }>(`select * from products where id = $1`, [id]);
  if (!p) return null;
  const [images, variants, cats, years, specs, related, subs] = await Promise.all([
    q<{ url: string }>(`select url from product_images where product_id = $1 order by sort_order`, [id]),
    q<ProductFormData["variants"][number]>(
      `select id, sku, options, price, compare_at_price, stock_qty, image_url, is_active from product_variants where product_id = $1 order by sort_order`, [id]),
    q<{ category_id: string }>(`select category_id from product_categories where product_id = $1`, [id]),
    q<{ year_id: string; is_essential: boolean }>(`select year_id, is_essential from product_years where product_id = $1`, [id]),
    q<{ specialty_id: string }>(`select specialty_id from product_specialties where product_id = $1`, [id]),
    q<PickedProduct>(
      `select p.id, coalesce(p.name_en, p.name_ar) as name, p.price, p.is_published as published,
              (select url from product_images i where i.product_id = p.id order by sort_order limit 1) as image
         from related_products r join products p on p.id = r.related_id
        where r.product_id = $1 order by r.sort_order`, [id]),
    q<{ subject_id: string }>(`select subject_id from product_subjects where product_id = $1`, [id]),
  ]);
  const catIds = cats.map((c) => c.category_id);
  const primary = p.primary_category_id;
  const s = (k: string) => (p[k] as string | null) ?? "";
  return {
    data: {
      id: p.id, slug: s("slug"), sku: p.sku as string | null, name_en: s("name_en"), name_ar: s("name_ar"),
      description_en: s("description_en"), description_ar: s("description_ar"),
      short_description_en: s("short_description_en"), short_description_ar: s("short_description_ar"),
      admin_notes: s("admin_notes"), brand_id: p.brand_id as string | null, product_type: s("product_type"),
      price: Number(p.price), compare_at_price: p.compare_at_price == null ? null : Number(p.compare_at_price),
      cost_price: p.cost_price == null ? null : Number(p.cost_price),
      track_inventory: Boolean(p.track_inventory), stock_qty: Number(p.stock_qty), low_stock_threshold: Number(p.low_stock_threshold),
      allow_backorder: Boolean(p.allow_backorder), audience: p.audience as ProductFormData["audience"],
      is_published: Boolean(p.is_published), is_featured: Boolean(p.is_featured), is_best_seller: Boolean(p.is_best_seller),
      is_new_arrival: Boolean(p.is_new_arrival), bundle_eligible: Boolean(p.bundle_eligible),
      specifications: (p.specifications as ProductFormData["specifications"]) ?? [],
      option_names: (p.option_names as string[]) ?? [],
      images: images.map((i) => i.url),
      variants,
      category_ids: primary ? [primary, ...catIds.filter((c) => c !== primary)] : catIds,
      primary_category_id: primary,
      years,
      specialty_ids: specs.map((x) => x.specialty_id),
      subject_ids: subs.map((x) => x.subject_id),
      related_ids: [],
    },
    related,
  };
}

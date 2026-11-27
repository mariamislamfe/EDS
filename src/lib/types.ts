export type Audience = "unassigned" | "student" | "dentist" | "both";
export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";

export interface CatalogProduct {
  id: string;
  slug: string;
  sku: string | null;
  name_en: string | null;
  name_ar: string | null;
  short_description_en: string | null;
  short_description_ar: string | null;
  brand_id: string | null;
  brand_name: string | null;
  brand_slug: string | null;
  primary_category_id: string | null;
  product_type: string | null;
  audience: Audience;
  is_published: boolean;
  is_featured: boolean;
  is_best_seller: boolean;
  is_new_arrival: boolean;
  sales_count: number;
  created_at: string;
  option_names: string[];
  base_price: number;
  price: number;
  compare_at_price: number | null;
  image_url: string | null;
  image_url_2: string | null;
  in_stock: boolean;
  has_variants: boolean;
}

export interface Variant {
  id: string;
  sku: string | null;
  options: Record<string, string>;
  price: number;
  compare_at_price: number | null;
  stock_qty: number | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface Taxon {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string | null;
  description_en?: string | null;
  description_ar?: string | null;
  image_url?: string | null;
  sort_order?: number;
}

export interface AcademicYear extends Taxon {
  number: number;
  tagline_en: string | null;
  tagline_ar: string | null;
  intro_en: string | null;
  intro_ar: string | null;
  hero_image_url: string | null;
  is_enabled: boolean;
}

export interface Category extends Taxon {
  parent_id: string | null;
  is_visible: boolean;
  show_on_home: boolean;
}

export interface Brand {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  is_featured: boolean;
}

export interface ProductDetail extends CatalogProduct {
  description_en: string | null;
  description_ar: string | null;
  specifications: { label_en: string; label_ar: string | null; value: string }[];
  track_inventory: boolean;
  stock_qty: number;
  low_stock_threshold: number;
  allow_backorder: boolean;
  images: { url: string; alt: string | null }[];
  variants: Variant[];
  categories: Taxon[];
  years: Taxon[];
  specialties: Taxon[];
}

export interface CatalogBundle {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  year_id: string | null;
  year_slug: string | null;
  year_name_en: string | null;
  year_name_ar: string | null;
  year_number: number | null;
  image_url: string | null;
  gallery: string[];
  pricing_mode: "fixed" | "sum_of_items";
  price: number | null;
  compare_at_price: number | null;
  discount_percent: number;
  effective_price: number;
  items_value: number;
  in_stock: boolean;
  item_count: number;
  is_published: boolean;
  is_featured: boolean;
  kind: "kit" | "clinic_setup";
  audience: Audience;
}

export interface BundleItem {
  id: string;
  quantity: number;
  product: Pick<CatalogProduct, "id" | "slug" | "name_en" | "name_ar" | "image_url" | "price" | "brand_name">;
  variant: { id: string; options: Record<string, string> } | null;
}

export interface BrowseFilters {
  q?: string;
  category?: string;
  brand?: string;
  year?: string;
  specialty?: string;
  subject?: string;
  audience?: "student" | "dentist";
  min_price?: string;
  max_price?: string;
  in_stock?: boolean;
  type?: string;
  flag?: "featured" | "best" | "new" | "sale";
  essential?: boolean;
  sort?: "featured" | "newest" | "price_asc" | "price_desc" | "best";
  page?: number;
  per_page?: number;
  ids?: string[];
}

export interface BrowseResult {
  items: CatalogProduct[];
  total: number;
  page: number;
  per_page: number;
  facets: {
    brands: { slug: string; name: string; count: number }[];
    price_min: number | null;
    price_max: number | null;
    in_stock: number;
    types: { value: string; count: number }[];
  };
}

export interface PaymentMethod {
  id: string;
  enabled: boolean;
  label_en: string;
  label_ar: string;
  instructions_en: string;
  instructions_ar: string;
}

export interface StoreSettings {
  name_en: string; name_ar: string;
  phone: string | null; whatsapp: string | null; email: string | null;
  address_en: string | null; address_ar: string | null;
  instagram: string | null; facebook: string | null;
  working_hours_en: string | null; working_hours_ar: string | null;
}

export interface Banner {
  id: string;
  placement: string;
  title_en: string | null; title_ar: string | null;
  subtitle_en: string | null; subtitle_ar: string | null;
  cta_label_en: string | null; cta_label_ar: string | null;
  cta_href: string | null;
  image_url: string | null;
}

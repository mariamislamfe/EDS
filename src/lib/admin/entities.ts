import { z } from "zod";

/**
 * Declarative config for the simple admin tables. The same config drives the
 * generic form UI (client) and the whitelist/validation of writes (server).
 */
export type FieldType = "text" | "textarea" | "number" | "boolean" | "select" | "image" | "datetime" | "slug" | "multiselect";
export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  optionsFrom?: "categories" | "brands" | "specialties" | "years" | "products";
  help?: string;
  dir?: "ltr" | "rtl";
  half?: boolean;
}
export interface EntityDef {
  table: string;
  title: string;
  singular: string;
  orderBy: { column: string; ascending?: boolean }[];
  columns: string[]; // fields shown in the list
  fields: FieldDef[];
  schema: z.ZodTypeAny;
  adminOnly?: boolean;
}

const slug = z.string().trim().min(1).max(90).regex(/^[a-z0-9؀-ۿ]+(?:-[a-z0-9؀-ۿ]+)*$/, "Use lowercase letters, numbers and dashes");
const optText = z.string().trim().max(4000).nullish().transform((v) => (v ? v : null));
const optUrl = z.string().trim().url().max(1000).nullish().or(z.literal("")).transform((v) => (v ? v : null));
const int = z.coerce.number().int().min(-100000).max(100000);
const money = z.coerce.number().min(0).max(100000000);
const optDate = z.string().nullish().transform((v) => (v ? new Date(v).toISOString() : null));

const taxonomyFields = (img = true): FieldDef[] => [
  { name: "name_en", label: "Name (English)", type: "text", required: true, half: true, dir: "ltr" },
  { name: "name_ar", label: "Name (Arabic)", type: "text", half: true, dir: "rtl" },
  { name: "slug", label: "URL slug", type: "slug", required: true, help: "Appears in the page address. Lowercase, dashes only.", dir: "ltr" },
  { name: "description_en", label: "Description (English)", type: "textarea", half: true, dir: "ltr" },
  { name: "description_ar", label: "Description (Arabic)", type: "textarea", half: true, dir: "rtl" },
  ...(img ? [{ name: "image_url", label: "Image", type: "image" as const }] : []),
  { name: "sort_order", label: "Sort order", type: "number", half: true, help: "Lower numbers appear first." },
  { name: "is_visible", label: "Visible on the storefront", type: "boolean", half: true },
];

export const ENTITIES = {
  categories: {
    table: "categories", title: "Categories", singular: "category",
    orderBy: [{ column: "sort_order" }, { column: "name_en" }],
    columns: ["name_en", "name_ar", "slug", "is_visible", "show_on_home"],
    fields: [
      ...taxonomyFields(),
      { name: "parent_id", label: "Parent category", type: "select", optionsFrom: "categories", help: "Optional. Products in a sub-category also appear in its parent." },
      { name: "show_on_home", label: "Feature on the homepage", type: "boolean" },
    ],
    schema: z.object({
      name_en: z.string().trim().min(1).max(120), name_ar: optText, slug,
      description_en: optText, description_ar: optText, image_url: optUrl,
      sort_order: int.default(0), is_visible: z.coerce.boolean(), show_on_home: z.coerce.boolean(),
      parent_id: z.string().uuid().nullish().or(z.literal("")).transform((v) => v || null),
    }),
  },
  specialties: {
    table: "specialties", title: "Specialties", singular: "specialty",
    orderBy: [{ column: "sort_order" }],
    columns: ["name_en", "name_ar", "slug", "is_visible"],
    fields: taxonomyFields(),
    schema: z.object({
      name_en: z.string().trim().min(1).max(120), name_ar: optText, slug,
      description_en: optText, description_ar: optText, image_url: optUrl,
      sort_order: int.default(0), is_visible: z.coerce.boolean(),
    }),
  },
  brands: {
    table: "brands", title: "Brands", singular: "brand",
    orderBy: [{ column: "sort_order" }, { column: "name" }],
    columns: ["name", "slug", "is_featured"],
    fields: [
      { name: "name", label: "Name", type: "text", required: true, half: true },
      { name: "slug", label: "URL slug", type: "slug", required: true, half: true, dir: "ltr" },
      { name: "logo_url", label: "Logo", type: "image" },
      { name: "sort_order", label: "Sort order", type: "number", half: true },
      { name: "is_featured", label: "Featured brand", type: "boolean", half: true },
    ],
    schema: z.object({ name: z.string().trim().min(1).max(120), slug, logo_url: optUrl, sort_order: int.default(0), is_featured: z.coerce.boolean() }),
  },
  coupons: {
    table: "coupons", title: "Coupon codes", singular: "coupon",
    orderBy: [{ column: "created_at", ascending: false }],
    columns: ["code", "discount_type", "value", "used_count", "is_active", "ends_at"],
    fields: [
      { name: "code", label: "Code", type: "text", required: true, half: true, dir: "ltr", help: "Customers type this at checkout (not case-sensitive)." },
      { name: "discount_type", label: "Discount type", type: "select", required: true, half: true, options: [{ value: "percent", label: "Percentage (%)" }, { value: "fixed", label: "Fixed amount (EGP)" }] },
      { name: "value", label: "Value", type: "number", required: true, half: true },
      { name: "min_subtotal", label: "Minimum order (EGP)", type: "number", half: true },
      { name: "max_uses", label: "Maximum uses", type: "number", half: true, help: "Leave empty for unlimited." },
      { name: "is_active", label: "Active", type: "boolean", half: true },
      { name: "starts_at", label: "Starts", type: "datetime", half: true },
      { name: "ends_at", label: "Ends", type: "datetime", half: true },
    ],
    schema: z.object({
      code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/).transform((s) => s.toUpperCase()),
      discount_type: z.enum(["percent", "fixed"]), value: z.coerce.number().positive().max(1000000),
      min_subtotal: money.default(0), max_uses: z.coerce.number().int().positive().nullish().or(z.literal("")).transform((v) => (v ? Number(v) : null)),
      is_active: z.coerce.boolean(), starts_at: optDate, ends_at: optDate,
    }),
  },
  campaigns: {
    table: "campaigns", title: "Discount campaigns", singular: "campaign",
    orderBy: [{ column: "created_at", ascending: false }],
    columns: ["name", "discount_type", "value", "scope", "is_active", "ends_at"],
    fields: [
      { name: "name", label: "Campaign name (internal)", type: "text", required: true },
      { name: "discount_type", label: "Discount type", type: "select", required: true, half: true, options: [{ value: "percent", label: "Percentage (%)" }, { value: "fixed", label: "Fixed amount off each item (EGP)" }] },
      { name: "value", label: "Value", type: "number", required: true, half: true },
      { name: "scope", label: "Applies to", type: "select", required: true, options: [
        { value: "all", label: "All products" }, { value: "category", label: "Selected categories" }, { value: "brand", label: "Selected brands" },
        { value: "specialty", label: "Selected specialties" }, { value: "year", label: "Selected academic years" },
        { value: "audience", label: "An audience (students / dentists)" }, { value: "products", label: "Selected products" }] },
      { name: "scope_ids", label: "Selected items", type: "multiselect", help: "Pick the categories/brands/specialties/years/products matching “Applies to”." },
      { name: "scope_audience", label: "Audience", type: "select", options: [{ value: "student", label: "Students" }, { value: "dentist", label: "Dentists" }], help: "Only for “An audience”." },
      { name: "is_active", label: "Active", type: "boolean" },
      { name: "starts_at", label: "Starts", type: "datetime", half: true },
      { name: "ends_at", label: "Ends", type: "datetime", half: true },
    ],
    schema: z.object({
      name: z.string().trim().min(1).max(120), discount_type: z.enum(["percent", "fixed"]), value: z.coerce.number().positive().max(1000000),
      scope: z.enum(["all", "category", "brand", "specialty", "year", "audience", "products"]),
      scope_ids: z.array(z.string().uuid()).max(500).default([]),
      scope_audience: z.enum(["student", "dentist"]).nullish().or(z.literal("")).transform((v) => v || null),
      is_active: z.coerce.boolean(), starts_at: optDate, ends_at: optDate,
    }),
  },
  banners: {
    table: "banners", title: "Banners", singular: "banner",
    orderBy: [{ column: "placement" }, { column: "sort_order" }],
    columns: ["placement", "title_en", "is_active", "ends_at"],
    fields: [
      { name: "placement", label: "Where it shows", type: "select", required: true, options: [
        { value: "home_hero", label: "Homepage hero slideshow (image only — the hero text stays the same)" },
        { value: "home_promo", label: "Homepage promotional banner" }, { value: "students_hero", label: "Students page hero" },
        { value: "dentists_hero", label: "Dentists page hero" }] },
      { name: "title_en", label: "Title (English)", type: "text", half: true, dir: "ltr" },
      { name: "title_ar", label: "Title (Arabic)", type: "text", half: true, dir: "rtl" },
      { name: "subtitle_en", label: "Text (English)", type: "textarea", half: true, dir: "ltr" },
      { name: "subtitle_ar", label: "Text (Arabic)", type: "textarea", half: true, dir: "rtl" },
      { name: "cta_label_en", label: "Button label (English)", type: "text", half: true, dir: "ltr" },
      { name: "cta_label_ar", label: "Button label (Arabic)", type: "text", half: true, dir: "rtl" },
      { name: "cta_href", label: "Button link", type: "text", dir: "ltr", help: "A page on this site, e.g. /students/first-year" },
      { name: "image_url", label: "Image", type: "image" },
      { name: "sort_order", label: "Sort order", type: "number", half: true },
      { name: "is_active", label: "Active", type: "boolean", half: true },
      { name: "starts_at", label: "Starts", type: "datetime", half: true },
      { name: "ends_at", label: "Ends", type: "datetime", half: true },
    ],
    schema: z.object({
      placement: z.enum(["home_hero", "home_promo", "students_hero", "dentists_hero"]),
      title_en: optText, title_ar: optText, subtitle_en: optText, subtitle_ar: optText,
      cta_label_en: optText, cta_label_ar: optText,
      cta_href: z.string().trim().max(300).regex(/^(\/|https?:\/\/)/).nullish().or(z.literal("")).transform((v) => v || null),
      image_url: optUrl, sort_order: int.default(0), is_active: z.coerce.boolean(), starts_at: optDate, ends_at: optDate,
    }),
  },
  testimonials: {
    table: "testimonials", title: "Customer feedback", singular: "feedback",
    orderBy: [{ column: "sort_order" }],
    columns: ["author", "quote", "is_visible"],
    fields: [
      { name: "image_url", label: "Feedback photo / screenshot", type: "image", help: "e.g. a screenshot of a WhatsApp message. Shown in a fixed 4:5 frame with the site's colours, so every card matches." },
      { name: "author", label: "Customer name", type: "text", help: "Optional. Only publish real feedback you have permission to share." },
      { name: "role_en", label: "Role (English)", type: "text", half: true, dir: "ltr", help: "e.g. 3rd-year student" },
      { name: "role_ar", label: "Role (Arabic)", type: "text", half: true, dir: "rtl" },
      { name: "quote", label: "Quote (optional when there's a photo)", type: "textarea" },
      { name: "sort_order", label: "Sort order", type: "number", half: true },
      { name: "is_visible", label: "Visible", type: "boolean", half: true },
    ],
    schema: z.object({
      image_url: optUrl, author: optText, role_en: optText, role_ar: optText, quote: optText,
      sort_order: int.default(0), is_visible: z.coerce.boolean(),
    }).refine((v) => v.image_url || v.quote, { message: "Add a photo or a quote", path: ["image_url"] }),
  },
  store_locations: {
    table: "store_locations", title: "Store branches", singular: "branch",
    orderBy: [{ column: "sort_order" }],
    columns: ["name_en", "address_en", "phone", "is_visible"],
    fields: [
      { name: "name_en", label: "Branch name (English)", type: "text", required: true, half: true, dir: "ltr" },
      { name: "name_ar", label: "Branch name (Arabic)", type: "text", half: true, dir: "rtl" },
      { name: "address_en", label: "Address (English)", type: "text", half: true, dir: "ltr" },
      { name: "address_ar", label: "Address (Arabic)", type: "text", half: true, dir: "rtl" },
      { name: "phone", label: "Phone", type: "text", half: true, dir: "ltr" },
      { name: "hours_en", label: "Working hours", type: "text", half: true, dir: "ltr" },
      { name: "maps_url", label: "Google Maps link", type: "text", dir: "ltr", help: "Open the branch in Google Maps → Share → Copy link, and paste it here. Visitors who tap the pin go there." },
      { name: "lat", label: "Latitude", type: "number", required: true, half: true, help: "Where the pin sits on the map. In Google Maps, right-click the shop: the first number." },
      { name: "lng", label: "Longitude", type: "number", required: true, half: true, help: "The second number." },
      { name: "image_url", label: "Shop photo (optional)", type: "image" },
      { name: "sort_order", label: "Sort order", type: "number", half: true },
      { name: "is_visible", label: "Show on the map", type: "boolean", half: true },
    ],
    schema: z.object({
      name_en: z.string().trim().min(1).max(120), name_ar: optText, address_en: optText, address_ar: optText,
      phone: optText, hours_en: optText, maps_url: optUrl,
      lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180),
      image_url: optUrl, sort_order: int.default(0), is_visible: z.coerce.boolean(),
    }),
  },
  governorates: {
    table: "governorates", title: "Shipping by governorate", singular: "governorate",
    orderBy: [{ column: "sort_order" }],
    columns: ["name_en", "name_ar", "shipping_fee", "is_active"],
    fields: [
      { name: "name_en", label: "Name (English)", type: "text", required: true, half: true, dir: "ltr" },
      { name: "name_ar", label: "Name (Arabic)", type: "text", required: true, half: true, dir: "rtl" },
      { name: "shipping_fee", label: "Shipping fee (EGP)", type: "number", help: "Leave empty to confirm shipping by phone for this governorate." },
      { name: "sort_order", label: "Sort order", type: "number", half: true },
      { name: "is_active", label: "Deliver here", type: "boolean", half: true },
    ],
    schema: z.object({
      name_en: z.string().trim().min(1).max(80), name_ar: z.string().trim().min(1).max(80),
      shipping_fee: z.union([z.literal(""), z.null(), z.undefined(), money]).transform((v) => (v === "" || v == null ? null : Number(v))),
      sort_order: int.default(0), is_active: z.coerce.boolean(),
    }),
  },
} satisfies Record<string, EntityDef>;

export type EntityKey = keyof typeof ENTITIES;
export const isEntityKey = (k: string): k is EntityKey => k in ENTITIES;

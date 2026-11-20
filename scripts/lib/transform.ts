/**
 * Pure transform: Wuilt "all products" CSV export -> EDS catalog records.
 * No network or database access, so it can run as a dry run.
 *
 * Rules (see README "Product import"):
 * - Product names, prices, descriptions, SKUs and image URLs are preserved.
 * - Only formatting is cleaned (zero-width chars, stray whitespace, inline styles/classes).
 * - Audience / academic year are assigned ONLY when a collection name states the year.
 *   Everything else stays `unassigned` for admin review.
 */
import { parse } from "csv-parse/sync";
import sanitizeHtml from "sanitize-html";

export type CsvRow = Record<string, string>;

export interface VariantRecord {
  options: Record<string, string>;
  price: number;
  compare_at_price: number | null;
  cost_price: number | null;
  stock_qty: number | null; // null = not tracked ("Available" in Wuilt)
  image_url: string | null;
  sku: string | null;
  sort_order: number;
}

export interface ProductRecord {
  legacy_handle: string;
  slug: string;
  sku: string | null;
  name_en: string | null;
  name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  short_description_en: string | null;
  short_description_ar: string | null;
  admin_notes: string | null;
  brand: string | null;
  price: number;
  compare_at_price: number | null;
  cost_price: number | null;
  track_inventory: boolean;
  stock_qty: number;
  audience: "unassigned" | "student";
  is_published: boolean;
  option_names: string[];
  source_collections: string[];
  category_slugs: string[];
  year_slugs: string[];
  specialty_slugs: string[];
  images: string[];
  variants: VariantRecord[];
  specifications: { label_en: string; label_ar: string | null; value: string }[];
  created_at: string | null;
  updated_at: string | null;
}

export interface ImportIssue {
  handle: string;
  title: string;
  kind: string;
  detail?: string;
}

// ---------------------------------------------------------------------
// Collection mappings (source collection name -> EDS taxonomy)
// ---------------------------------------------------------------------
export const COLLECTION_TO_CATEGORY: Record<string, string[]> = {
  "Opreative Instrument": ["operative-instruments"],
  "L2 Opreative": ["operative-instruments"],
  "Fixed Instrument": ["fixed-prosthodontics"],
  "Delta Level 3 - Fixed I": ["fixed-prosthodontics"],
  "Endo instrument": ["endodontic-supplies"],
  "Endodontics instruments": ["endodontic-supplies"],
  "Endo-orgnization": ["endodontic-supplies"],
  "High Copy Files": ["endodontic-supplies"],
  "GP & Paper Point": ["endodontic-supplies"],
  "Endo-Disposable": ["disposables", "endodontic-supplies"],
  "Disposable": ["disposables"],
  "Hand Instrumentss": ["hand-instruments"],
  "Isolation": ["isolation"],
  "Polishing": ["polishing"],
  "Countour": ["matrices"],
  "Composite": ["composites"],
  "Burs": ["burs"],
  "L2 burs": ["burs"],
  "Routary Instrument": ["handpieces"],
  "L2 - High Speed Contra": ["handpieces"],
  "devices": ["equipment"],
  "مجموعة منتجات Sinirgia": ["equipment"],
  "تحميض": ["radiology"],
  "Cast": ["casts-teeth"],
  "Ortho Instroment": ["orthodontic-instruments"],
  "L2 - Boxs": ["boxes-organizers"],
};

/** Only collections whose name states an academic year. */
export const COLLECTION_TO_YEAR: Record<string, string> = {
  "Collection 1sr Year": "first-year",
  "Collection 1sr Year, Level 1": "first-year",
  "مجموعة سنة أولى": "first-year",
  "Collection 2nd Year": "second-year",
  "L2 Opreative": "second-year",
  "L2 burs": "second-year",
  "L2 - High Speed Contra": "second-year",
  "L2 - Boxs": "second-year",
  "Delta Level 3 - Fixed I": "third-year",
  "Fixed IV Package - Delta University": "fourth-year",
};

/** Collections that name a clinical discipline. */
export const COLLECTION_TO_SPECIALTY: Record<string, string> = {
  "Endo instrument": "endodontics",
  "Endodontics instruments": "endodontics",
  "Endo-orgnization": "endodontics",
  "High Copy Files": "endodontics",
  "GP & Paper Point": "endodontics",
  "Ortho Instroment": "orthodontics",
  "Fixed Instrument": "prosthodontics",
  "Delta Level 3 - Fixed I": "prosthodontics",
  "Opreative Instrument": "restorative",
  "L2 Opreative": "restorative",
  "Composite": "restorative",
  "Polishing": "restorative",
  "Countour": "restorative",
};

/** Collections that carry no catalog meaning (kept in source_collections only). */
export const IGNORED_COLLECTIONS = new Set(["L2 Remove", "gdfgdfgf"]);

/**
 * Brand names that appear verbatim in product titles. A brand is only set when
 * one of these words is in the title — nothing is guessed beyond that.
 */
const KNOWN_BRANDS: [RegExp, string][] = [
  [/\bwoodpecker\b/i, "Woodpecker"],
  [/\bmani\b/i, "Mani"],
  [/\blascod\b/i, "Lascod"],
  [/\btor[\s-]?vm\b/i, "TOR VM"],
  [/\bcavex\b/i, "Cavex"],
  [/\bzhermack\b/i, "Zhermack"],
  [/\bbms\b/i, "BMS"],
  [/\beighteeth\b/i, "Eighteeth"],
  [/\bsinirgia\b/i, "Sinirgia"],
  [/\bmeta\b/i, "Meta"],
  [/\bbisco\b/i, "Bisco"],
  [/\bivoclar\b/i, "Ivoclar"],
  [/\bshofu\b/i, "SHOFU"],
  [/\bdentkist\b/i, "Dentkist"],
  [/\bhandae\b/i, "HanDae"],
  [/\bcoxo\b/i, "COXO"],
  [/\bacrostone\b|\bacrestone\b/i, "Acrostone"],
  [/\bprevest\b/i, "Prevest"],
  [/\bmac\b/i, "MAC"],
  [/\bdentex\b/i, "Dentex"],
  [/\bcentrix\b/i, "Centrix"],
  [/\bgersy\b/i, "Gersy"],
  [/\bmediclus\b/i, "Mediclus"],
  [/\bkenda\b/i, "KENDA"],
  [/\bflamingo\b/i, "Flamingo"],
  [/\brotex\b/i, "Rotex"],
  [/\bdentac\b/i, "Dentac"],
  [/\bbomedent\b/i, "Bomedent"],
  [/\bwismy\b/i, "Wismy"],
  [/\bnic®?\b/i, "NIC"],
  [/\beve\b/i, "EVE"],
  [/\bcicada\b/i, "CICADA"],
  [/\binkbird\b/i, "Inkbird"],
  [/\bapple\b/i, "Apple"],
  [/\bbeing\b/i, "Being"],
  [/\bstrong\b/i, "Strong"],
  [/\bkitan\b/i, "Kitan"],
  [/\bartpharmadent\b/i, "Artpharmadent"],
];

// ---------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------
const ZERO_WIDTH = /[​-‏⁠﻿]/g;
const ARABIC = /[؀-ۿ]/;
const LATIN = /[A-Za-z]/;

export function cleanText(s: string | undefined | null): string {
  return (s ?? "").replace(ZERO_WIDTH, "").replace(/\s+/g, " ").trim();
}

function isArabicDominant(s: string): boolean {
  const ar = (s.match(/[؀-ۿ]/g) ?? []).length;
  const la = (s.match(/[A-Za-z]/g) ?? []).length;
  return ar > la;
}

export function slugify(input: string): string {
  const s = input
    .replace(ZERO_WIDTH, "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[®™]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9؀-ۿ]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return s.slice(0, 90) || "product";
}

function num(v: string | undefined): number | null {
  const t = cleanText(v);
  if (!t) return null;
  const n = Number(t.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Wuilt splits collections with "," but some names contain ", " (comma + space). */
export function splitCollections(v: string): string[] {
  return (v ?? "")
    .split(/,(?! )/)
    .map((s) => cleanText(s))
    .filter(Boolean);
}

const SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "ul", "ol", "li", "strong", "b", "em", "i", "h2", "h3", "h4", "hr", "table", "tbody", "tr", "td", "th"],
  allowedAttributes: { "*": ["dir"] },
  exclusiveFilter: (frame) =>
    ["p", "li", "h2", "h3", "h4", "strong"].includes(frame.tag) && !frame.text.replace(/ /g, " ").trim(),
  textFilter: (text) => text.replace(ZERO_WIDTH, ""),
};

/** Lines copied from a competitor product page (price/shipping/seller widgets). */
const SCRAPED_NOISE = [/dentacarts/i, /^\s*[\d,]+\s*egp\s*$/i, /free shipping on orders/i, /^select seller$/i, /^colour$/i, /^white$/i, /^1$/];

function plainToHtml(text: string): string {
  const lines = text.replace(ZERO_WIDTH, "").split(/\r?\n/).map((l) => l.trim());
  const out: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) out.push(`<ul>${list.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>`);
    list = [];
  };
  for (const raw of lines) {
    const line = raw.replace(/^[-•*]\s*/, "");
    if (!line) { flush(); continue; }
    if (/^[-•*]/.test(raw) || (raw !== line)) { list.push(line); continue; }
    flush();
    out.push(`<p>${escapeHtml(line)}</p>`);
  }
  flush();
  return out.join("");
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function htmlToText(html: string) {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ").replace(/&gt;/g, ">").replace(/&lt;/g, "<")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();
}

/**
 * Descriptions on the old store sometimes hold staff notes (e.g. "250",
 * "1000 insted of 1100", "المصري ب 180"). Those are moved to admin_notes so
 * they are kept but never shown to customers.
 */
function looksLikeInternalNote(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/^\d+([.,]\d+)?$/.test(t)) return true;
  if (/insted of|instead of/i.test(t) && t.length < 60) return true;
  if (/^المصري ب\s*\d+/.test(t)) return true;
  // text made only of "<label> -> <number>" price notes
  if (/->/.test(t) && t.length < 200 && t.replace(/[^>]*?-\s*>\s*\d+([.,]\d+)?/g, "").trim().length < 3) return true;
  return false;
}

export function cleanDescription(raw: string, issues: ImportIssue[], ctx: { handle: string; title: string }) {
  const src = (raw ?? "").replace(ZERO_WIDTH, "").trim();
  if (!src) return { html: null as string | null, note: null as string | null };
  const isHtml = /<\/?[a-z][\s\S]*>/i.test(src);

  let html: string;
  if (isHtml) {
    html = sanitizeHtml(src, SANITIZE);
  } else {
    const lines = src.split(/\r?\n/);
    const kept = lines.filter((l) => !SCRAPED_NOISE.some((re) => re.test(l.trim())));
    // drop consecutive duplicate lines (scraped image alt text)
    const dedup = kept.filter((l, i) => !(l.trim() && kept[i - 1]?.trim() === l.trim()));
    if (dedup.length !== lines.length) {
      issues.push({ ...ctx, kind: "description_cleaned", detail: `Removed ${lines.length - dedup.length} copied page-widget lines (price/shipping/seller text)` });
    }
    html = plainToHtml(dedup.join("\n"));
  }
  const text = htmlToText(html);
  if (looksLikeInternalNote(text)) {
    issues.push({ ...ctx, kind: "description_is_internal_note", detail: `Moved to admin notes: "${text.slice(0, 80)}"` });
    return { html: null, note: text };
  }
  if (!text) return { html: null, note: null };
  return { html, note: null };
}

function detectBrand(title: string): string | null {
  for (const [re, name] of KNOWN_BRANDS) if (re.test(title)) return name;
  return null;
}

// ---------------------------------------------------------------------
// main transform
// ---------------------------------------------------------------------
export function parseCsv(content: string): CsvRow[] {
  return parse(content, { columns: true, bom: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true });
}

export function transform(rows: CsvRow[]) {
  const issues: ImportIssue[] = [];
  const groups = new Map<string, CsvRow[]>();
  for (const r of rows) {
    const h = r["Handle"] ?? "";
    if (!groups.has(h)) groups.set(h, []);
    groups.get(h)!.push(r);
  }

  const products: ProductRecord[] = [];
  const usedSlugs = new Set<string>();
  const collectionStats = new Map<string, number>();

  for (const [handle, group] of groups) {
    const head = group.find((r) => cleanText(r["Title"])) ?? group[0];
    const title = cleanText(head["Title"]);
    const ctx = { handle, title };
    if (!title) { issues.push({ ...ctx, kind: "skipped_no_title" }); continue; }

    // names
    const arabicTitle = isArabicDominant(title);
    const name_en = arabicTitle && !LATIN.test(title) ? null : title;
    const name_ar = arabicTitle ? title : null;

    // slug
    let base = slugify(LATIN.test(handle) && !ARABIC.test(handle) ? handle : title);
    let slug = base;
    for (let i = 2; usedSlugs.has(slug); i++) slug = `${base}-${i}`;
    usedSlugs.add(slug);

    // description
    const { html, note } = cleanDescription(head["Description"] ?? "", issues, ctx);
    const descIsArabic = html ? isArabicDominant(htmlToText(html)) : false;
    const seo = cleanText(head["SEO Description"]);
    const seoUseful = seo && seo.toLowerCase() !== title.toLowerCase() ? seo : null;
    if (!html) issues.push({ ...ctx, kind: "missing_description" });

    // images (product gallery + any variant images not already in it)
    const images: string[] = [];
    const addImg = (u: string) => {
      const url = u.trim();
      if (/^https?:\/\//.test(url) && !images.includes(url)) images.push(url);
    };
    (head["Images"] ?? "").split(/\s+/).forEach(addImg);
    group.forEach((r) => addImg(r["Variant Image"] ?? ""));
    if (!images.length) issues.push({ ...ctx, kind: "missing_images" });

    // options & variants
    const optionNames: string[] = [];
    for (const k of ["Option1 Name", "Option2 Name", "Option3 Name"]) {
      const n = cleanText(head[k]);
      if (n) optionNames.push(n);
    }
    const priceOf = (r: CsvRow) => {
      const regular = num(r["Regular Price"]);
      const sale = num(r["Sale Price"]);
      if (regular == null) return null;
      if (sale != null && sale < regular) return { price: sale, compare: regular };
      return { price: regular, compare: null };
    };
    const stockOf = (r: CsvRow): number | null => {
      const q = cleanText(r["Quantity"]);
      if (!q || /^available$/i.test(q)) return null;
      const n = Number(q);
      return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : null;
    };

    const variants: VariantRecord[] = [];
    if (optionNames.length) {
      group.forEach((r, i) => {
        const opts: Record<string, string> = {};
        optionNames.forEach((n, j) => {
          const v = cleanText(r[`Option${j + 1} Value`]);
          if (v) opts[n] = v;
        });
        const pr = priceOf(r);
        if (!pr) { issues.push({ ...ctx, kind: "variant_without_price", detail: JSON.stringify(opts) }); return; }
        const key = JSON.stringify(opts);
        if (variants.some((v) => JSON.stringify(v.options) === key)) {
          issues.push({ ...ctx, kind: "duplicate_variant_skipped", detail: key });
          return;
        }
        variants.push({
          options: opts, price: pr.price, compare_at_price: pr.compare, cost_price: num(r["Cost"]),
          stock_qty: stockOf(r), image_url: cleanText(r["Variant Image"]) || null,
          sku: cleanText(r["SKU"]) || null, sort_order: i,
        });
      });
    }

    // "Attribute" columns: a choice with no price difference (e.g. scalpel blade number)
    const attrName = cleanText(head["Attribute1 Name"]);
    const attrValues = splitCollections(head["Attribute1 Values"] ?? "");
    const specifications: ProductRecord["specifications"] = [];
    if (attrName && attrValues.length) {
      if (!optionNames.length) {
        const pr = priceOf(head)!;
        optionNames.push(attrName);
        attrValues.forEach((v, i) =>
          variants.push({ options: { [attrName]: v }, price: pr.price, compare_at_price: pr.compare,
            cost_price: num(head["Cost"]), stock_qty: stockOf(head), image_url: null, sku: null, sort_order: i }));
        issues.push({ ...ctx, kind: "attribute_as_variants", detail: `"${attrName}": ${attrValues.join(", ")} became selectable options at the same price` });
      } else {
        specifications.push({ label_en: attrName, label_ar: null, value: attrValues.join(", ") });
      }
    }

    // product-level price/stock
    const headPrice = priceOf(head);
    let price: number, compare: number | null;
    if (variants.length) {
      const cheapest = [...variants].sort((a, b) => a.price - b.price)[0];
      price = cheapest.price; compare = cheapest.compare_at_price;
    } else if (headPrice) {
      price = headPrice.price; compare = headPrice.compare;
    } else {
      issues.push({ ...ctx, kind: "skipped_no_price" });
      continue;
    }
    const headStock = stockOf(head);
    const track_inventory = !variants.length && headStock != null;
    if (variants.length && new Set(variants.map((v) => v.stock_qty === null)).size > 1) {
      issues.push({ ...ctx, kind: "mixed_stock_tracking", detail: "Some options have a stock count, others were marked 'Available' (untracked)" });
    }
    if ((track_inventory && headStock === 0) || (variants.length && variants.every((v) => v.stock_qty === 0))) {
      issues.push({ ...ctx, kind: "out_of_stock" });
    }

    // collections -> taxonomy
    const collections = splitCollections(head["Collections"] ?? "");
    collections.forEach((c) => collectionStats.set(c, (collectionStats.get(c) ?? 0) + 1));
    const category_slugs = [...new Set(collections.flatMap((c) => COLLECTION_TO_CATEGORY[c] ?? []))];
    const year_slugs = [...new Set(collections.map((c) => COLLECTION_TO_YEAR[c]).filter(Boolean))];
    const specialty_slugs = [...new Set(collections.map((c) => COLLECTION_TO_SPECIALTY[c]).filter(Boolean))];
    const unknown = collections.filter((c) => !COLLECTION_TO_CATEGORY[c] && !COLLECTION_TO_YEAR[c] && !IGNORED_COLLECTIONS.has(c));
    if (unknown.length) issues.push({ ...ctx, kind: "unmapped_collection", detail: unknown.join(" | ") });
    if (!collections.length) issues.push({ ...ctx, kind: "no_collections" });
    if (!category_slugs.length) issues.push({ ...ctx, kind: "needs_category" });

    const brand = detectBrand(title);
    const sku = cleanText(head["SKU"]) || null;
    if (title !== (head["Title"] ?? "")) {
      const rawTitle = head["Title"] ?? "";
      if (rawTitle.replace(ZERO_WIDTH, "").trim() !== rawTitle.trim() || /\s{2,}|\n/.test(rawTitle.trim()))
        issues.push({ ...ctx, kind: "title_whitespace_cleaned" });
    }

    products.push({
      legacy_handle: handle,
      slug,
      sku,
      name_en,
      name_ar,
      description_en: html && !descIsArabic ? html : null,
      description_ar: html && descIsArabic ? html : null,
      short_description_en: seoUseful && !isArabicDominant(seoUseful) ? seoUseful : null,
      short_description_ar: seoUseful && isArabicDominant(seoUseful) ? seoUseful : null,
      admin_notes: note,
      brand,
      price,
      compare_at_price: compare,
      cost_price: variants.length ? null : num(head["Cost"]),
      track_inventory,
      stock_qty: headStock ?? 0,
      audience: year_slugs.length ? "student" : "unassigned",
      is_published: cleanText(head["Status"]).toUpperCase() === "ACTIVE",
      option_names: optionNames,
      source_collections: collections,
      category_slugs,
      year_slugs,
      specialty_slugs,
      images,
      variants,
      specifications,
      created_at: cleanText(head["Created"]) || null,
      updated_at: cleanText(head["Updated"]) || null,
    });
  }

  return { products, issues, collectionStats };
}

/** Human-readable data-quality report (Markdown). */
export function buildReport(result: ReturnType<typeof transform>, sourceName: string, rowCount: number) {
  const { products, issues, collectionStats } = result;
  const by = (k: string) => issues.filter((i) => i.kind === k);
  const list = (items: ImportIssue[], max = 400) =>
    items.slice(0, max).map((i) => `- ${i.title}${i.detail ? ` — ${i.detail}` : ""}`).join("\n") || "- none";
  const published = products.filter((p) => p.is_published).length;
  const students = products.filter((p) => p.audience === "student");
  const brands = new Map<string, number>();
  products.forEach((p) => p.brand && brands.set(p.brand, (brands.get(p.brand) ?? 0) + 1));
  const years = new Map<string, number>();
  products.forEach((p) => p.year_slugs.forEach((y) => years.set(y, (years.get(y) ?? 0) + 1)));

  return `# Product import report

Source: \`${sourceName}\` — ${rowCount} CSV rows → **${products.length} products** (${published} published, ${products.length - published} drafts), ${products.reduce((n, p) => n + p.variants.length, 0)} variants.

## What was assigned automatically
- **Academic years** were assigned only where a collection name states the year. ${students.length} products → audience *Student*.
${[...years].map(([y, n]) => `  - ${y}: ${n}`).join("\n")}
- **Audience for the other ${products.length - students.length} products is \`unassigned\`** — the CSV doesn't say whether they're for students, dentists or both. Review them in **Admin → Products → filter "Needs review"** (bulk actions available).
- **Brand** was set for ${products.filter((p) => p.brand).length} products where a brand name appears in the product title (${[...brands].map(([b, n]) => `${b} ${n}`).join(", ")}). ${products.filter((p) => !p.brand).length} products have no brand.

## Collection mapping
| Source collection | Products | → Category | → Year | → Specialty |
|---|---|---|---|---|
${[...collectionStats].sort((a, b) => b[1] - a[1]).map(([c, n]) =>
  `| ${c} | ${n} | ${(COLLECTION_TO_CATEGORY[c] ?? []).join(", ") || (IGNORED_COLLECTIONS.has(c) ? "_ignored_" : "—")} | ${COLLECTION_TO_YEAR[c] ?? "—"} | ${COLLECTION_TO_SPECIALTY[c] ?? "—"} |`).join("\n")}

## Needs attention
### Missing images (${by("missing_images").length})
${list(by("missing_images"))}

### No category (${by("needs_category").length}) — no collection mapped to a category
${list(by("needs_category"))}

### Out of stock in the export (${by("out_of_stock").length})
${list(by("out_of_stock"))}

### Mixed stock tracking (${by("mixed_stock_tracking").length})
${list(by("mixed_stock_tracking"))}

### Descriptions moved to internal admin notes (${by("description_is_internal_note").length})
These looked like staff notes (prices / numbers), not customer copy.
${list(by("description_is_internal_note"))}

### Descriptions cleaned (${by("description_cleaned").length})
${list(by("description_cleaned"))}

### Option lists converted to selectable options (${by("attribute_as_variants").length})
${list(by("attribute_as_variants"))}

### Skipped duplicate option rows (${by("duplicate_variant_skipped").length})
${list(by("duplicate_variant_skipped"))}

### Missing descriptions (${by("missing_description").length})
${by("missing_description").length} products have no description in the CSV.

### Other
- Only ${products.filter((p) => p.sku).length} product(s) had a SKU in the CSV; SKU is empty for the rest.
- Dimension/weight columns were empty in the export and were not imported.
- "Package Level 1" is a product in the CSV whose description lists a First Year kit. It's imported as a product; recreate it as a **bundle** in Admin → Bundles to get the bundle presentation.
- Product images still load from the old store's CDN (assets.wuiltstore.com). Run the importer with \`--mirror-images\` to copy them into your own Supabase Storage.
`;
}

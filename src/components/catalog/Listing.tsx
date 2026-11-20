import Link from "next/link";
import { X } from "lucide-react";
import { browseProducts, getCategories, getSpecialties, getYears } from "@/lib/catalog";
import type { BrowseFilters } from "@/lib/types";
import { fmt, pick, type Dictionary, type Locale } from "@/lib/i18n";
import { withParams } from "@/lib/utils";
import { ProductGrid } from "@/components/commerce/ProductCollections";
import { EmptyState } from "@/components/ui/Section";
import { FilterPanel } from "./FilterPanel";
import { SortSelect } from "./SortSelect";

export type SearchParams = Record<string, string | string[] | undefined>;

const SORTS = new Set(["featured", "newest", "price_asc", "price_desc", "best"]);

/** Translate URL params to browse filters; `fixed` filters come from the page itself. */
export function paramsToFilters(sp: SearchParams, fixed: BrowseFilters = {}): BrowseFilters {
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).slice(0, 200) : undefined);
  const page = Math.max(1, Math.min(500, Number(s("page")) || 1));
  const aud = s("audience");
  return {
    q: s("q"),
    category: s("category"),
    brand: s("brand"),
    year: s("year"),
    specialty: s("specialty"),
    audience: aud === "student" || aud === "dentist" ? aud : undefined,
    min_price: s("min"),
    max_price: s("max"),
    in_stock: s("stock") === "1" || undefined,
    type: s("type"),
    sort: SORTS.has(s("sort") ?? "") ? (s("sort") as BrowseFilters["sort"]) : undefined,
    page,
    per_page: 24,
    ...fixed,
  };
}

export async function Listing({ basePath, searchParams, fixed = {}, t, locale }: {
  basePath: string;
  searchParams: SearchParams;
  fixed?: BrowseFilters;
  t: Dictionary;
  locale: Locale;
}) {
  const filters = paramsToFilters(searchParams, fixed);
  const [result, categories, years, specialties] = await Promise.all([
    browseProducts(filters), getCategories(), getYears(), getSpecialties(),
  ]);
  const current = Object.fromEntries(Object.entries(searchParams).filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const pages = Math.max(1, Math.ceil(result.total / result.per_page));

  const name = (list: { slug: string; name_en: string; name_ar: string | null }[], slug?: string) => {
    const f = list.find((x) => x.slug === slug);
    return f ? pick(locale, f.name_en, f.name_ar) : slug ?? "";
  };
  const chips: { label: string; key: string }[] = [];
  if (current.q) chips.push({ label: `“${current.q}”`, key: "q" });
  if (current.category && !fixed.category) chips.push({ label: name(categories, current.category), key: "category" });
  if (current.year && !fixed.year) chips.push({ label: name(years, current.year), key: "year" });
  if (current.specialty && !fixed.specialty) chips.push({ label: name(specialties, current.specialty), key: "specialty" });
  if (current.audience && !fixed.audience) chips.push({ label: current.audience === "student" ? t.nav.students : t.nav.dentists, key: "audience" });
  if (current.brand && !fixed.brand) chips.push({ label: current.brand.split(",").map((b) => result.facets.brands.find((x) => x.slug === b)?.name ?? b).join(", "), key: "brand" });
  if (current.min || current.max) chips.push({ label: `${current.min || 0} – ${current.max || "∞"}`, key: "min" });
  if (current.stock) chips.push({ label: t.filters.inStockOnly, key: "stock" });
  if (current.type) chips.push({ label: current.type, key: "type" });

  const locked = Object.keys(fixed);

  return (
    <div className="grid gap-8 lg:grid-cols-[15.5rem_1fr] lg:gap-12">
      <FilterPanel
        facets={result.facets}
        total={result.total}
        locked={locked}
        categories={categories.filter((c) => !c.parent_id).map((c) => ({ value: c.slug, label: pick(locale, c.name_en, c.name_ar) }))}
        years={years.map((y) => ({ value: y.slug, label: pick(locale, y.name_en, y.name_ar) }))}
        specialties={specialties.map((s) => ({ value: s.slug, label: pick(locale, s.name_en, s.name_ar) }))}
      />
      <div className="min-w-0">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted" aria-live="polite">
            {result.total === 1 ? t.common.result1 : fmt(t.common.results, { n: result.total })}
          </p>
          <SortSelect />
        </div>
        {chips.length > 0 && (
          <ul className="mb-6 flex flex-wrap gap-2">
            {chips.map((c) => (
              <li key={c.key}>
                <Link href={withParams(basePath, current, c.key === "min" ? { min: null, max: null } : { [c.key]: null })}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-mist px-3 text-sm text-navy hover:bg-teal/30" scroll={false}>
                  {c.label} <X className="size-3.5" aria-label={t.common.remove} />
                </Link>
              </li>
            ))}
            <li><Link href={basePath} className="inline-flex h-8 items-center px-2 text-sm text-muted underline-offset-4 hover:underline" scroll={false}>{t.common.clearAll}</Link></li>
          </ul>
        )}
        {result.items.length ? (
          <ProductGrid products={result.items} locale={locale} t={t} />
        ) : (
          <EmptyState title={t.common.noResults} text={t.common.noResultsHint}>
            <Link href={basePath} className="btn btn-ghost btn-sm">{t.common.clearAll}</Link>
          </EmptyState>
        )}
        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-2">
            {result.page > 1 && <Link className="btn btn-ghost btn-sm" href={withParams(basePath, current, { page: String(result.page - 1) })}>{t.common.previous}</Link>}
            <ol className="flex items-center gap-1">
              {pageWindow(result.page, pages).map((p, i) =>
                p === 0 ? <li key={`e${i}`} className="px-1 text-muted">…</li> : (
                  <li key={p}>
                    <Link href={withParams(basePath, current, { page: p === 1 ? null : String(p) })} aria-current={p === result.page ? "page" : undefined}
                      className={`grid size-9 place-items-center rounded-full text-sm tabular-nums ${p === result.page ? "bg-navy text-white" : "hover:bg-cloud"}`}>
                      {p}
                    </Link>
                  </li>
                ))}
            </ol>
            {result.page < pages && <Link className="btn btn-ghost btn-sm" href={withParams(basePath, current, { page: String(result.page + 1) })}>{t.common.next}</Link>}
          </nav>
        )}
      </div>
    </div>
  );
}

function pageWindow(current: number, total: number): number[] {
  const set = new Set([1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...set].sort((a, b) => a - b);
  const out: number[] = [];
  sorted.forEach((p, i) => { if (i && p - sorted[i - 1] > 1) out.push(0); out.push(p); });
  return out;
}

"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import type { BrowseResult } from "@/lib/types";
import { fmt } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

type Opt = { value: string; label: string };

export function FilterPanel({ facets, categories, years, specialties, locked = [], total }: {
  facets: BrowseResult["facets"];
  categories: Opt[];
  years: Opt[];
  specialties: Opt[];
  locked?: string[];
  total: number;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [sheet, setSheet] = useState(false);

  const set = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    Object.entries(patch).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    p.delete("page");
    start(() => router.push(`${pathname}${p.toString() ? `?${p}` : ""}`, { scroll: false }));
  };

  const brands = (params.get("brand") ?? "").split(",").filter(Boolean);
  const toggleBrand = (slug: string) => {
    const next = brands.includes(slug) ? brands.filter((b) => b !== slug) : [...brands, slug];
    set({ brand: next.join(",") || null });
  };

  const [min, setMin] = useState(params.get("min") ?? "");
  const [max, setMax] = useState(params.get("max") ?? "");
  useEffect(() => { setMin(params.get("min") ?? ""); setMax(params.get("max") ?? ""); }, [params]);

  const panel = (
    <div className={cn("flex flex-col gap-7 transition-opacity", pending && "opacity-60")}>
      {!locked.includes("category") && categories.length > 0 && (
        <Group title={t.filters.category}>
          <RadioList name="category" options={categories} value={params.get("category")} anyLabel={t.filters.any} onChange={(v) => set({ category: v })} />
        </Group>
      )}
      {!locked.includes("audience") && !locked.includes("year") && (
        <Group title={locale === "ar" ? "مناسب لـ" : "Shop for"}>
          <RadioList name="audience" value={params.get("audience")} anyLabel={t.filters.any} onChange={(v) => set({ audience: v })}
            options={[{ value: "student", label: t.nav.students }, { value: "dentist", label: t.nav.dentists }]} />
        </Group>
      )}
      {!locked.includes("year") && years.length > 0 && params.get("audience") !== "dentist" && (
        <Group title={t.filters.year}>
          <RadioList name="year" options={years} value={params.get("year")} anyLabel={t.filters.any} onChange={(v) => set({ year: v })} />
        </Group>
      )}
      {!locked.includes("specialty") && specialties.length > 0 && params.get("audience") !== "student" && (
        <Group title={t.filters.specialty}>
          <RadioList name="specialty" options={specialties} value={params.get("specialty")} anyLabel={t.filters.any} onChange={(v) => set({ specialty: v })} />
        </Group>
      )}
      {!locked.includes("brand") && facets.brands.length > 0 && (
        <Group title={t.filters.brand}>
          <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto pe-1">
            {facets.brands.map((b) => (
              <li key={b.slug}>
                <label className="flex min-h-9 cursor-pointer items-center gap-3 text-[0.95rem]">
                  <input type="checkbox" className="size-4 accent-navy" checked={brands.includes(b.slug)} onChange={() => toggleBrand(b.slug)} />
                  <span className="flex-1">{b.name}</span>
                  <span className="text-xs tabular-nums text-muted">{b.count}</span>
                </label>
              </li>
            ))}
          </ul>
        </Group>
      )}
      <Group title={t.filters.price}>
        <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); set({ min: min || null, max: max || null }); }}>
          <input className="field !min-h-10 tabular-nums" inputMode="numeric" placeholder={facets.price_min != null ? String(facets.price_min) : t.filters.min}
            aria-label={t.filters.min} value={min} onChange={(e) => setMin(e.target.value.replace(/[^\d.]/g, ""))} />
          <span className="text-muted">–</span>
          <input className="field !min-h-10 tabular-nums" inputMode="numeric" placeholder={facets.price_max != null ? String(facets.price_max) : t.filters.max}
            aria-label={t.filters.max} value={max} onChange={(e) => setMax(e.target.value.replace(/[^\d.]/g, ""))} />
          <button className="btn btn-ghost btn-sm shrink-0">{t.common.apply}</button>
        </form>
      </Group>
      <Group title={t.filters.availability}>
        <label className="flex min-h-9 cursor-pointer items-center gap-3 text-[0.95rem]">
          <input type="checkbox" className="size-4 accent-navy" checked={params.get("stock") === "1"} onChange={(e) => set({ stock: e.target.checked ? "1" : null })} />
          {t.filters.inStockOnly}
        </label>
      </Group>
      {facets.types.length > 0 && !locked.includes("type") && (
        <Group title={t.filters.type}>
          <RadioList name="type" value={params.get("type")} anyLabel={t.filters.any} onChange={(v) => set({ type: v })}
            options={facets.types.map((x) => ({ value: x.value, label: `${x.value} (${x.count})` }))} />
        </Group>
      )}
    </div>
  );

  return (
    <>
      <aside className="sticky top-24 hidden max-h-[calc(100dvh-7rem)] overflow-y-auto pb-8 pe-2 lg:block" aria-label={t.common.filters}>
        {panel}
      </aside>
      <button type="button" onClick={() => setSheet(true)} className="btn btn-ghost btn-sm lg:hidden">
        <SlidersHorizontal className="size-4" /> {t.common.filters}
      </button>
      {sheet && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <div className="menu-scrim absolute inset-0 bg-navy-deep/40" onClick={() => setSheet(false)} />
            <div role="dialog" aria-modal="true" aria-label={t.common.filters}
              className="sheet-up absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-3xl bg-white">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <h2 className="text-lg font-semibold">{t.common.filters}</h2>
                <button type="button" onClick={() => setSheet(false)} className="grid size-10 place-items-center rounded-full hover:bg-cloud" aria-label={t.nav.close}><X className="size-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-6">{panel}</div>
              <div className="border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <button type="button" onClick={() => setSheet(false)} className="btn btn-primary w-full">{fmt(t.filters.show, { n: total })}</button>
              </div>
            </div>
          </div>
        )}
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 font-display text-[0.95rem] font-semibold text-navy">{title}</legend>
      {children}
    </fieldset>
  );
}

function RadioList({ name, options, value, onChange, anyLabel }: { name: string; options: Opt[]; value: string | null; onChange: (v: string | null) => void; anyLabel: string }) {
  return (
    <ul className="flex max-h-64 flex-col gap-0.5 overflow-y-auto pe-1">
      {[{ value: "", label: anyLabel }, ...options].map((o) => (
        <li key={o.value || "any"}>
          <label className="flex min-h-9 cursor-pointer items-center gap-3 text-[0.95rem]">
            <input type="radio" name={name} className="size-4 accent-navy" checked={(value ?? "") === o.value} onChange={() => onChange(o.value || null)} />
            <span>{o.label}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

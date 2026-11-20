"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useState, useTransition } from "react";
import { bulkUpdateProducts } from "@/lib/admin/catalog-actions";
import { formatPrice } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Badge, useToast } from "./ui";

export interface AdminProductRow {
  id: string; slug: string; name: string; sku: string | null; price: number; compare: number | null;
  stock: number | null; low: boolean; audience: string; published: boolean; featured: boolean; best: boolean; isNew: boolean;
  brand: string | null; image: string | null; categories: number; years: number;
}
type Opt = { value: string; label: string };

const AUDIENCE_LABEL: Record<string, string> = { unassigned: "Needs review", student: "Students", dentist: "Dentists", both: "Both" };
const AUDIENCE_TONE: Record<string, "warn" | "info" | "ok" | "neutral"> = { unassigned: "warn", student: "info", dentist: "info", both: "ok" };

export function ProductTable({ rows, total, page, perPage, params, categories, years, specialties }: {
  rows: AdminProductRow[]; total: number; page: number; perPage: number; params: Record<string, string | undefined>;
  categories: Opt[]; years: Opt[]; specialties: Opt[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [q, setQ] = useState(params.q ?? "");
  const [pending, start] = useTransition();
  const pages = Math.max(1, Math.ceil(total / perPage));

  const nav = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]);
    Object.entries(patch).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    if (!("page" in patch)) p.delete("page");
    setSelected([]);
    router.push(`${pathname}?${p}`);
  };

  const bulk = (action: Parameters<typeof bulkUpdateProducts>[0]["action"], confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => {
      const r = await bulkUpdateProducts({ ids: selected, action });
      if (r.ok) { toast(`Updated ${selected.length} products`); setSelected([]); router.refresh(); } else toast(r.error, "error");
    });
  };

  const allOnPage = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  return (
    <div className="flex flex-col gap-4">
      {/* filters */}
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={(e) => { e.preventDefault(); nav({ q: q || null }); }} className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input className="field ps-9" placeholder="Search by name or SKU" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
        <Select value={params.audience} onChange={(v) => nav({ audience: v })} placeholder="All audiences"
          options={[{ value: "unassigned", label: "Needs review" }, { value: "student", label: "Students" }, { value: "dentist", label: "Dentists" }, { value: "both", label: "Both" }]} />
        <Select value={params.status} onChange={(v) => nav({ status: v })} placeholder="Any status" options={[{ value: "published", label: "Published" }, { value: "draft", label: "Draft" }]} />
        <Select value={params.category} onChange={(v) => nav({ category: v })} placeholder="All categories" options={categories} />
        <Select value={params.year} onChange={(v) => nav({ year: v })} placeholder="All years" options={years} />
        <Select value={params.specialty} onChange={(v) => nav({ specialty: v })} placeholder="All specialties" options={specialties} />
        <Select value={params.stock} onChange={(v) => nav({ stock: v })} placeholder="Any stock" options={[{ value: "low", label: "Low stock" }]} />
        <Select value={params.flag} onChange={(v) => nav({ flag: v })} placeholder="Any flag" options={[{ value: "featured", label: "Featured" }, { value: "best", label: "Best seller" }, { value: "new", label: "New arrival" }]} />
        <Select value={params.sort} onChange={(v) => nav({ sort: v })} placeholder="Recently updated" options={[{ value: "name", label: "Name" }, { value: "price", label: "Price" }, { value: "stock", label: "Stock" }]} />
      </div>

      {/* bulk bar */}
      {selected.length > 0 && (
        <div className={cn("sticky top-14 z-30 flex flex-wrap items-center gap-2 rounded-2xl bg-navy p-3 text-sm text-white lg:top-2", pending && "opacity-70")}>
          <span className="px-2 font-medium">{selected.length} selected</span>
          <BulkSelect label="Set audience" onPick={(v) => bulk({ type: "audience", value: v as "student" })}
            options={[{ value: "student", label: "Students" }, { value: "dentist", label: "Dentists" }, { value: "both", label: "Both" }, { value: "unassigned", label: "Needs review" }]} />
          <BulkSelect label="Add to year" onPick={(v) => bulk({ type: "add_year", year_id: v })} options={years} />
          <BulkSelect label="Remove from year" onPick={(v) => bulk({ type: "remove_year", year_id: v })} options={years} />
          <BulkSelect label="Add category" onPick={(v) => bulk({ type: "add_category", category_id: v })} options={categories} />
          <BulkSelect label="Add specialty" onPick={(v) => bulk({ type: "add_specialty", specialty_id: v })} options={specialties} />
          <BulkSelect label="Flags" onPick={(v) => { const [flag, val] = v.split(":"); bulk({ type: "flag", flag: flag as "is_featured", value: val === "1" }); }}
            options={[{ value: "is_featured:1", label: "Mark featured" }, { value: "is_featured:0", label: "Unmark featured" }, { value: "is_best_seller:1", label: "Mark best seller" },
              { value: "is_best_seller:0", label: "Unmark best seller" }, { value: "is_new_arrival:1", label: "Mark new arrival" }, { value: "is_new_arrival:0", label: "Unmark new arrival" }]} />
          <button className="h-9 rounded-full bg-white/10 px-3 hover:bg-white/20" onClick={() => bulk({ type: "publish", value: true })}>Publish</button>
          <button className="h-9 rounded-full bg-white/10 px-3 hover:bg-white/20" onClick={() => bulk({ type: "publish", value: false })}>Unpublish</button>
          <button className="h-9 rounded-full bg-danger/80 px-3 hover:bg-danger" onClick={() => bulk({ type: "delete" }, `Delete ${selected.length} products permanently?`)}>Delete</button>
          <button className="ms-auto h-9 px-3 text-white/70 hover:text-white" onClick={() => setSelected([])}>Clear</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-cloud/60 text-left text-xs text-muted">
            <tr>
              <th className="w-10 px-4 py-3"><input type="checkbox" className="size-4 accent-navy" aria-label="Select all on this page" checked={allOnPage}
                onChange={() => setSelected(allOnPage ? selected.filter((id) => !rows.some((r) => r.id === id)) : [...new Set([...selected, ...rows.map((r) => r.id)])])} /></th>
              <th className="py-3 font-medium">Product</th>
              <th className="font-medium">Audience</th>
              <th className="font-medium">Placement</th>
              <th className="font-medium">Price</th>
              <th className="font-medium">Stock</th>
              <th className="font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className={cn("hover:bg-cloud/50", selected.includes(r.id) && "bg-mist/50")}>
                <td className="px-4"><input type="checkbox" className="size-4 accent-navy" aria-label={`Select ${r.name}`} checked={selected.includes(r.id)}
                  onChange={() => setSelected(selected.includes(r.id) ? selected.filter((x) => x !== r.id) : [...selected, r.id])} /></td>
                <td className="py-2.5 pe-4">
                  <Link href={`/admin/products/${r.id}`} className="flex items-center gap-3">
                    <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-cloud">{r.image && <Image src={r.image} alt="" fill sizes="44px" className="object-contain p-0.5" />}</span>
                    <span className="min-w-0">
                      <span className="line-clamp-1 font-medium text-ink hover:text-navy">{r.name}</span>
                      <span className="text-xs text-muted">{[r.brand, r.sku].filter(Boolean).join(" · ") || "—"}</span>
                    </span>
                  </Link>
                </td>
                <td><Badge tone={AUDIENCE_TONE[r.audience]}>{AUDIENCE_LABEL[r.audience]}</Badge></td>
                <td className="text-xs text-muted">{r.categories} cat · {r.years} yr</td>
                <td className="tabular-nums">{formatPrice(r.price, "en")}{r.compare && <s className="ms-1 text-xs text-muted">{r.compare}</s>}</td>
                <td>{r.stock == null ? <span className="text-xs text-muted">Not tracked</span> : <Badge tone={r.stock <= 0 ? "danger" : r.low ? "warn" : "neutral"}>{r.stock}</Badge>}</td>
                <td className="pe-4"><div className="flex flex-wrap gap-1">{r.published ? <Badge tone="ok">Published</Badge> : <Badge>Draft</Badge>}{r.featured && <Badge tone="info">Featured</Badge>}</div></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7} className="py-12 text-center text-muted">No products match these filters.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted">
        <span>{total} products</span>
        {pages > 1 && (
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => nav({ page: String(page - 1) })}>Previous</button>
            <span className="tabular-nums">{page} / {pages}</span>
            <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => nav({ page: String(page + 1) })}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Select({ value, onChange, options, placeholder }: { value?: string; onChange: (v: string | null) => void; options: Opt[]; placeholder: string }) {
  return (
    <select className="field !w-auto !min-h-10 text-sm" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} aria-label={placeholder}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function BulkSelect({ label, options, onPick }: { label: string; options: Opt[]; onPick: (v: string) => void }) {
  return (
    <select className="h-9 rounded-full border-0 bg-white/10 px-3 text-white [&>option]:text-ink" value="" onChange={(e) => e.target.value && onPick(e.target.value)} aria-label={label}>
      <option value="">{label}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

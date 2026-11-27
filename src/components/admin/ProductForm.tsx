"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, ExternalLink, Eye, EyeOff, Plus, Star, Trash2, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { deleteProduct, saveProduct, type ProductData } from "@/lib/admin/catalog-actions";
import { cn, slugify } from "@/lib/utils";
import { Card, ConfirmButton, Field, ImageListInput, ProductPicker, Toggle, useToast, type PickedProduct } from "./ui";

type Opt = { value: string; label: string; slug?: string };
type Variant = ProductData["variants"][number] & { key: string };

export interface ProductFormData extends Omit<ProductData, "variants"> {
  variants: Omit<Variant, "key">[];
}

export function ProductForm({ initial, related: initialRelated, options }: {
  initial: ProductFormData;
  related: PickedProduct[];
  options: { brands: Opt[]; categories: Opt[]; years: Opt[]; specialties: Opt[]; types: string[]; subjects: (Opt & { year_id: string })[] };
}) {
  const router = useRouter();
  const toast = useToast();
  const [p, setP] = useState<ProductFormData>(initial);
  const [variants, setVariants] = useState<Variant[]>(() => initial.variants.map((v, i) => ({ ...v, key: v.id ?? `n${i}` })));
  const [related, setRelated] = useState<PickedProduct[]>(initialRelated);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [pending, start] = useTransition();
  const set = <K extends keyof ProductFormData>(k: K, v: ProductFormData[K]) => setP((s) => ({ ...s, [k]: v }));

  const save = () => start(async () => {
    const res = await saveProduct({ ...p, variants: variants.map(({ key: _k, ...v }) => v), related_ids: related.map((r) => r.id) });
    if (!res.ok) { toast(res.error, "error"); return; }
    toast("Product saved");
    if (!p.id && res.id) router.replace(`/admin/products/${res.id}`);
    else router.refresh();
  });

  // ---------------- options / variants helpers ----------------
  const [valueDrafts, setValueDrafts] = useState<Record<string, string>>({});
  const generate = () => {
    const lists = p.option_names.map((n) => (valueDrafts[n] ?? "").split(",").map((s) => s.trim()).filter(Boolean));
    if (!lists.length || lists.some((l) => !l.length)) { toast("Enter comma-separated values for every option first", "error"); return; }
    const combos = lists.reduce<Record<string, string>[]>((acc, list, i) => acc.flatMap((a) => list.map((v) => ({ ...a, [p.option_names[i]]: v }))), [{}]);
    const existing = new Set(variants.map((v) => JSON.stringify(v.options)));
    const fresh = combos.filter((c) => !existing.has(JSON.stringify(c))).map((options, i) => ({
      key: `g${Date.now()}${i}`, id: null, sku: null, options, price: p.price, compare_at_price: null, stock_qty: null, image_url: null, is_active: true,
    }));
    setVariants([...variants, ...fresh]);
  };
  const setVar = (key: string, patch: Partial<Variant>) => setVariants((vs) => vs.map((v) => (v.key === key ? { ...v, ...patch } : v)));

  // ---------------- placement preview ----------------
  const preview = useMemo(() => {
    const out: { text: string; tone: "ok" | "warn" | "off" }[] = [];
    const warn = (text: string) => out.push({ text, tone: "warn" });
    const on = (text: string) => out.push({ text, tone: "ok" });
    if (!p.is_published) out.push({ text: "Hidden — this product is a draft", tone: "off" });
    const forStudents = p.audience === "student" || p.audience === "both";
    const forDentists = p.audience === "dentist" || p.audience === "both";
    on("Shop all, search results and filters");
    p.category_ids.forEach((id) => { const c = options.categories.find((x) => x.value === id); if (c) on(`Category page › ${c.label}`); });
    if (forStudents) {
      p.years.forEach((y) => { const yr = options.years.find((x) => x.value === y.year_id); if (yr) on(`Students › ${yr.label}${y.is_essential ? " (recommended essentials)" : ""}`); });
      if (p.is_featured) on("Students page › Essential tools");
      if (p.is_best_seller) on("Students page › Popular with students");
    }
    if (forDentists) {
      p.specialty_ids.forEach((id) => { const s = options.specialties.find((x) => x.value === id); if (s) on(`Dentists › ${s.label}`); });
      if (p.is_best_seller) on("Dentists page › Best sellers");
      if (p.category_ids.some((id) => options.categories.find((c) => c.value === id)?.slug === "equipment")) on("Dentists page › Professional equipment");
    }
    if (p.is_featured) on("Homepage hero (featured products)");
    if (p.is_best_seller) on("Homepage › Best sellers");
    if (p.compare_at_price || variants.some((v) => v.compare_at_price)) on("Offers rails (has an original price)");
    if (p.audience === "unassigned") warn("Audience not set: it won't appear on the Students or Dentists pages");
    if (p.years.length && !forStudents) warn("Academic years are set, but year pages only show products for Students or Both");
    if (p.specialty_ids.length && !forDentists) warn("Specialties are set, but specialty pages only show products for Dentists or Both");
    if (forStudents && !p.years.length) warn("For students but no academic year: it won't appear on any year page");
    if (!p.category_ids.length) warn("No category: it won't appear on category pages");
    if (!p.images.length) warn("No images");
    return out;
  }, [p, variants, options]);

  const audienceOpts = [
    { value: "student", label: "Students" }, { value: "dentist", label: "Dentists" }, { value: "both", label: "Both" }, { value: "unassigned", label: "Not decided" },
  ] as const;

  return (
    <form className="grid gap-6 xl:grid-cols-[1fr_22rem]" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <div className="flex min-w-0 flex-col gap-6">
        <Card title="Basics">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name (English)"><input className="field" dir="ltr" value={p.name_en ?? ""} onChange={(e) => { set("name_en", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} /></Field>
            <Field label="Name (Arabic)"><input className="field" dir="rtl" value={p.name_ar ?? ""} onChange={(e) => { set("name_ar", e.target.value); if (!slugTouched && !p.name_en) set("slug", slugify(e.target.value)); }} /></Field>
            <Field label="URL slug" help={`/products/${p.slug || "…"}`}><input className="field" dir="ltr" value={p.slug} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }} /></Field>
            <Field label="SKU / product code"><input className="field" dir="ltr" value={p.sku ?? ""} onChange={(e) => set("sku", e.target.value)} /></Field>
            <Field label="Brand" help="Manage the list in Brands.">
              <select className="field" value={p.brand_id ?? ""} onChange={(e) => set("brand_id", e.target.value)}>
                <option value="">No brand</option>
                {options.brands.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </Field>
            <Field label="Product type" help="Free text, e.g. Instrument, Material, Device. Used as a filter.">
              <input className="field" list="ptypes" value={p.product_type ?? ""} onChange={(e) => set("product_type", e.target.value)} />
              <datalist id="ptypes">{options.types.map((t) => <option key={t} value={t} />)}</datalist>
            </Field>
          </div>
        </Card>

        <Card title="Where it appears">
          <div className="flex flex-col gap-6">
            <div>
              <p className="label">Audience</p>
              <div className="inline-flex flex-wrap gap-1 rounded-full bg-cloud p-1">
                {audienceOpts.map((a) => (
                  <button key={a.value} type="button" aria-pressed={p.audience === a.value} onClick={() => set("audience", a.value)}
                    className={cn("h-9 rounded-full px-4 text-sm transition-colors", p.audience === a.value ? "bg-navy text-white" : "text-ink hover:bg-white")}>{a.label}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="label">Academic years <span className="font-normal text-muted">— star = recommended essential for that year</span></p>
              <div className="flex flex-wrap gap-2">
                {options.years.map((y) => {
                  const sel = p.years.find((x) => x.year_id === y.value);
                  return (
                    <span key={y.value} className={cn("inline-flex h-9 items-center overflow-hidden rounded-full border text-sm", sel ? "border-navy bg-navy text-white" : "border-line bg-white")}>
                      <button type="button" className="h-full px-3.5" aria-pressed={!!sel}
                        onClick={() => set("years", sel ? p.years.filter((x) => x.year_id !== y.value) : [...p.years, { year_id: y.value, is_essential: false }])}>{y.label}</button>
                      {sel && (
                        <button type="button" aria-label={`Essential for ${y.label}`} aria-pressed={sel.is_essential} className="h-full border-l border-white/20 px-2.5"
                          onClick={() => set("years", p.years.map((x) => (x.year_id === y.value ? { ...x, is_essential: !x.is_essential } : x)))}>
                          <Star className={cn("size-4", sel.is_essential && "fill-teal text-teal")} />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
            {p.years.some((y) => options.subjects.some((s) => s.year_id === y.year_id)) && (
              <div>
                <p className="label">Subjects <span className="font-normal text-muted">— which subject(s) of the chosen years use this</span></p>
                <div className="flex flex-col gap-2">
                  {p.years.map((y) => {
                    const subs = options.subjects.filter((s) => s.year_id === y.year_id);
                    if (!subs.length) return null;
                    return (
                      <div key={y.year_id} className="flex flex-wrap items-center gap-2">
                        <span className="w-28 text-xs text-muted">{options.years.find((o) => o.value === y.year_id)?.label}</span>
                        <Chips options={subs} value={p.subject_ids.filter((id) => subs.some((s) => s.value === id))}
                          onChange={(v) => set("subject_ids", [...p.subject_ids.filter((id) => !subs.some((s) => s.value === id)), ...v])} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div>
              <p className="label">Dental specialties</p>
              <Chips options={options.specialties} value={p.specialty_ids} onChange={(v) => set("specialty_ids", v)} />
            </div>
            <div>
              <p className="label">Categories <span className="font-normal text-muted">— the first one you pick is the main category (used in breadcrumbs)</span></p>
              <Chips options={options.categories} value={p.category_ids} onChange={(v) => { set("category_ids", v); set("primary_category_id", v[0] ?? null); }} />
            </div>
          </div>
        </Card>

        <Card title="Images"><ImageListInput value={p.images} onChange={(v) => set("images", v)} /></Card>

        <Card title="Description">
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Short description (English)"><input className="field" dir="ltr" value={p.short_description_en ?? ""} onChange={(e) => set("short_description_en", e.target.value)} /></Field>
            <Field label="Short description (Arabic)"><input className="field" dir="rtl" value={p.short_description_ar ?? ""} onChange={(e) => set("short_description_ar", e.target.value)} /></Field>
            <Field label="Full description (English)" help="Plain text, or simple HTML (paragraphs, lists, bold)."><textarea className="field min-h-48 font-mono text-xs" dir="ltr" value={p.description_en ?? ""} onChange={(e) => set("description_en", e.target.value)} /></Field>
            <Field label="Full description (Arabic)" help="نص عادي أو HTML بسيط."><textarea className="field min-h-48 font-mono text-xs" dir="rtl" value={p.description_ar ?? ""} onChange={(e) => set("description_ar", e.target.value)} /></Field>
          </div>
        </Card>

        <Card title="Pricing & inventory">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Price (EGP)" help={variants.length ? "Set per option below; the cheapest option is used here." : undefined}>
              <input className="field" type="number" step="0.01" min="0" value={p.price} disabled={variants.length > 0} onChange={(e) => set("price", Number(e.target.value))} /></Field>
            <Field label="Original price" help="Shown struck through when higher than the price.">
              <input className="field" type="number" step="0.01" min="0" value={p.compare_at_price ?? ""} disabled={variants.length > 0} onChange={(e) => set("compare_at_price", e.target.value === "" ? null : Number(e.target.value))} /></Field>
            <Field label="Cost (internal)"><input className="field" type="number" step="0.01" min="0" value={p.cost_price ?? ""} onChange={(e) => set("cost_price", e.target.value === "" ? null : Number(e.target.value))} /></Field>
          </div>
          {!variants.length && (
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-3"><Toggle checked={p.track_inventory} onChange={(v) => set("track_inventory", v)} label="Track stock quantity" help="When off, the product is always shown as available." /></div>
              {p.track_inventory && (
                <>
                  <Field label="In stock"><input className="field" type="number" value={p.stock_qty} onChange={(e) => set("stock_qty", Number(e.target.value))} /></Field>
                  <Field label="Low-stock alert at"><input className="field" type="number" min="0" value={p.low_stock_threshold} onChange={(e) => set("low_stock_threshold", Number(e.target.value))} /></Field>
                  <div className="pt-6"><Toggle checked={p.allow_backorder} onChange={(v) => set("allow_backorder", v)} label="Allow orders when out of stock" /></div>
                </>
              )}
            </div>
          )}
        </Card>

        <Card title="Options (variations)">
          <p className="mb-4 text-sm text-muted">For choices like size, taper or colour. Each combination can have its own price, stock and image. Leave stock empty to not track it.</p>
          <div className="flex flex-col gap-3">
            {p.option_names.map((n, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[12rem_1fr_auto]">
                <input className="field" placeholder="Option name, e.g. Size" value={n} onChange={(e) => {
                  const old = p.option_names[i]; const next = e.target.value;
                  set("option_names", p.option_names.map((x, k) => (k === i ? next : x)));
                  setVariants((vs) => vs.map((v) => { const o = { ...v.options }; if (old in o) { o[next] = o[old]; delete o[old]; } return { ...v, options: o }; }));
                }} />
                <input className="field" placeholder="Values, comma-separated (to generate combinations)" value={valueDrafts[n] ?? ""} onChange={(e) => setValueDrafts({ ...valueDrafts, [n]: e.target.value })} />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => set("option_names", p.option_names.filter((_, k) => k !== i))} aria-label="Remove option"><X className="size-4" /></button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              {p.option_names.length < 3 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => set("option_names", [...p.option_names, ""])}><Plus className="size-4" /> Add option</button>}
              {p.option_names.length > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={generate}>Generate combinations</button>}
              {p.option_names.length > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setVariants([...variants, { key: `m${Date.now()}`, id: null, sku: null, options: {}, price: p.price, compare_at_price: null, stock_qty: null, image_url: null, is_active: true }])}><Plus className="size-4" /> Add one row</button>}
            </div>
          </div>
          {variants.length > 0 && (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[46rem] text-sm">
                <thead className="text-left text-xs text-muted"><tr>
                  {p.option_names.map((n) => <th key={n} className="pb-2 font-medium">{n || "Option"}</th>)}
                  <th className="pb-2 font-medium">Price</th><th className="pb-2 font-medium">Original</th><th className="pb-2 font-medium">Stock</th><th className="pb-2 font-medium">Image</th><th className="pb-2 font-medium">On</th><th />
                </tr></thead>
                <tbody>
                  {variants.map((v) => (
                    <tr key={v.key} className={cn("border-t border-line", !v.is_active && "opacity-50")}>
                      {p.option_names.map((n) => <td key={n} className="py-1.5 pe-2"><input className="field !min-h-9" value={v.options[n] ?? ""} onChange={(e) => setVar(v.key, { options: { ...v.options, [n]: e.target.value } })} /></td>)}
                      <td className="pe-2"><input className="field !min-h-9 w-24" type="number" step="0.01" value={v.price} onChange={(e) => setVar(v.key, { price: Number(e.target.value) })} /></td>
                      <td className="pe-2"><input className="field !min-h-9 w-24" type="number" step="0.01" value={v.compare_at_price ?? ""} onChange={(e) => setVar(v.key, { compare_at_price: e.target.value === "" ? null : Number(e.target.value) })} /></td>
                      <td className="pe-2"><input className="field !min-h-9 w-20" type="number" placeholder="∞" value={v.stock_qty ?? ""} onChange={(e) => setVar(v.key, { stock_qty: e.target.value === "" ? null : Number(e.target.value) })} /></td>
                      <td className="pe-2">
                        <select className="field !min-h-9 w-28" value={v.image_url ?? ""} onChange={(e) => setVar(v.key, { image_url: e.target.value || null })}>
                          <option value="">—</option>
                          {p.images.map((src, i) => <option key={src} value={src}>Image {i + 1}</option>)}
                        </select>
                      </td>
                      <td className="pe-2"><button type="button" onClick={() => setVar(v.key, { is_active: !v.is_active })} aria-label={v.is_active ? "Disable option" : "Enable option"} className="grid size-9 place-items-center rounded-lg hover:bg-cloud">{v.is_active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</button></td>
                      <td><button type="button" onClick={() => setVariants(variants.filter((x) => x.key !== v.key))} aria-label="Delete option" className="grid size-9 place-items-center rounded-lg text-danger hover:bg-danger/10"><Trash2 className="size-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Specifications">
          <div className="flex flex-col gap-2">
            {p.specifications.map((s, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_1.4fr_auto]">
                <input className="field" placeholder="Label (English)" value={s.label_en} onChange={(e) => set("specifications", p.specifications.map((x, k) => (k === i ? { ...x, label_en: e.target.value } : x)))} />
                <input className="field" dir="rtl" placeholder="Label (Arabic)" value={s.label_ar ?? ""} onChange={(e) => set("specifications", p.specifications.map((x, k) => (k === i ? { ...x, label_ar: e.target.value } : x)))} />
                <input className="field" placeholder="Value" value={s.value} onChange={(e) => set("specifications", p.specifications.map((x, k) => (k === i ? { ...x, value: e.target.value } : x)))} />
                <button type="button" className="btn btn-ghost btn-sm" aria-label="Remove row" onClick={() => set("specifications", p.specifications.filter((_, k) => k !== i))}><X className="size-4" /></button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm w-fit" onClick={() => set("specifications", [...p.specifications, { label_en: "", label_ar: null, value: "" }])}><Plus className="size-4" /> Add specification</button>
          </div>
        </Card>

        <Card title="Related products">
          <ProductPicker exclude={[p.id ?? "", ...related.map((r) => r.id)]} onPick={(r) => setRelated([...related, r])} />
          {related.length > 0 && (
            <ul className="mt-3 divide-y divide-line">
              {related.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="relative size-9 overflow-hidden rounded-md bg-cloud">{r.image && <Image src={r.image} alt="" fill sizes="36px" className="object-contain" />}</span>
                  <span className="flex-1 truncate">{r.name}</span>
                  <button type="button" onClick={() => setRelated(related.filter((x) => x.id !== r.id))} className="text-muted hover:text-danger" aria-label="Remove"><X className="size-4" /></button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted">When empty, products from the same categories are shown automatically.</p>
        </Card>

        <Card title="Internal notes">
          <textarea className="field min-h-20" value={p.admin_notes ?? ""} onChange={(e) => set("admin_notes", e.target.value)} placeholder="Only visible in the dashboard" />
        </Card>
      </div>

      {/* sidebar */}
      <div className="flex flex-col gap-4 xl:sticky xl:top-6 xl:self-start">
        <Card>
          <div className="flex flex-col gap-4">
            <Toggle checked={p.is_published} onChange={(v) => set("is_published", v)} label="Published" help="Visible on the storefront" />
            <Toggle checked={p.is_featured} onChange={(v) => set("is_featured", v)} label="Featured" />
            <Toggle checked={p.is_best_seller} onChange={(v) => set("is_best_seller", v)} label="Best seller" />
            <Toggle checked={p.is_new_arrival} onChange={(v) => set("is_new_arrival", v)} label="New arrival" />
            <Toggle checked={p.bundle_eligible} onChange={(v) => set("bundle_eligible", v)} label="Can be added to bundles" />
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <button type="submit" className="btn btn-primary w-full" disabled={pending}>{pending ? "Saving…" : "Save product"}</button>
            {p.id && p.is_published && <Link href={`/products/${p.slug}`} target="_blank" className="btn btn-ghost w-full"><ExternalLink className="size-4" /> View on store</Link>}
            {p.id && (
              <ConfirmButton className="btn w-full text-danger" message="Delete this product permanently? Past orders keep their copy of the details."
                onConfirm={async () => { const r = await deleteProduct(p.id!); if (r.ok) { toast("Product deleted"); router.push("/admin/products"); } else toast(r.error, "error"); }}>
                Delete product
              </ConfirmButton>
            )}
          </div>
        </Card>
        <Card title="Where this product appears">
          <ul className="flex flex-col gap-2 text-sm">
            {preview.map((x, i) => (
              <li key={i} className={cn("flex gap-2", x.tone === "warn" && "text-warn", x.tone === "off" && "font-medium text-danger")}>
                {x.tone === "ok" ? <Check className="mt-0.5 size-4 shrink-0 text-success" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}
                <span>{x.text}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </form>
  );
}

function Chips({ options, value, onChange }: { options: Opt[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const i = value.indexOf(o.value);
        return (
          <button key={o.value} type="button" aria-pressed={i >= 0} onClick={() => onChange(i >= 0 ? value.filter((v) => v !== o.value) : [...value, o.value])}
            className={cn("h-9 rounded-full border px-3.5 text-sm transition-colors", i >= 0 ? "border-navy bg-navy text-white" : "border-line bg-white hover:border-navy")}>
            {i === 0 && value.length > 1 ? "★ " : ""}{o.label}
          </button>
        );
      })}
    </div>
  );
}

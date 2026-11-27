"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ExternalLink, X } from "lucide-react";
import { useState, useTransition } from "react";
import { adminProductVariants, deleteBundle, saveBundle, type BundleData } from "@/lib/admin/catalog-actions";
import { formatPrice } from "@/lib/i18n";
import { cn, slugify } from "@/lib/utils";
import { Card, ConfirmButton, Field, ImageInput, ImageListInput, ProductPicker, Toggle, useToast } from "./ui";

export type BundleItemRow = {
  product_id: string; name: string; image: string | null; unit_price: number; quantity: number;
  variant_id: string | null; variants: { id: string; label: string; price: number }[];
};
export type BundleFormData = Omit<BundleData, "items">;

export function BundleForm({ initial, items: initialItems, years }: {
  initial: BundleFormData; items: BundleItemRow[]; years: { value: string; label: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [b, setB] = useState(initial);
  const [items, setItems] = useState(initialItems);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [pending, start] = useTransition();
  const set = <K extends keyof BundleFormData>(k: K, v: BundleFormData[K]) => setB((s) => ({ ...s, [k]: v }));

  const itemsValue = items.reduce((n, i) => {
    const vp = i.variants.find((v) => v.id === i.variant_id)?.price;
    return n + (vp ?? i.unit_price) * i.quantity;
  }, 0);
  const computed = b.pricing_mode === "fixed" ? b.price ?? 0 : Math.round(itemsValue * (1 - (b.discount_percent || 0) / 100) * 100) / 100;

  const save = () => start(async () => {
    const res = await saveBundle({ ...b, items: items.map((i) => ({ product_id: i.product_id, variant_id: i.variant_id, quantity: i.quantity })) });
    if (!res.ok) { toast(res.error, "error"); return; }
    toast("Bundle saved");
    if (!b.id && res.id) router.replace(`/admin/bundles/${res.id}`); else router.refresh();
  });

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  };

  return (
    <form className="grid gap-6 xl:grid-cols-[1fr_22rem]" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <div className="flex min-w-0 flex-col gap-6">
        <Card title="Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name (English)"><input className="field" dir="ltr" required value={b.name_en} onChange={(e) => { set("name_en", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} /></Field>
            <Field label="Name (Arabic)"><input className="field" dir="rtl" value={b.name_ar ?? ""} onChange={(e) => set("name_ar", e.target.value)} /></Field>
            <Field label="URL slug" help={`/bundles/${b.slug || "…"}`}><input className="field" dir="ltr" value={b.slug} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }} /></Field>
            <Field label="Type" help="Clinic setups appear on the Clinic setup page and in the Students/Dentists sections.">
              <select className="field" value={b.kind} onChange={(e) => set("kind", e.target.value as BundleFormData["kind"])}>
                <option value="kit">Student kit</option>
                <option value="clinic_setup">Clinic setup package</option>
              </select>
            </Field>
            <Field label="For">
              <select className="field" value={b.audience} onChange={(e) => set("audience", e.target.value as BundleFormData["audience"])}>
                <option value="student">Students</option>
                <option value="dentist">Dentists</option>
                <option value="both">Both</option>
              </select>
            </Field>
            <Field label="Academic year">
              <select className="field" value={b.year_id ?? ""} onChange={(e) => set("year_id", e.target.value || null)}>
                <option value="">Not tied to a year</option>
                {years.map((y) => <option key={y.value} value={y.value}>{y.label}</option>)}
              </select>
            </Field>
            <Field label="Description (English)"><textarea className="field min-h-28" dir="ltr" value={b.description_en ?? ""} onChange={(e) => set("description_en", e.target.value)} /></Field>
            <Field label="Description (Arabic)"><textarea className="field min-h-28" dir="rtl" value={b.description_ar ?? ""} onChange={(e) => set("description_ar", e.target.value)} /></Field>
          </div>
        </Card>

        <Card title={`Included products (${items.reduce((n, i) => n + i.quantity, 0)} items)`}>
          <ProductPicker exclude={items.map((i) => i.product_id)} onPick={async (p) => {
            const vs = await adminProductVariants(p.id);
            const variants = vs.filter((v) => v.is_active).map((v) => ({ id: v.id, label: Object.values(v.options).join(" / "), price: Number(v.price) }));
            setItems((s) => [...s, { product_id: p.id, name: p.name, image: p.image, unit_price: p.price, quantity: 1, variant_id: variants[0]?.id ?? null, variants }]);
          }} />
          {items.length > 0 ? (
            <ul className="mt-4 divide-y divide-line">
              {items.map((i, idx) => (
                <li key={i.product_id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="relative size-12 overflow-hidden rounded-lg bg-cloud">{i.image && <Image src={i.image} alt="" fill sizes="48px" className="object-contain p-1" />}</span>
                  <span className="min-w-40 flex-1 text-sm">{i.name}</span>
                  {i.variants.length > 0 && (
                    <select className="field !min-h-9 !w-auto text-sm" value={i.variant_id ?? ""} aria-label="Option" onChange={(e) => setItems(items.map((x) => (x.product_id === i.product_id ? { ...x, variant_id: e.target.value || null } : x)))}>
                      {i.variants.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                    </select>
                  )}
                  <label className="flex items-center gap-1.5 text-sm">Qty
                    <input type="number" min={1} className="field !min-h-9 w-20" value={i.quantity} onChange={(e) => setItems(items.map((x) => (x.product_id === i.product_id ? { ...x, quantity: Math.max(1, Number(e.target.value) || 1) } : x)))} />
                  </label>
                  <span className="w-24 text-end text-sm tabular-nums text-muted">{formatPrice(((i.variants.find((v) => v.id === i.variant_id)?.price) ?? i.unit_price) * i.quantity, "en")}</span>
                  <span className="flex">
                    <button type="button" onClick={() => move(idx, -1)} className="grid size-8 place-items-center text-muted hover:text-navy" aria-label="Move up"><ArrowUp className="size-4" /></button>
                    <button type="button" onClick={() => move(idx, 1)} className="grid size-8 place-items-center text-muted hover:text-navy" aria-label="Move down"><ArrowDown className="size-4" /></button>
                    <button type="button" onClick={() => setItems(items.filter((x) => x.product_id !== i.product_id))} className="grid size-8 place-items-center text-muted hover:text-danger" aria-label="Remove"><X className="size-4" /></button>
                  </span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-4 text-sm text-muted">Search above to add the products in this kit.</p>}
        </Card>

        <Card title="Images">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <Field label="Main image"><ImageInput value={b.image_url} onChange={(v) => set("image_url", v)} folder="bundles" aspect="aspect-[4/3]" /></Field>
            <div><p className="label">Gallery</p><ImageListInput value={b.gallery} onChange={(v) => set("gallery", v)} folder="bundles" /></div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-4 xl:sticky xl:top-6 xl:self-start">
        <Card title="Pricing">
          <div className="inline-flex w-full rounded-full bg-cloud p-1">
            {(["fixed", "sum_of_items"] as const).map((m) => (
              <button key={m} type="button" aria-pressed={b.pricing_mode === m} onClick={() => set("pricing_mode", m)}
                className={cn("h-9 flex-1 rounded-full text-sm", b.pricing_mode === m ? "bg-navy text-white" : "text-ink")}>{m === "fixed" ? "Fixed price" : "From items"}</button>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {b.pricing_mode === "fixed" ? (
              <>
                <Field label="Bundle price (EGP)"><input type="number" step="0.01" min="0" className="field" value={b.price ?? ""} onChange={(e) => set("price", e.target.value === "" ? null : Number(e.target.value))} /></Field>
                <Field label="Original price (optional)" help="Shown struck through. If empty, the items' total value is used."><input type="number" step="0.01" min="0" className="field" value={b.compare_at_price ?? ""} onChange={(e) => set("compare_at_price", e.target.value === "" ? null : Number(e.target.value))} /></Field>
              </>
            ) : (
              <Field label="Discount on items total (%)" help="Price updates automatically when product prices change."><input type="number" min="0" max="90" className="field" value={b.discount_percent} onChange={(e) => set("discount_percent", Number(e.target.value))} /></Field>
            )}
            <dl className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-cloud p-3 text-sm">
              <dt className="text-muted">Items value</dt><dd className="text-end tabular-nums">{formatPrice(itemsValue, "en")}</dd>
              <dt className="font-medium">Bundle price</dt><dd className="text-end font-semibold tabular-nums text-navy">{formatPrice(computed, "en")}</dd>
              {itemsValue > computed && <><dt className="text-muted">Customer saves</dt><dd className="text-end tabular-nums text-success">{formatPrice(itemsValue - computed, "en")}</dd></>}
            </dl>
          </div>
        </Card>
        <Card>
          <div className="flex flex-col gap-4">
            <Toggle checked={b.is_published} onChange={(v) => set("is_published", v)} label="Published" />
            <Toggle checked={b.is_featured} onChange={(v) => set("is_featured", v)} label="Featured" />
            <Field label="Sort order"><input type="number" className="field" value={b.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} /></Field>
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Saving…" : "Save bundle"}</button>
            {b.id && b.is_published && <Link href={`/bundles/${b.slug}`} target="_blank" className="btn btn-ghost w-full"><ExternalLink className="size-4" /> View on store</Link>}
            {b.id && <ConfirmButton className="btn w-full text-danger" onConfirm={async () => { const r = await deleteBundle(b.id!); if (r.ok) { toast("Bundle deleted"); router.push("/admin/bundles"); } else toast(r.error, "error"); }}>Delete bundle</ConfirmButton>}
          </div>
        </Card>
      </div>
    </form>
  );
}

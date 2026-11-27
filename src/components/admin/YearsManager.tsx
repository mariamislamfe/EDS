"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteYear, saveYear, type YearData } from "@/lib/admin/catalog-actions";
import { slugify } from "@/lib/utils";
import { Badge, Card, ConfirmButton, Field, ImageInput, ProductPicker, Toggle, useToast } from "./ui";

export type YearRow = YearData & { product_count: number; checklist_names: Record<string, string> };

const blank = (n: number): YearRow => ({
  id: null, slug: "", number: n, name_en: "", name_ar: "", tagline_en: "", tagline_ar: "", intro_en: "", intro_ar: "",
  hero_image_url: null, is_enabled: true, sort_order: n, checklist: [], subjects: [], product_count: 0, checklist_names: {},
});

export function YearsManager({ years }: { years: YearRow[] }) {
  const [editing, setEditing] = useState<YearRow | null>(null);
  return (
    <>
      <div className="mb-4 flex justify-end">
        <button className="btn btn-primary btn-sm" onClick={() => setEditing(blank((years.at(-1)?.number ?? 0) + 1))}><Plus className="size-4" /> Add year</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {years.map((y) => (
          <button key={y.id} onClick={() => setEditing(y)} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 text-start transition-colors hover:border-navy">
            <div className="flex items-start justify-between">
              <span className="font-display text-5xl font-extrabold leading-none tracking-[-0.05em] text-teal">{y.number}</span>
              {y.is_enabled ? <Badge tone="ok">Enabled</Badge> : <Badge>Hidden</Badge>}
            </div>
            <span className="font-semibold text-navy">{y.name_en} <span className="font-normal text-muted">· {y.name_ar}</span></span>
            <span className="text-sm text-muted">{y.product_count} products · {y.subjects.length} subjects · {y.checklist.length} checklist items</span>
          </button>
        ))}
      </div>
      {editing && <YearEditor year={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function YearEditor({ year, onClose }: { year: YearRow; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [y, setY] = useState(year);
  const [names, setNames] = useState(year.checklist_names);
  const [pending, start] = useTransition();
  const set = <K extends keyof YearRow>(k: K, v: YearRow[K]) => setY((s) => ({ ...s, [k]: v }));
  const save = () => start(async () => {
    const { product_count: _a, checklist_names: _b, ...payload } = y;
    const r = await saveYear(payload);
    if (r.ok) { toast("Year saved"); onClose(); router.refresh(); } else toast(r.error, "error");
  });

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-navy-deep/30" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Edit academic year" className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-lg font-semibold">{y.id ? `Edit ${year.name_en}` : "New academic year"}</h2>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-full hover:bg-cloud" aria-label="Close"><X className="size-5" /></button>
        </div>
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Number"><input type="number" min={1} className="field" value={y.number} onChange={(e) => set("number", Number(e.target.value))} /></Field>
            <Field label="Name (English)"><input className="field" value={y.name_en} onChange={(e) => { set("name_en", e.target.value); if (!y.id) set("slug", slugify(e.target.value)); }} /></Field>
            <Field label="Name (Arabic)"><input className="field" dir="rtl" value={y.name_ar ?? ""} onChange={(e) => set("name_ar", e.target.value)} /></Field>
            <Field label="URL slug" help={`/students/${y.slug || "…"}`} className="sm:col-span-2"><input className="field" dir="ltr" value={y.slug} onChange={(e) => set("slug", e.target.value)} /></Field>
            <Field label="Sort order"><input type="number" className="field" value={y.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} /></Field>
          </div>
          <Toggle checked={y.is_enabled} onChange={(v) => set("is_enabled", v)} label="Enabled" help="Disabled years are hidden from navigation and their page returns 404." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tagline (English)"><input className="field" value={y.tagline_en ?? ""} onChange={(e) => set("tagline_en", e.target.value)} /></Field>
            <Field label="Tagline (Arabic)"><input className="field" dir="rtl" value={y.tagline_ar ?? ""} onChange={(e) => set("tagline_ar", e.target.value)} /></Field>
            <Field label="Introduction (English)"><textarea className="field min-h-28" value={y.intro_en ?? ""} onChange={(e) => set("intro_en", e.target.value)} /></Field>
            <Field label="Introduction (Arabic)"><textarea className="field min-h-28" dir="rtl" value={y.intro_ar ?? ""} onChange={(e) => set("intro_ar", e.target.value)} /></Field>
          </div>
          <Field label="Hero image (optional)"><ImageInput value={y.hero_image_url} onChange={(v) => set("hero_image_url", v)} folder="years" aspect="aspect-[21/8]" /></Field>

          <Card title="Subjects (المواد)">
            <p className="mb-3 text-sm text-muted">Split this year into its subjects (e.g. Dental Anatomy, Histology, Operative). On the year page students pick a subject and see only its tools. Assign products to subjects in each product&apos;s editor.</p>
            <ul className="flex flex-col gap-2">
              {y.subjects.map((sub, i) => {
                const upd = (patch: Partial<typeof sub>) => set("subjects", y.subjects.map((x, k) => (k === i ? { ...x, ...patch } : x)));
                return (
                  <li key={sub.id ?? `new-${i}`} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1fr_1fr_auto]">
                    <input className="field !min-h-9" placeholder="Subject (English)" value={sub.name_en} onChange={(e) => upd({ name_en: e.target.value, ...(sub.id ? {} : { slug: slugify(e.target.value) }) })} />
                    <input className="field !min-h-9" dir="rtl" placeholder="المادة (عربي)" value={sub.name_ar ?? ""} onChange={(e) => upd({ name_ar: e.target.value })} />
                    <div className="flex gap-1">
                      <button type="button" className="btn btn-ghost btn-sm" disabled={i === 0} onClick={() => { const a = [...y.subjects]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; set("subjects", a); }} aria-label="Move up">↑</button>
                      <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => set("subjects", y.subjects.filter((_, k) => k !== i))}>Remove</button>
                    </div>
                    <input className="field !min-h-9 sm:col-span-2" placeholder="Short description (optional)" value={sub.description_en ?? ""} onChange={(e) => upd({ description_en: e.target.value })} />
                    <input className="field !min-h-9 font-mono text-xs" dir="ltr" placeholder="url-slug" value={sub.slug} onChange={(e) => upd({ slug: e.target.value })} />
                  </li>
                );
              })}
            </ul>
            <button type="button" className="btn btn-ghost btn-sm mt-3" onClick={() => set("subjects", [...y.subjects, { id: null, slug: "", name_en: "", name_ar: null, description_en: null, image_url: null }])}><Plus className="size-4" /> Add subject</button>
          </Card>

          <Card title="Required tools checklist">
            <p className="mb-3 text-sm text-muted">Optional. Students tick items off on the year page. Link a product so they can buy it directly.</p>
            <ul className="flex flex-col gap-2">
              {y.checklist.map((c, i) => (
                <li key={i} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-2">
                  <input className="field !min-h-9" placeholder="Item (English)" value={c.label_en} onChange={(e) => set("checklist", y.checklist.map((x, k) => (k === i ? { ...x, label_en: e.target.value } : x)))} />
                  <input className="field !min-h-9" dir="rtl" placeholder="Item (Arabic)" value={c.label_ar ?? ""} onChange={(e) => set("checklist", y.checklist.map((x, k) => (k === i ? { ...x, label_ar: e.target.value } : x)))} />
                  <div className="flex items-center gap-2 sm:col-span-2">
                    {c.product_id ? (
                      <span className="flex flex-1 items-center gap-2 text-sm">Linked: <span className="font-medium">{names[c.product_id] ?? "product"}</span>
                        <button type="button" className="text-muted hover:text-danger" onClick={() => set("checklist", y.checklist.map((x, k) => (k === i ? { ...x, product_id: null } : x)))} aria-label="Unlink"><X className="size-4" /></button></span>
                    ) : (
                      <div className="flex-1"><ProductPicker placeholder="Link a product (optional)" onPick={(p) => { setNames({ ...names, [p.id]: p.name }); set("checklist", y.checklist.map((x, k) => (k === i ? { ...x, product_id: p.id } : x))); }} /></div>
                    )}
                    <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => set("checklist", y.checklist.filter((_, k) => k !== i))}>Remove</button>
                  </div>
                </li>
              ))}
            </ul>
            <button type="button" className="btn btn-ghost btn-sm mt-3" onClick={() => set("checklist", [...y.checklist, { label_en: "", label_ar: null, product_id: null }])}><Plus className="size-4" /> Add item</button>
          </Card>
          {y.id && <Link href={`/admin/products?year=${y.id}`} className="text-sm font-medium text-teal-strong hover:underline">Manage the {year.product_count} products assigned to this year →</Link>}
        </div>
        <div className="flex items-center justify-between border-t border-line px-6 py-4">
          {y.id ? <ConfirmButton message="Delete this year? Products stay in the catalog but lose this assignment." onConfirm={async () => { const r = await deleteYear(y.id!); if (r.ok) { toast("Year deleted"); onClose(); router.refresh(); } else toast(r.error, "error"); }}>Delete</ConfirmButton> : <span />}
          <div className="flex gap-2"><button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-primary btn-sm" onClick={save} disabled={pending}>{pending ? "Saving…" : "Save"}</button></div>
        </div>
      </div>
    </div>
  );
}

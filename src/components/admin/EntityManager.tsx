"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { ENTITIES, type EntityKey, type FieldDef } from "@/lib/admin/entities";
import { deleteEntity, saveEntity } from "@/lib/admin/actions";
import { slugify } from "@/lib/utils";
import { Badge, ChipSelect, ConfirmButton, Field, ImageInput, Toggle, useToast } from "./ui";

type Row = Record<string, unknown> & { id: string };
type Options = Record<string, { value: string; label: string }[]>;

function toLocalInput(v: unknown) {
  if (!v) return "";
  const d = new Date(String(v));
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export function EntityManager({ entity, rows, options = {}, extraColumns }: {
  entity: EntityKey; rows: Row[]; options?: Options; extraColumns?: Record<string, (r: Row) => React.ReactNode>;
}) {
  const def = ENTITIES[entity];
  const fields = def.fields as FieldDef[];
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [pending, start] = useTransition();
  const [slugTouched, setSlugTouched] = useState(false);

  const open = (r: Row | "new") => {
    setEditing(r);
    setSlugTouched(r !== "new");
    if (r === "new") {
      const init: Record<string, unknown> = {};
      fields.forEach((f) => { init[f.name] = f.type === "boolean" ? true : f.type === "multiselect" ? [] : f.type === "select" && f.required ? f.options?.[0]?.value ?? "" : ""; });
      setForm(init);
    } else {
      const init: Record<string, unknown> = {};
      fields.forEach((f) => { init[f.name] = f.type === "datetime" ? toLocalInput(r[f.name]) : r[f.name] ?? (f.type === "multiselect" ? [] : f.type === "boolean" ? false : ""); });
      setForm(init);
    }
  };

  const set = (name: string, v: unknown) => setForm((f) => {
    const next = { ...f, [name]: v };
    const nameField = fields.find((x) => x.name === "name_en" || x.name === "name");
    if (!slugTouched && nameField?.name === name && fields.some((x) => x.type === "slug")) next.slug = slugify(String(v));
    return next;
  });

  const save = () => start(async () => {
    const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => {
      const f = fields.find((x) => x.name === k);
      if (f?.type === "datetime") return [k, v ? new Date(String(v)).toISOString() : null];
      return [k, v];
    }));
    const res = await saveEntity(entity, editing === "new" ? null : (editing as Row).id, payload);
    if (res.ok) { toast(`Saved ${def.singular}`); setEditing(null); router.refresh(); }
    else toast(res.error, "error");
  });

  const cell = (r: Row, col: string) => {
    if (extraColumns?.[col]) return extraColumns[col](r);
    const v = r[col];
    if (typeof v === "boolean") return v ? <Badge tone="ok">Yes</Badge> : <Badge>No</Badge>;
    if (v == null || v === "") return <span className="text-muted">—</span>;
    if (/_at$/.test(col)) return new Date(String(v)).toLocaleDateString("en-GB");
    if (col === "quote") return <span className="line-clamp-1 max-w-sm">{String(v)}</span>;
    return String(v);
  };
  const label = (col: string) => fields.find((f) => f.name === col)?.label ?? col.replace(/_/g, " ");

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button className="btn btn-primary btn-sm" onClick={() => open("new")}><Plus className="size-4" /> New {def.singular}</button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-cloud/60 text-left text-xs text-muted">
            <tr>{[...def.columns, ...Object.keys(extraColumns ?? {}).filter((c) => !(def.columns as string[]).includes(c))].map((c) => <th key={c} className="px-4 py-3 font-medium">{label(c)}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className="cursor-pointer hover:bg-cloud/50" onClick={() => open(r)}>
                {[...def.columns, ...Object.keys(extraColumns ?? {}).filter((c) => !(def.columns as string[]).includes(c))].map((c) => <td key={c} className="px-4 py-3">{cell(r, c)}</td>)}
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={def.columns.length + 1} className="px-4 py-10 text-center text-muted">No {def.title.toLowerCase()} yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-navy-deep/30" onClick={() => setEditing(null)} />
          <div role="dialog" aria-modal="true" aria-label={`Edit ${def.singular}`} className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="text-lg font-semibold">{editing === "new" ? `New ${def.singular}` : `Edit ${def.singular}`}</h2>
              <button onClick={() => setEditing(null)} className="grid size-9 place-items-center rounded-full hover:bg-cloud" aria-label="Close"><X className="size-5" /></button>
            </div>
            <form className="grid flex-1 grid-cols-2 content-start gap-4 overflow-y-auto px-6 py-6" onSubmit={(e) => { e.preventDefault(); save(); }}>
              {fields.map((f) => (
                <div key={f.name} className={f.half ? "col-span-2 sm:col-span-1" : "col-span-2"}>
                  <FieldInput f={f} value={form[f.name]} onChange={(v) => { if (f.type === "slug") setSlugTouched(true); set(f.name, v); }} options={options} scope={String(form.scope ?? "")} />
                </div>
              ))}
            </form>
            <div className="flex items-center justify-between gap-2 border-t border-line px-6 py-4">
              {editing !== "new" ? (
                <ConfirmButton onConfirm={async () => {
                  const r = await deleteEntity(entity, (editing as Row).id);
                  if (r.ok) { toast("Deleted"); setEditing(null); router.refresh(); } else toast(r.error, "error");
                }}>Delete</ConfirmButton>
              ) : <span />}
              <div className="flex gap-2">
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                <button className="btn btn-primary btn-sm" disabled={pending} onClick={save}>{pending ? "Saving…" : "Save"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FieldInput({ f, value, onChange, options, scope }: { f: FieldDef; value: unknown; onChange: (v: unknown) => void; options: Options; scope: string }) {
  const v = value ?? "";
  switch (f.type) {
    case "boolean":
      return <div className="pt-6"><Toggle checked={Boolean(value)} onChange={onChange} label={f.label} help={f.help} /></div>;
    case "textarea":
      return <Field label={f.label} help={f.help}><textarea dir={f.dir} className="field min-h-24" value={String(v)} onChange={(e) => onChange(e.target.value)} /></Field>;
    case "number":
      return <Field label={f.label} help={f.help}><input type="number" step="any" className="field" value={String(v)} onChange={(e) => onChange(e.target.value)} /></Field>;
    case "datetime":
      return <Field label={f.label} help={f.help}><input type="datetime-local" className="field" value={String(v)} onChange={(e) => onChange(e.target.value)} /></Field>;
    case "image":
      return <Field label={f.label} help={f.help}><ImageInput value={(value as string) || null} onChange={onChange} /></Field>;
    case "select": {
      const opts = f.options ?? (f.optionsFrom ? options[f.optionsFrom] ?? [] : []);
      return (
        <Field label={f.label} help={f.help}>
          <select className="field" value={String(v)} onChange={(e) => onChange(e.target.value)}>
            {!f.required && <option value="">—</option>}
            {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
      );
    }
    case "multiselect": {
      const map: Record<string, string> = { category: "categories", brand: "brands", specialty: "specialties", year: "years", products: "products" };
      const opts = options[map[scope] ?? ""] ?? [];
      if (!opts.length) return null;
      return <div><span className="label">{f.label}</span><ChipSelect options={opts} value={(value as string[]) ?? []} onChange={onChange} />{f.help && <p className="mt-1 text-xs text-muted">{f.help}</p>}</div>;
    }
    default:
      return <Field label={f.label} help={f.help}><input dir={f.dir} className="field" value={String(v)} required={f.required} onChange={(e) => onChange(e.target.value)} /></Field>;
  }
}

export function Thumb({ src }: { src: string | null }) {
  return <span className="relative block size-10 overflow-hidden rounded-lg bg-cloud">{src && <Image src={src} alt="" fill sizes="40px" className="object-contain" />}</span>;
}

"use client";
import Image from "next/image";
import { ImagePlus, Loader2, Search, Trash2, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { adminSearchProducts, uploadMedia } from "@/lib/admin/catalog-actions";
import { cn } from "@/lib/utils";

// ---------------- toasts ----------------
type Toast = { id: number; text: string; tone: "ok" | "error" };
const ToastCtx = createContext<(text: string, tone?: "ok" | "error") => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: "ok" | "error" = "ok") => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, text, tone }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), tone === "error" ? 7000 : 3000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[90] flex max-w-sm flex-col gap-2" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} role={t.tone === "error" ? "alert" : "status"} className={cn("animate-rise rounded-xl px-4 py-3 text-sm shadow-lg", t.tone === "error" ? "bg-danger text-white" : "bg-navy text-white")}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------------- layout bits ----------------
export function PageHeader({ title, text, actions }: { title: string; text?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-[-0.02em]">{title}</h1>
        {text && <p className="mt-1.5 max-w-2xl text-muted">{text}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className, actions }: { title?: string; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-line bg-white p-5 sm:p-6", className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, help, children, className }: { label: string; help?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="label">{label}</span>
      {children}
      {help && <span className="mt-1 block text-xs text-muted">{help}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label, help }: { checked: boolean; onChange: (v: boolean) => void; label: string; help?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-navy" : "bg-line")}>
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", checked ? "left-[1.375rem]" : "left-0.5")} />
      </button>
      <span><span className="text-sm font-medium text-ink">{label}</span>{help && <span className="block text-xs text-muted">{help}</span>}</span>
    </label>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "ok" | "warn" | "danger" | "info" }) {
  return (
    <span className={cn("inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-medium",
      tone === "ok" && "bg-success/10 text-success", tone === "warn" && "bg-warn/10 text-warn", tone === "danger" && "bg-danger/10 text-danger",
      tone === "info" && "bg-mist text-teal-strong", tone === "neutral" && "bg-cloud text-muted")}>
      {children}
    </span>
  );
}

export function ConfirmButton({ onConfirm, children, message = "Delete this permanently?", className }: { onConfirm: () => void | Promise<void>; children: React.ReactNode; message?: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" disabled={busy} className={className ?? "btn btn-ghost btn-sm text-danger"}
      onClick={async () => { if (window.confirm(message)) { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } } }}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : children}
    </button>
  );
}

// ---------------- media upload ----------------
async function uploadFile(file: File, folder: string) {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file");
  if (file.size > 8 * 1024 * 1024) throw new Error("Images must be under 8 MB");
  const form = new FormData();
  form.set("file", file);
  form.set("folder", folder);
  const res = await uploadMedia(form);
  if (!res.ok) throw new Error(res.error);
  return res.url;
}

export function ImageInput({ value, onChange, folder = "uploads", aspect = "aspect-video" }: { value: string | null; onChange: (url: string | null) => void; folder?: string; aspect?: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-2">
      <div className={cn("relative overflow-hidden rounded-xl border border-dashed border-line bg-cloud", aspect)}>
        {value ? (
          <>
            <Image src={value} alt="" fill sizes="400px" className="object-contain p-2" />
            <button type="button" onClick={() => onChange(null)} className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-white shadow" aria-label="Remove image"><X className="size-4" /></button>
          </>
        ) : (
          <button type="button" onClick={() => inputRef.current?.click()} className="absolute inset-0 grid place-items-center text-sm text-muted hover:text-navy">
            {busy ? <Loader2 className="size-6 animate-spin" /> : <span className="flex flex-col items-center gap-1"><ImagePlus className="size-6" />Upload image</span>}
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;
        setBusy(true);
        try { onChange(await uploadFile(f, folder)); } catch (err) { toast(String((err as Error).message), "error"); } finally { setBusy(false); }
      }} />
      <input className="field !min-h-9 text-xs" placeholder="…or paste an image URL" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} dir="ltr" />
    </div>
  );
}

export function ImageListInput({ value, onChange, folder = "products" }: { value: string[]; onChange: (v: string[]) => void; folder?: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const move = (i: number, d: -1 | 1) => {
    const next = [...value];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {value.map((src, i) => (
          <li key={src + i} className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-cloud">
            <Image src={src} alt="" fill sizes="160px" className="object-contain p-1.5" />
            {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-navy px-2 py-0.5 text-[0.65rem] text-white">Main</span>}
            <div className="absolute inset-x-1 bottom-1 flex justify-between opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <button type="button" onClick={() => move(i, -1)} className="rounded bg-white px-1.5 text-xs shadow" aria-label="Move earlier">←</button>
              <button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))} className="rounded bg-white px-1.5 text-danger shadow" aria-label="Remove image"><Trash2 className="size-3.5" /></button>
              <button type="button" onClick={() => move(i, 1)} className="rounded bg-white px-1.5 text-xs shadow" aria-label="Move later">→</button>
            </div>
          </li>
        ))}
        <li>
          <button type="button" onClick={() => inputRef.current?.click()} className="grid aspect-square w-full place-items-center rounded-xl border border-dashed border-line text-muted hover:border-navy hover:text-navy">
            {busy ? <Loader2 className="size-5 animate-spin" /> : <span className="flex flex-col items-center gap-1 text-xs"><ImagePlus className="size-5" />Add images</span>}
          </button>
        </li>
      </ul>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
        const files = [...(e.target.files ?? [])];
        e.target.value = "";
        if (!files.length) return;
        setBusy(true);
        try {
          const urls: string[] = [];
          for (const f of files) urls.push(await uploadFile(f, folder));
          onChange([...value, ...urls]);
        } catch (err) { toast(String((err as Error).message), "error"); } finally { setBusy(false); }
      }} />
      <div className="flex gap-2">
        <input className="field !min-h-9 text-xs" dir="ltr" placeholder="Add an image by URL" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { if (/^https?:\/\//.test(url)) { onChange([...value, url.trim()]); setUrl(""); } }}>Add</button>
      </div>
    </div>
  );
}

// ---------------- multi select (chips) ----------------
export function ChipSelect({ options, value, onChange }: { options: { value: string; label: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button key={o.value} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
            className={cn("h-9 rounded-full border px-3.5 text-sm transition-colors", on ? "border-navy bg-navy text-white" : "border-line bg-white hover:border-navy")}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------- product picker ----------------
export type PickedProduct = { id: string; name: string; image: string | null; price: number; published?: boolean };

export function ProductPicker({ onPick, exclude = [], placeholder = "Search products to add…" }: { onPick: (p: PickedProduct) => void; exclude?: string[]; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<PickedProduct[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(async () => setItems(await adminSearchProducts(q)), 200);
    return () => clearTimeout(timer);
  }, [q, open]);
  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input className="field ps-9" value={q} placeholder={placeholder} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} onChange={(e) => setQ(e.target.value)} />
      </div>
      {open && items.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-xl">
          {items.filter((p) => !exclude.includes(p.id)).map((p) => (
            <li key={p.id}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(p); setQ(""); }}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-start text-sm hover:bg-cloud">
                <span className="relative size-9 shrink-0 overflow-hidden rounded-md bg-cloud">{p.image && <Image src={p.image} alt="" fill sizes="36px" className="object-contain" />}</span>
                <span className="flex-1 truncate">{p.name}</span>
                {!p.published && <Badge>Draft</Badge>}
                <span className="tabular-nums text-muted">{p.price}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

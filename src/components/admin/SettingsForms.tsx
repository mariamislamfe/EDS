"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveSetting } from "@/lib/admin/catalog-actions";
import { updateAdminPassword } from "@/lib/admin/session-actions";
import type { PaymentMethod, StoreSettings } from "@/lib/types";
import { Card, Field, ImageInput, Toggle, useToast } from "./ui";

function useSaver(key: string) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const save = (value: unknown) => start(async () => {
    const r = await saveSetting(key, value);
    if (r.ok) { toast("Saved — the storefront is updated"); router.refresh(); }
    else toast(r.error === "forbidden" ? "Your session expired — sign in again" : r.error, "error");
  });
  return { pending, save };
}

const SaveBtn = ({ pending }: { pending: boolean }) => <button className="btn btn-primary btn-sm w-fit" disabled={pending}>{pending ? "Saving…" : "Save"}</button>;

export function HeroForm({ value }: { value: { title_en?: string; title_ar?: string; subtitle_en?: string; subtitle_ar?: string; student_image?: string | null; dentist_image?: string | null } }) {
  const [v, setV] = useState({ title_en: "", title_ar: "", subtitle_en: "", subtitle_ar: "", student_image: null as string | null, dentist_image: null as string | null, ...value });
  const { pending, save } = useSaver("home_hero");
  return (
    <Card title="Homepage hero & audience cards">
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save(v); }}>
        <Field label="Headline (English)"><input className="field" value={v.title_en} onChange={(e) => setV({ ...v, title_en: e.target.value })} /></Field>
        <Field label="Headline (Arabic)"><input className="field" dir="rtl" value={v.title_ar} onChange={(e) => setV({ ...v, title_ar: e.target.value })} /></Field>
        <Field label="Supporting text (English)"><textarea className="field min-h-20" value={v.subtitle_en} onChange={(e) => setV({ ...v, subtitle_en: e.target.value })} /></Field>
        <Field label="Supporting text (Arabic)"><textarea className="field min-h-20" dir="rtl" value={v.subtitle_ar} onChange={(e) => setV({ ...v, subtitle_ar: e.target.value })} /></Field>
        <Field label="“For dental students” card photo" help="Optional. Without a photo, the card shows products assigned to students."><ImageInput value={v.student_image} onChange={(x) => setV({ ...v, student_image: x })} folder="content" /></Field>
        <Field label="“For dentists” card photo" help="Optional. Without a photo, the card shows equipment products."><ImageInput value={v.dentist_image} onChange={(x) => setV({ ...v, dentist_image: x })} folder="content" /></Field>
        <p className="text-xs text-muted sm:col-span-2">The storefront is English-only: the English headline and text are shown. The last word of the headline is set in the italic accent (e.g. “Precision Starts <em>Here.</em>”). The 3D tooth and instruments beside it are built in.</p>
        <SaveBtn pending={pending} />
      </form>
    </Card>
  );
}

export function AnnouncementForm({ value }: { value: { enabled: boolean; text_en: string; text_ar: string; href: string | null } }) {
  const [v, setV] = useState({ enabled: Boolean(value.enabled), text_en: value.text_en ?? "", text_ar: value.text_ar ?? "", href: value.href ?? "" });
  const { pending, save } = useSaver("announcement");
  return (
    <Card title="Announcement bar">
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save(v); }}>
        <div className="sm:col-span-2"><Toggle checked={v.enabled} onChange={(x) => setV({ ...v, enabled: x })} label="Show the announcement bar" /></div>
        <Field label="Text (English)"><input className="field" maxLength={200} value={v.text_en} onChange={(e) => setV({ ...v, text_en: e.target.value })} /></Field>
        <Field label="Text (Arabic)"><input className="field" dir="rtl" maxLength={200} value={v.text_ar} onChange={(e) => setV({ ...v, text_ar: e.target.value })} /></Field>
        <Field label="Link (optional)" help="e.g. /bundles"><input className="field" dir="ltr" value={v.href} onChange={(e) => setV({ ...v, href: e.target.value })} /></Field>
        <div className="flex items-end"><SaveBtn pending={pending} /></div>
      </form>
    </Card>
  );
}

const SECTIONS: [string, string][] = [
  ["years", "Shop by academic year"], ["bundles", "Student kits"], ["categories", "Professional categories"], ["best_sellers", "Best sellers"],
  ["brands", "Brands"], ["new_arrivals", "New arrivals"], ["why", "Why EDS"], ["promo", "Promotional banner"], ["testimonials", "Testimonials"], ["contact", "Contact block"],
];

export function SectionsForm({ value }: { value: Record<string, boolean> }) {
  const [v, setV] = useState<Record<string, boolean>>(Object.fromEntries(SECTIONS.map(([k]) => [k, value[k] !== false])));
  const { pending, save } = useSaver("home_sections");
  return (
    <Card title="Homepage sections">
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); save(v); }}>
        <p className="text-sm text-muted">Sections with no content (e.g. no bundles or no testimonials yet) hide themselves automatically.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {SECTIONS.map(([k, label]) => <Toggle key={k} checked={v[k]} onChange={(x) => setV({ ...v, [k]: x })} label={label} />)}
        </div>
        <SaveBtn pending={pending} />
      </form>
    </Card>
  );
}

export function StoreForm({ value }: { value: StoreSettings }) {
  const [v, setV] = useState(value);
  const { pending, save } = useSaver("store");
  const f = (k: keyof StoreSettings, label: string, opts: { dir?: "rtl" | "ltr"; help?: string } = {}) => (
    <Field label={label} help={opts.help}><input className="field" dir={opts.dir} value={(v[k] as string) ?? ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></Field>
  );
  return (
    <Card title="Store & contact details">
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save(v); }}>
        {f("name_en", "Store name (English)")}{f("name_ar", "Store name (Arabic)", { dir: "rtl" })}
        {f("phone", "Phone", { dir: "ltr" })}{f("whatsapp", "WhatsApp number", { dir: "ltr", help: "With country code, e.g. 201xxxxxxxxx" })}
        {f("email", "Email", { dir: "ltr" })}{f("instagram", "Instagram URL", { dir: "ltr" })}
        {f("facebook", "Facebook URL", { dir: "ltr" })}<span />
        {f("address_en", "Address (English)")}{f("address_ar", "Address (Arabic)", { dir: "rtl" })}
        {f("working_hours_en", "Working hours (English)")}{f("working_hours_ar", "Working hours (Arabic)", { dir: "rtl" })}
        <p className="text-xs text-muted sm:col-span-2">Only filled-in channels appear in the footer and contact section.</p>
        <SaveBtn pending={pending} />
      </form>
    </Card>
  );
}

export function PaymentsForm({ value }: { value: PaymentMethod[] }) {
  const [v, setV] = useState(value);
  const { pending, save } = useSaver("payment_methods");
  const upd = (i: number, patch: Partial<PaymentMethod>) => setV(v.map((m, k) => (k === i ? { ...m, ...patch } : m)));
  return (
    <Card title="Payment methods">
      <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); save(v); }}>
        <p className="text-sm text-muted">These are manual methods: customers choose one at checkout and you confirm payment yourself, then mark the order as paid. Online card payments need a payment provider account (see README → Payments).</p>
        {v.map((m, i) => (
          <div key={m.id} className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Toggle checked={m.enabled} onChange={(x) => upd(i, { enabled: x })} label={`${m.label_en} (${m.id})`} /></div>
            <Field label="Label (English)"><input className="field" value={m.label_en} onChange={(e) => upd(i, { label_en: e.target.value })} /></Field>
            <Field label="Label (Arabic)"><input className="field" dir="rtl" value={m.label_ar} onChange={(e) => upd(i, { label_ar: e.target.value })} /></Field>
            <Field label="Instructions (English)" help="Shown at checkout and on the confirmation page, e.g. the InstaPay handle to transfer to."><textarea className="field min-h-20" value={m.instructions_en} onChange={(e) => upd(i, { instructions_en: e.target.value })} /></Field>
            <Field label="Instructions (Arabic)"><textarea className="field min-h-20" dir="rtl" value={m.instructions_ar} onChange={(e) => upd(i, { instructions_ar: e.target.value })} /></Field>
          </div>
        ))}
        <SaveBtn pending={pending} />
      </form>
    </Card>
  );
}

export function CheckoutShippingForm({ checkout, shipping }: { checkout: { email_required: boolean }; shipping: { free_shipping_threshold: number | null } }) {
  const [email, setEmail] = useState(checkout.email_required);
  const [free, setFree] = useState(shipping.free_shipping_threshold == null ? "" : String(shipping.free_shipping_threshold));
  const a = useSaver("checkout");
  const b = useSaver("shipping");
  return (
    <Card title="Checkout & shipping">
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); a.save({ email_required: email }); b.save({ free_shipping_threshold: free === "" ? null : Number(free) }); }}>
        <Toggle checked={email} onChange={setEmail} label="Require an email address at checkout" help="Phone number is always required." />
        <Field label="Free shipping for orders above (EGP)" help="Leave empty to always charge the governorate fee."><input type="number" min="0" className="field max-w-xs" value={free} onChange={(e) => setFree(e.target.value)} /></Field>
        <SaveBtn pending={a.pending || b.pending} />
      </form>
    </Card>
  );
}

export function MetaPixelForm({ value }: { value: { ids: string[] } }) {
  const [ids, setIds] = useState<string[]>(value.ids?.length ? value.ids : []);
  const [error, setError] = useState<string | null>(null);
  const { pending, save } = useSaver("meta_pixel");
  const clean = ids.map((x) => x.trim()).filter(Boolean);
  return (
    <Card title="Meta Pixel">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (clean.some((x) => !/^\d{5,20}$/.test(x))) { setError("Pixel IDs contain digits only."); return; }
          setError(null);
          save({ ids: clean });
        }}
      >
        <p className="text-sm text-muted">
          Add up to 5 Pixel IDs (Events Manager → Data sources). The storefront sends PageView, AddToCart, InitiateCheckout and Purchase
          (with order value and order number). Leave empty to turn tracking off.
        </p>
        {ids.map((id, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="field max-w-xs font-mono" inputMode="numeric" placeholder="e.g. 123456789012345" value={id}
              aria-label={`Pixel ID ${i + 1}`} aria-invalid={id.trim() !== "" && !/^\d{5,20}$/.test(id.trim())}
              onChange={(e) => setIds(ids.map((x, j) => (j === i ? e.target.value.replace(/[^\d]/g, "") : x)))}
            />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIds(ids.filter((_, j) => j !== i))}>Remove</button>
          </div>
        ))}
        {ids.length < 5 && (
          <button type="button" className="btn btn-ghost btn-sm w-fit" onClick={() => setIds([...ids, ""])}>+ Add Pixel ID</button>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        <SaveBtn pending={pending} />
      </form>
    </Card>
  );
}

export function PasswordForm() {
  const toast = useToast();
  const empty = { current: "", next: "", confirm: "" };
  const [v, setV] = useState(empty);
  const [pending, start] = useTransition();
  const input = (k: keyof typeof v, label: string, help?: string) => (
    <Field label={label} help={help}>
      <input className="field" type="password" dir="ltr" required minLength={k === "current" ? 1 : 6}
        autoComplete={k === "current" ? "current-password" : "new-password"} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
    </Field>
  );
  return (
    <Card title="Dashboard password">
      <form className="grid gap-4 sm:grid-cols-3" onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await updateAdminPassword(v);
          if (r.ok) { toast("Password changed — other devices were signed out"); setV(empty); } else toast(r.error, "error");
        });
      }}>
        {input("current", "Current password", "The default is 123456")}
        {input("next", "New password", "At least 6 characters")}
        {input("confirm", "Repeat new password")}
        <SaveBtn pending={pending} />
      </form>
    </Card>
  );
}

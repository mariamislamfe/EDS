"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { trackPixel } from "@/lib/pixel";
import { placeOrder } from "@/app/actions";
import type { PaymentMethod } from "@/lib/types";
import { fmt, formatPrice, pick } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { cart, useCart, useHydrated } from "@/lib/store";
import { useQuote } from "@/components/commerce/useQuote";
import { cn } from "@/lib/utils";

type Gov = { id: string; name_en: string; name_ar: string; shipping_fee: number | null };

/** The customer's delivery details are remembered on this device only, to speed up the next order. */
const DETAILS_KEY = "eds_checkout_details_v1";
const DETAIL_FIELDS = ["name", "phone", "email", "governorate_id", "city", "address"] as const;

export type CheckoutCustomer = { name: string; phone: string; email: string | null; governorate_id: string | null; city: string | null; address: string | null };

export function CheckoutForm({ governorates, paymentMethods, emailRequired, customer }: {
  governorates: Gov[]; paymentMethods: PaymentMethod[]; emailRequired: boolean; customer: CheckoutCustomer | null;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const lines = useCart();
  const hydrated = useHydrated();
  const [form, setForm] = useState({
    name: customer?.name ?? "", phone: customer?.phone ?? "", email: customer?.email ?? "",
    governorate_id: customer?.governorate_id && governorates.some((g) => g.id === customer.governorate_id) ? customer.governorate_id : "",
    city: customer?.city ?? "", address: customer?.address ?? "", notes: "",
  });
  const [makeAccount, setMakeAccount] = useState(true);
  const [accountPassword, setAccountPassword] = useState("");
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(DETAILS_KEY) ?? "null") as Partial<Record<(typeof DETAIL_FIELDS)[number], string>> | null;
      if (!saved) return;
      const known = governorates.some((g) => g.id === saved.governorate_id);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from localStorage after hydration
      setForm((f) => {
        const next = { ...f };
        for (const k of DETAIL_FIELDS) if (typeof saved[k] === "string" && !f[k]) next[k] = saved[k]!;
        if (!known) next.governorate_id = f.governorate_id;
        return next;
      });
    } catch { /* ignore */ }
  }, [governorates]);
  const [payment, setPayment] = useState(paymentMethods[0]?.id ?? "");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { quote, loading, lineFor } = useQuote(lines, { coupon, governorateId: form.governorate_id || null });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (fieldErr === k) setFieldErr(null);
  };
  const extraErrors: Record<string, string> = {
    account_exists: "This mobile number already has an account. Sign in first to save this order to it, or untick “Create an account”.",
    invalid_password: "Choose a password of at least 6 characters for your account.",
    rate_limited: "Too many orders from this connection in a few minutes. Please wait a little and try again, or call us.",
  };
  const errText = (code: string) => extraErrors[code] ?? (t.checkout.errors as Record<string, string>)[code] ?? t.checkout.errors.generic;
  const couponMsg = quote?.coupon_message
    ? quote.coupon_message.startsWith("min_subtotal:")
      ? fmt(t.cart.couponError_min_subtotal, { n: quote.coupon_message.split(":")[1] })
      : (t.cart as Record<string, string>)[`couponError_${quote.coupon_message}`]
    : null;
  const hasLineErrors = quote?.lines.some((l) => !l.ok);

  const checkoutSent = useRef(false);
  useEffect(() => {
    if (checkoutSent.current || !quote || !lines.length) return;
    checkoutSent.current = true;
    trackPixel("InitiateCheckout", { value: quote.total, currency: "EGP", num_items: lines.reduce((n, l) => n + l.qty, 0), content_ids: lines.map((l) => l.id) });
  }, [quote, lines]);

  // synchronous guard: a double click can fire before `pending` re-renders the button as disabled
  const submitting = useRef(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setError(null);
    start(async () => {
      const res = await placeOrder({
        items: cart.toPayload(lines),
        payment_method: payment,
        coupon_code: quote?.coupon_valid ? coupon : null,
        customer: { ...form, email: form.email.trim() },
        create_account_password: !customer && makeAccount ? accountPassword : null,
      });
      if (res.ok) {
        trackPixel("Purchase", { value: quote?.total ?? 0, currency: "EGP", content_ids: lines.map((l) => l.id), content_type: "product", num_items: lines.reduce((n, l) => n + l.qty, 0) }, { eventID: res.number });
        try { localStorage.setItem(DETAILS_KEY, JSON.stringify(Object.fromEntries(DETAIL_FIELDS.map((k) => [k, form[k]])))); } catch { /* ignore */ }
        cart.clear();
        router.push(`/order/${res.id}?token=${res.token}`);
      } else {
        submitting.current = false;
        setError(errText(res.error));
        const fieldMap: Record<string, string> = { account_exists: "phone", invalid_password: "account_password", invalid_name: "name", invalid_phone: "phone", invalid_city: "city", invalid_address: "address", invalid_email: "email", invalid_governorate: "governorate_id" };
        setFieldErr(fieldMap[res.error] ?? null);
        if (res.error === "cart_changed") router.refresh();
      }
    });
  };

  if (!hydrated) {
    // the cart lives in this browser: hold its space until it is read (no "empty" flash, no layout jump)
    return <div className="grid gap-4" aria-busy="true"><div className="skeleton h-28" /><div className="skeleton h-28" /><div className="skeleton h-64" /></div>;
  }

  if (!lines.length) {
    return (
      <div className="rounded-[2rem] border border-dashed border-line px-6 py-16 text-center">
        <p className="font-display text-xl font-semibold text-navy">{t.cart.empty}</p>
        <Link href="/shop" className="btn btn-primary mt-6">{t.cart.continue}</Link>
      </div>
    );
  }

  const field = (k: keyof typeof form, label: string, opts: { type?: string; required?: boolean; autoComplete?: string; hint?: string; dir?: string; inputMode?: "tel" | "email" | "text" } = {}) => (
    <div>
      <label htmlFor={`f-${k}`} className="label">{label}{!opts.required && <span className="ms-1 font-normal text-muted">({t.common.optional})</span>}</label>
      <input id={`f-${k}`} className="field" value={form[k]} onChange={set(k)} type={opts.type ?? "text"} required={opts.required}
        autoComplete={opts.autoComplete} dir={opts.dir} inputMode={opts.inputMode} aria-invalid={fieldErr === k} aria-describedby={opts.hint ? `h-${k}` : undefined} />
      {opts.hint && <p id={`h-${k}`} className="mt-1 text-xs text-muted">{opts.hint}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} className="grid gap-10 lg:grid-cols-[1.4fr_1fr]" noValidate>
      <div className="flex flex-col gap-10">
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-4 font-display text-xl font-semibold text-navy">{t.checkout.contact}</legend>
          <div className="sm:col-span-2">{field("name", t.checkout.name, { required: true, autoComplete: "name" })}</div>
          {field("phone", t.checkout.phone, { required: true, type: "tel", autoComplete: "tel", dir: "ltr", inputMode: "tel" })}
          {field("email", t.checkout.email, { required: emailRequired, type: "email", autoComplete: "email", dir: "ltr", inputMode: "email" })}
          {customer ? (
            <p className="rounded-2xl bg-aqua px-4 py-3 text-sm text-navy sm:col-span-2">
              Signed in as <strong>{customer.name}</strong> — this order will be saved to <Link href="/account" className="underline underline-offset-4">your account</Link>.
            </p>
          ) : (
            <div className="rounded-2xl border border-line p-4 sm:col-span-2">
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" checked={makeAccount} onChange={(e) => setMakeAccount(e.target.checked)} className="mt-1 size-4 accent-navy" />
                <span>
                  <span className="block font-medium text-navy">Create an account to follow this order</span>
                  <span className="block text-sm text-muted">See all your orders and their status any time. Already have one? <Link href="/account?next=/checkout" className="text-teal-strong underline underline-offset-4">Sign in</Link></span>
                </span>
              </label>
              {makeAccount && (
                <div className="mt-4 max-w-sm">
                  <label htmlFor="f-account_password" className="label">Choose a password</label>
                  <input id="f-account_password" type="password" className="field" dir="ltr" autoComplete="new-password" minLength={6} required
                    value={accountPassword} onChange={(e) => { setAccountPassword(e.target.value); if (fieldErr === "account_password") setFieldErr(null); }}
                    aria-invalid={fieldErr === "account_password"} />
                  <p className="mt-1 text-xs text-muted">At least 6 characters. You&apos;ll sign in with your mobile number.</p>
                </div>
              )}
            </div>
          )}
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-4 font-display text-xl font-semibold text-navy">{t.checkout.delivery}</legend>
          <div>
            <label htmlFor="f-governorate_id" className="label">{t.checkout.governorate}</label>
            <select id="f-governorate_id" className="field" value={form.governorate_id} onChange={set("governorate_id")} required aria-invalid={fieldErr === "governorate_id"}>
              <option value="">{t.checkout.chooseGovernorate}</option>
              {governorates.map((g) => <option key={g.id} value={g.id}>{pick(locale, g.name_en, g.name_ar)}</option>)}
            </select>
          </div>
          {field("city", t.checkout.city, { required: true, autoComplete: "address-level2" })}
          <div className="sm:col-span-2">{field("address", t.checkout.address, { required: true, autoComplete: "street-address", hint: t.checkout.addressHint })}</div>
          <div className="sm:col-span-2">
            <label htmlFor="f-notes" className="label">{t.checkout.notes}<span className="ms-1 font-normal text-muted">({t.common.optional})</span></label>
            <textarea id="f-notes" className="field min-h-24" value={form.notes} onChange={set("notes")} placeholder={t.checkout.notesHint} maxLength={1000} />
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-4 font-display text-xl font-semibold text-navy">{t.checkout.payment}</legend>
          <div className="flex flex-col gap-3">
            {paymentMethods.map((m) => (
              <label key={m.id} className={cn("flex cursor-pointer gap-4 rounded-2xl border p-4 transition-colors", payment === m.id ? "border-navy bg-mist/50" : "border-line hover:border-navy/40")}>
                <input type="radio" name="payment" value={m.id} checked={payment === m.id} onChange={() => setPayment(m.id)} className="mt-1 size-4 accent-navy" />
                <span>
                  <span className="block font-medium text-navy">{pick(locale, m.label_en, m.label_ar)}</span>
                  {pick(locale, m.instructions_en, m.instructions_ar) && (
                    <span className="mt-1 block whitespace-pre-line text-sm text-muted">{pick(locale, m.instructions_en, m.instructions_ar)}</span>
                  )}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">{t.checkout.paymentNote}</p>
        </fieldset>
      </div>

      <aside className="h-fit rounded-[1.75rem] bg-cloud p-6 lg:sticky lg:top-24">
        <h2 className="mb-4 text-lg font-semibold">{t.checkout.summary}</h2>
        <ul className="flex max-h-72 flex-col gap-3 overflow-y-auto pe-1">
          {lines.map((l) => {
            const q = lineFor(l);
            return (
              <li key={l.key} className="flex items-center gap-3">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-white">
                  {l.snapshot.image && <Image src={l.snapshot.image} alt="" fill sizes="56px" className="object-contain p-1.5" />}
                  <span className="absolute -end-1 -top-1 grid min-w-5 place-items-center rounded-full bg-navy px-1 text-[0.7rem] text-white">{l.qty}</span>
                </span>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="line-clamp-1">{pick(locale, l.snapshot.name_en, l.snapshot.name_ar)}</span>
                  {l.snapshot.variantLabel && <span className="text-xs text-muted">{l.snapshot.variantLabel}</span>}
                  {q && !q.ok && <span className="block text-xs text-danger">{fmt((t.cart as Record<string, string>)[`lineError_${q.error}`] ?? t.common.unavailable, { n: q.available ?? 0 })}</span>}
                </span>
                <span className="text-sm tabular-nums">{formatPrice(q?.line_total ?? l.snapshot.price * l.qty, locale)}</span>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 flex gap-2">
          <input className="field !min-h-10 uppercase" dir="ltr" placeholder={t.cart.coupon} aria-label={t.cart.coupon} value={couponInput} onChange={(e) => setCouponInput(e.target.value)} />
          <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={() => setCoupon(couponInput.trim() || null)}>{t.cart.applyCoupon}</button>
        </div>
        {coupon && quote && (quote.coupon_valid
          ? <p className="mt-2 text-xs text-success">{t.cart.couponApplied}</p>
          : couponMsg && <p className="mt-2 text-xs text-danger">{couponMsg}</p>)}

        <dl className="mt-5 flex flex-col gap-2.5 border-t border-line pt-5 text-[0.95rem]" aria-busy={loading}>
          <div className="flex justify-between"><dt className="text-muted">{t.cart.subtotal}</dt><dd className="tabular-nums">{formatPrice(quote?.subtotal ?? 0, locale)}</dd></div>
          {!!quote?.discount && <div className="flex justify-between text-success"><dt>{t.cart.discount}</dt><dd className="tabular-nums">−{formatPrice(quote.discount, locale)}</dd></div>}
          <div className="flex justify-between">
            <dt className="text-muted">{t.cart.shipping}</dt>
            <dd className="tabular-nums">{!form.governorate_id ? <span className="text-sm text-muted">{t.cart.shippingAtCheckout}</span>
              : quote?.shipping_pending ? <span className="text-sm text-muted">{t.cart.shippingPending}</span>
              : formatPrice(quote?.shipping ?? 0, locale)}</dd>
          </div>
          <div className="mt-2 flex justify-between border-t border-line pt-4">
            <dt className="font-medium text-navy">{t.cart.total}</dt>
            <dd className="font-display text-xl font-semibold tabular-nums text-navy">{formatPrice(quote?.total ?? 0, locale)}</dd>
          </div>
        </dl>

        {error && <p role="alert" className="mt-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}
        <button type="submit" disabled={pending || loading || hasLineErrors || !paymentMethods.length} className="btn btn-primary mt-5 h-12 w-full">
          {pending ? t.checkout.placing : t.checkout.placeOrder}
        </button>
      </aside>
    </form>
  );
}

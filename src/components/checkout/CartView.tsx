"use client";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { formatPrice } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { useCart, useHydrated } from "@/lib/store";
import { CartLineItem } from "@/components/commerce/CartLineItem";
import { useQuote } from "@/components/commerce/useQuote";

export function CartView() {
  const { t, locale } = useI18n();
  const lines = useCart();
  const hydrated = useHydrated();
  const { quote, loading, lineFor } = useQuote(lines);
  const hasErrors = quote?.lines.some((l) => !l.ok);

  if (!hydrated) {
    // the cart lives in this browser: hold its space until it is read (no "empty" flash, no layout jump)
    return <div className="grid gap-4" aria-busy="true"><div className="skeleton h-28" /><div className="skeleton h-28" /><div className="skeleton h-64" /></div>;
  }

  if (!lines.length) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[2rem] border border-dashed border-line px-6 py-20 text-center">
        <ShoppingBag className="size-10 text-teal" strokeWidth={1.4} />
        <p className="font-display text-xl font-semibold text-navy">{t.cart.empty}</p>
        <p className="text-muted">{t.cart.emptyHint}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Link href="/students" className="btn btn-primary">{t.home.shopStudent}</Link>
          <Link href="/dentists" className="btn btn-ghost">{t.home.shopDentist}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
      <ul className="divide-y divide-line border-y border-line">
        {lines.map((l) => <CartLineItem key={l.key} line={l} quoted={lineFor(l)} />)}
      </ul>
      <aside className="h-fit rounded-[1.75rem] bg-cloud p-6 lg:sticky lg:top-24">
        <dl className="flex flex-col gap-3 text-[0.95rem]" aria-busy={loading}>
          <div className="flex justify-between"><dt className="text-muted">{t.cart.subtotal}</dt><dd className="tabular-nums">{formatPrice(quote?.subtotal ?? 0, locale)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">{t.cart.shipping}</dt><dd className="text-sm text-muted">{t.cart.shippingAtCheckout}</dd></div>
          <div className="mt-2 flex justify-between border-t border-line pt-4">
            <dt className="font-medium text-navy">{t.cart.total}</dt>
            <dd className="font-display text-xl font-semibold tabular-nums text-navy">{formatPrice(quote?.total ?? 0, locale)}</dd>
          </div>
        </dl>
        {loading && <p className="mt-2 text-xs text-muted">{t.cart.updating}</p>}
        <Link href="/checkout" aria-disabled={hasErrors || loading} className={`btn btn-primary mt-6 w-full ${hasErrors ? "pointer-events-none opacity-50" : ""}`}>{t.cart.checkout}</Link>
        <Link href="/shop" className="btn mt-2 w-full text-navy">{t.cart.continue}</Link>
      </aside>
    </div>
  );
}

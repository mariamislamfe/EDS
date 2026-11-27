"use client";
import Link from "next/link";
import { ShoppingBag, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { useCart } from "@/lib/store";
import { CartLineItem } from "./CartLineItem";
import { useQuote } from "./useQuote";

export function openCart() {
  window.dispatchEvent(new Event("eds:open-cart"));
}

export function CartDrawer() {
  const { t, locale } = useI18n();
  const lines = useCart();
  const [open, setOpen] = useState(false);
  const { quote, loading, lineFor } = useQuote(lines, { enabled: open });
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("eds:open-cart", show);
    window.addEventListener("eds:cart-added", show);
    return () => { window.removeEventListener("eds:open-cart", show); window.removeEventListener("eds:cart-added", show); };
  }, []);

  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.documentElement.style.overflow = ""; };
  }, [open, close]);

  const subtotal = quote?.subtotal ?? lines.reduce((n, l) => n + l.snapshot.price * l.qty, 0);
  const hasErrors = quote?.lines.some((l) => !l.ok);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[60]">
          <div className="menu-scrim absolute inset-0 bg-navy-deep/40" onClick={close} aria-hidden />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={t.cart.title}
            className="drawer-end absolute inset-y-0 end-0 flex w-full max-w-md flex-col bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-lg font-semibold">{t.cart.title}</h2>
              <button ref={closeRef} onClick={close} className="grid size-10 place-items-center rounded-full hover:bg-cloud" aria-label={t.nav.close}>
                <X className="size-5" />
              </button>
            </header>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                <ShoppingBag className="size-10 text-teal" strokeWidth={1.4} />
                <p className="text-lg font-medium text-navy">{t.cart.empty}</p>
                <p className="text-sm text-muted">{t.cart.emptyHint}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  <Link href="/students" onClick={close} className="btn btn-primary btn-sm">{t.home.shopStudent}</Link>
                  <Link href="/dentists" onClick={close} className="btn btn-ghost btn-sm">{t.home.shopDentist}</Link>
                </div>
              </div>
            ) : (
              <>
                <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
                  {lines.map((l) => <CartLineItem key={l.key} line={l} quoted={lineFor(l)} onNavigate={close} />)}
                </ul>
                <footer className="flex flex-col gap-3 border-t border-line px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">{t.cart.subtotal}</span>
                    <span className="font-display text-lg font-semibold tabular-nums text-navy" aria-busy={loading}>
                      {formatPrice(subtotal, locale)}
                    </span>
                  </div>
                  <p className="text-xs text-muted">{t.cart.shipping}: {t.cart.shippingAtCheckout}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Link href="/cart" onClick={close} className="btn btn-ghost">{t.cart.viewCart}</Link>
                    <Link href="/checkout" onClick={close} aria-disabled={hasErrors} className={`btn btn-primary ${hasErrors ? "pointer-events-none opacity-50" : ""}`}>
                      {t.cart.checkout}
                    </Link>
                  </div>
                </footer>
              </>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

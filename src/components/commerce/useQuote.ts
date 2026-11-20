"use client";
import { useEffect, useRef, useState } from "react";
import { quoteCart, type Quote } from "@/app/actions";
import { cart, type CartLine } from "@/lib/store";

/** Re-prices the cart on the server whenever lines/coupon/governorate change. */
export function useQuote(lines: CartLine[], opts: { coupon?: string | null; governorateId?: string | null; enabled?: boolean } = {}) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const seq = useRef(0);
  const enabled = opts.enabled ?? true;
  const payload = JSON.stringify(cart.toPayload(lines));

  useEffect(() => {
    if (!enabled) return;
    if (!lines.length) { setQuote(null); return; }
    const id = ++seq.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const q = await quoteCart({ items: JSON.parse(payload), coupon: opts.coupon, governorateId: opts.governorateId });
        if (id !== seq.current) return;
        if ("error" in q) { setError(true); } else { setQuote(q); setError(false); }
      } catch {
        if (id === seq.current) setError(true);
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, opts.coupon, opts.governorateId, enabled]);

  const lineFor = (l: CartLine) =>
    quote?.lines.find((q) => q.type === l.type && q.id === l.id && (q.variant_id ?? null) === (l.variantId ?? null));

  return { quote, loading, error, lineFor };
}

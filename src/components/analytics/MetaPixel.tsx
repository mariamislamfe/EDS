"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { trackPixel } from "@/lib/pixel";

/**
 * Meta Pixel for the storefront. Loads fbevents.js only when at least one
 * Pixel ID is set in Admin → Store settings, inits every ID, sends PageView
 * on every route change and AddToCart whenever something is added to the cart.
 * (InitiateCheckout and Purchase are sent from the checkout form.)
 */
export function MetaPixel({ ids }: { ids: string[] }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const ready = useRef(false);
  const key = ids.join(",");

  useEffect(() => {
    if (!ids.length || ready.current) return;
    ready.current = true;
    /* Meta base code (inlined, non-blocking) */
    const w = window as Window;
    if (!w.fbq) {
      const n = function (...args: unknown[]) {
        if (n.callMethod) n.callMethod(...args);
        else n.queue!.push(args);
      } as NonNullable<Window["fbq"]>;
      n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
      w.fbq = n; w._fbq = n;
      const s = document.createElement("script");
      s.async = true;
      s.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(s);
    }
    ids.forEach((id) => w.fbq!("init", id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (ids.length) trackPixel("PageView");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search, key]);

  useEffect(() => {
    if (!ids.length) return;
    const onAdd = (e: Event) => {
      const d = (e as CustomEvent<{ id?: string; type?: string; price?: number; qty?: number; name?: string }>).detail ?? {};
      trackPixel("AddToCart", {
        content_ids: d.id ? [d.id] : [], content_type: d.type === "bundle" ? "product_group" : "product",
        content_name: d.name, value: (d.price ?? 0) * (d.qty ?? 1), currency: "EGP",
      });
    };
    window.addEventListener("eds:cart-added", onAdd);
    return () => window.removeEventListener("eds:cart-added", onAdd);
  }, [key, ids.length]);

  return null;
}

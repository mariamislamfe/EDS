"use client";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { quickView } from "@/app/actions";
import type { ProductDetail } from "@/lib/types";
import { pick } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { ProductPurchase } from "./ProductPurchase";

/** One modal for the whole app; product cards open it via a window event. */
export function QuickViewHost() {
  const { t, locale } = useI18n();
  const [slug, setSlug] = useState<string | null>(null);
  const [product, setProduct] = useState<ProductDetail | null | "error">(null);
  const [image, setImage] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const open = (e: Event) => {
      lastFocus.current = document.activeElement as HTMLElement;
      setSlug((e as CustomEvent<{ slug: string }>).detail.slug);
    };
    window.addEventListener("eds:quick-view", open);
    return () => window.removeEventListener("eds:quick-view", open);
  }, []);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    setProduct(null);
    setImage(null);
    quickView(slug).then((p) => { if (alive) setProduct(p ?? "error"); }).catch(() => alive && setProduct("error"));
    return () => { alive = false; };
  }, [slug]);

  const close = useCallback(() => {
    setSlug(null);
    lastFocus.current?.focus();
  }, []);

  useEffect(() => {
    if (!slug) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.documentElement.style.overflow = ""; };
  }, [slug, close]);

  const onCartAdded = useCallback(() => close(), [close]);
  useEffect(() => {
    if (!slug) return;
    window.addEventListener("eds:cart-added", onCartAdded);
    return () => window.removeEventListener("eds:cart-added", onCartAdded);
  }, [slug, onCartAdded]);

  return (
    <>
      {slug && (
        <div data-enter className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
          <div className="absolute inset-0 bg-navy-deep/45 backdrop-blur-[2px]" onClick={close} aria-hidden />
          <div data-enter
            role="dialog"
            aria-modal="true"
            aria-label={t.common.quickView}
            className="relative grid max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-t-3xl bg-white sm:rounded-3xl md:grid-cols-2"
          >
            <button ref={closeRef} onClick={close} className="absolute end-3 top-3 z-10 grid size-10 place-items-center rounded-full bg-white/90 text-navy" aria-label={t.nav.close}>
              <X className="size-5" />
            </button>
            {product === null && (
              <>
                <div className="skeleton m-4 aspect-square" />
                <div className="flex flex-col gap-4 p-6"><div className="skeleton h-6 w-3/4" /><div className="skeleton h-8 w-1/3" /><div className="skeleton h-24" /></div>
              </>
            )}
            {product === "error" && <p className="col-span-2 p-10 text-center text-muted">{t.product.notFound}</p>}
            {product && product !== "error" && (
              <>
                <div className="product-tile relative aspect-square md:m-4 md:rounded-2xl">
                  {(image ?? product.images[0]?.url) && (
                    <Image src={image ?? product.images[0].url} alt={pick(locale, product.name_en, product.name_ar)} fill sizes="(min-width:768px) 420px, 100vw" className="object-contain p-8" />
                  )}
                </div>
                <div className="flex flex-col gap-5 p-6 md:py-10 md:pe-10 md:ps-4">
                  {product.brand_name && <p className="text-sm text-muted">{product.brand_name}</p>}
                  <h2 className="text-2xl font-semibold leading-tight">{pick(locale, product.name_en, product.name_ar)}</h2>
                  <ProductPurchase product={product} onImageChange={setImage} compact />
                  <Link href={`/products/${encodeURIComponent(product.slug)}`} onClick={() => setSlug(null)} className="text-sm font-medium text-teal-strong underline-offset-4 hover:underline">
                    {t.common.viewDetails}
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

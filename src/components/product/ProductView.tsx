"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ProductDetail } from "@/lib/types";
import { formatPrice, pick } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { recent } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ProductPurchase } from "@/components/commerce/ProductPurchase";

export function ProductView({ product, header }: { product: ProductDetail; header: React.ReactNode }) {
  const { t, locale } = useI18n();
  const name = pick(locale, product.name_en, product.name_ar);
  const images = product.images.length ? product.images.map((i) => i.url) : product.image_url ? [product.image_url] : [];
  const [active, setActive] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [showBar, setShowBar] = useState(false);

  useEffect(() => { recent.push(product.id); }, [product.id]);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const show = useCallback((i: number) => {
    setActive(i);
    const rail = railRef.current;
    if (rail) rail.scrollTo({ left: rail.clientWidth * i * (locale === "ar" ? -1 : 1), behavior: "smooth" });
  }, [locale]);

  const onVariantImage = useCallback((url: string) => {
    const i = images.indexOf(url);
    if (i >= 0) show(i);
  }, [images, show]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
      {/* gallery */}
      <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <div className="product-tile relative overflow-hidden rounded-[1.75rem]">
          <div
            ref={railRef}
            className="scroll-rail aspect-square auto-cols-[100%]"
            onScroll={(e) => {
              const el = e.currentTarget;
              const i = Math.round(Math.abs(el.scrollLeft) / el.clientWidth);
              if (i !== active) setActive(i);
            }}
          >
            {images.length ? images.map((src, i) => (
              <div key={src} className="relative aspect-square">
                <Image src={src} alt={i === 0 ? name : ""} fill priority={i === 0} sizes="(min-width:1024px) 50vw, 100vw" className="object-contain p-[8%]" />
              </div>
            )) : (
              <div className="grid aspect-square place-items-center">
                <Image src="/brand/eds-mark.png" alt="" width={96} height={96} className="opacity-25 grayscale" />
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5 lg:hidden">
              {images.map((_, i) => (
                <span key={i} className={cn("h-1.5 rounded-full transition-all", i === active ? "w-5 bg-navy" : "w-1.5 bg-navy/25")} />
              ))}
            </div>
          )}
        </div>
        {images.length > 1 && (
          <ul className="mt-3 hidden gap-2 lg:flex lg:flex-wrap">
            {images.map((src, i) => (
              <li key={src}>
                <button type="button" onClick={() => show(i)} aria-label={`${i + 1} / ${images.length}`} aria-current={i === active}
                  className={cn("product-tile relative size-20 overflow-hidden rounded-xl ring-2 transition", i === active ? "ring-navy" : "ring-transparent hover:ring-line")}>
                  <Image src={src} alt="" fill sizes="80px" className="object-contain p-2" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* purchase panel */}
      <div ref={panelRef} className="flex flex-col gap-7 lg:sticky lg:top-24 lg:self-start">
        {header}
        <ProductPurchase product={product} onImageChange={onVariantImage} />
      </div>

      {/* mobile sticky bar */}
      <div className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur transition-transform duration-300 lg:hidden",
        showBar ? "translate-y-0" : "translate-y-full",
      )} aria-hidden={!showBar}>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-ink">{name}</p>
            <p className="font-display font-semibold tabular-nums text-navy">{formatPrice(product.price, locale)}</p>
          </div>
          <button type="button" tabIndex={showBar ? 0 : -1} className="btn btn-primary" onClick={() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}>
            {product.variants.length ? t.common.selectOptions : t.product.sticky}
          </button>
        </div>
      </div>
    </div>
  );
}

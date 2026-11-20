"use client";
import Link from "next/link";
import { Check, Eye, Plus, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import type { CatalogProduct } from "@/lib/types";
import { useI18n } from "@/lib/i18n/client";
import { cart } from "@/lib/store";

export function openQuickView(slug: string) {
  window.dispatchEvent(new CustomEvent("eds:quick-view", { detail: { slug } }));
}

export function CardActions({ product: p, variant }: { product: CatalogProduct; variant: "desktop" | "mobile" | "quickview" }) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  const href = `/products/${encodeURIComponent(p.slug)}`;

  if (variant === "quickview") {
    return (
      <button
        type="button"
        onClick={() => openQuickView(p.slug)}
        className="btn btn-ghost btn-sm size-9 !min-h-9 shrink-0 !p-0"
        aria-label={`${t.common.quickView}: ${p.name_en ?? p.name_ar}`}
        title={t.common.quickView}
      >
        <Eye className="size-4" />
      </button>
    );
  }

  const add = () => {
    cart.add({
      type: "product", id: p.id, variantId: null,
      snapshot: { slug: p.slug, name_en: p.name_en, name_ar: p.name_ar, image: p.image_url, price: p.price },
    });
    setDone(true);
    setTimeout(() => setDone(false), 1400);
  };

  if (variant === "mobile") {
    if (!p.in_stock) return null;
    if (p.has_variants) {
      return (
        <button type="button" onClick={() => openQuickView(p.slug)} className="grid size-9 place-items-center rounded-full bg-mist text-navy" aria-label={t.common.selectOptions}>
          <SlidersHorizontal className="size-4" />
        </button>
      );
    }
    return (
      <button type="button" onClick={add} className="grid size-9 place-items-center rounded-full bg-navy text-white transition-transform active:scale-90" aria-label={t.common.addToCart}>
        {done ? <Check className="size-4" /> : <Plus className="size-4" />}
      </button>
    );
  }

  if (!p.in_stock) {
    return <Link href={href} prefetch={false} className="btn btn-ghost btn-sm flex-1">{t.common.viewDetails}</Link>;
  }
  if (p.has_variants) {
    return (
      <button type="button" onClick={() => openQuickView(p.slug)} className="btn btn-primary btn-sm flex-1">
        {t.common.selectOptions}
      </button>
    );
  }
  return (
    <button type="button" onClick={add} className="btn btn-primary btn-sm flex-1">
      {done ? <Check className="size-4" /> : <Plus className="size-4" />}
      {done ? t.common.added : t.common.addToCart}
    </button>
  );
}

"use client";
import { Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ProductDetail, Variant } from "@/lib/types";
import { fmt, pick } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { cn, discountPercent, variantLabel } from "@/lib/utils";
import { Price } from "./Price";
import { AddToCartButton } from "./AddToCartButton";
import { WishlistButton } from "./WishlistButton";

export function useVariantSelection(product: ProductDetail) {
  const names = product.option_names?.length
    ? product.option_names
    : [...new Set(product.variants.flatMap((v) => Object.keys(v.options)))];
  const values = useMemo(() => {
    const m: Record<string, string[]> = {};
    names.forEach((n) => { m[n] = [...new Set(product.variants.map((v) => v.options[n]).filter(Boolean))]; });
    return m;
  }, [names, product.variants]);
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    // preselect single-value options
    Object.fromEntries(names.filter((n) => values[n]?.length === 1).map((n) => [n, values[n][0]])));
  const variant: Variant | null = product.variants.length
    ? product.variants.find((v) => names.every((n) => !v.options[n] || v.options[n] === selected[n])) ?? null
    : null;
  const complete = !product.variants.length || names.every((n) => !values[n]?.length || selected[n]);
  const isAvailable = (name: string, value: string) =>
    product.variants.some((v) =>
      v.options[name] === value &&
      names.every((n) => n === name || !selected[n] || v.options[n] === selected[n]) &&
      (v.stock_qty == null || v.stock_qty > 0 || product.allow_backorder));
  return { names, values, selected, setSelected, variant: complete ? variant : null, complete, isAvailable };
}

export function ProductPurchase({
  product, onImageChange, compact = false,
}: {
  product: ProductDetail;
  onImageChange?: (url: string) => void;
  compact?: boolean;
}) {
  const { t, locale } = useI18n();
  const sel = useVariantSelection(product);
  const [qty, setQty] = useState(1);
  const v = sel.variant;

  useEffect(() => { if (v?.image_url) onImageChange?.(v.image_url); }, [v?.image_url, onImageChange]);

  const price = v ? v.price : product.price;
  const compare = v ? v.compare_at_price : product.compare_at_price;
  const pct = discountPercent(price, compare);

  // stock
  let stock: number | null = null;
  let inStock = product.in_stock;
  if (product.variants.length) {
    if (v) { stock = v.stock_qty; inStock = product.allow_backorder || v.stock_qty == null || v.stock_qty > 0; }
  } else if (product.track_inventory) {
    stock = product.stock_qty;
  }
  const low = stock != null && stock > 0 && stock <= Math.max(product.low_stock_threshold, 1);
  const maxQty = stock != null && !product.allow_backorder ? Math.max(stock, 0) : 999;
  const canAdd = sel.complete && inStock && qty <= maxQty;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Price price={price} compare={compare} locale={locale} size="lg" fromLabel={product.variants.length && !v ? t.common.from : undefined} />
        {pct > 0 && <span className="rounded-full bg-mist px-2.5 py-1 text-sm font-medium text-teal-strong">−{pct}% {t.common.off}</span>}
      </div>

      <p className={cn("flex items-center gap-2 text-sm", inStock ? "text-success" : "text-danger")}>
        <span className={cn("size-2 rounded-full", inStock ? "bg-success" : "bg-danger")} aria-hidden />
        {!inStock ? t.common.outOfStock : low ? fmt(t.common.lowStock, { n: stock! }) : t.common.inStock}
      </p>

      {sel.names.map((name) => sel.values[name]?.length ? (
        <fieldset key={name} className="flex flex-col gap-2.5">
          <legend className="mb-2 text-sm font-medium text-navy">
            {name}{sel.selected[name] && <span className="ms-2 font-normal text-muted">{sel.selected[name]}</span>}
          </legend>
          <div className="flex flex-wrap gap-2">
            {sel.values[name].map((value) => {
              const active = sel.selected[name] === value;
              const available = sel.isAvailable(name, value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => sel.setSelected((s) => ({ ...s, [name]: value }))}
                  className={cn(
                    "min-h-10 rounded-xl border px-3.5 text-sm transition-colors",
                    active ? "border-navy bg-navy text-white" : "border-line bg-white text-ink hover:border-navy",
                    !available && !active && "text-muted line-through decoration-muted/60",
                  )}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null)}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-12 items-center rounded-full border border-line">
          <button type="button" className="grid size-12 place-items-center text-navy disabled:opacity-30" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label={t.common.decrease}>
            <Minus className="size-4" />
          </button>
          <input
            aria-label={t.common.quantity}
            inputMode="numeric"
            value={qty}
            onChange={(e) => setQty(Math.max(1, Math.min(999, Number(e.target.value.replace(/\D/g, "")) || 1)))}
            className="w-10 bg-transparent text-center tabular-nums outline-none"
          />
          <button type="button" className="grid size-12 place-items-center text-navy disabled:opacity-30" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty} aria-label={t.common.increase}>
            <Plus className="size-4" />
          </button>
        </div>
        <AddToCartButton
          className="h-12 flex-1"
          disabled={!canAdd}
          qty={qty}
          line={{
            type: "product", id: product.id, variantId: v?.id ?? null,
            snapshot: {
              slug: product.slug, name_en: product.name_en, name_ar: product.name_ar,
              image: v?.image_url ?? product.images[0]?.url ?? product.image_url, price,
              variantLabel: v ? variantLabel(v.options) : null,
            },
          }}
        />
        {!compact && <WishlistButton productId={product.id} className="!size-12 border border-line !shadow-none" />}
      </div>
      {!sel.complete && <p className="-mt-3 text-sm text-muted">{t.product.selectAll}</p>}
      {!compact && <p className="text-sm text-muted">{t.product.deliveryNote}</p>}
      <span className="sr-only">{pick(locale, product.name_en, product.name_ar)}</span>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";
import type { CatalogBundle } from "@/lib/types";
import { fmt, formatPrice, pick, type Dictionary, type Locale } from "@/lib/i18n";
import { AddToCartButton } from "./AddToCartButton";
import { Price } from "./Price";

export function bundlePrices(b: CatalogBundle) {
  const price = b.effective_price;
  const compare = b.compare_at_price ?? (b.items_value > price ? b.items_value : null);
  return { price, compare, saving: compare && compare > price ? compare - price : 0 };
}

/** Wide editorial card: kit image beside its facts. */
export function BundleCard({ bundle: b, t, locale }: { bundle: CatalogBundle; t: Dictionary; locale: Locale }) {
  const name = pick(locale, b.name_en, b.name_ar);
  const year = pick(locale, b.year_name_en, b.year_name_ar);
  const { price, compare, saving } = bundlePrices(b);
  const href = `/bundles/${encodeURIComponent(b.slug)}`;
  return (
    <article className="group grid h-full overflow-hidden rounded-[1.75rem] border border-line bg-white sm:grid-cols-[1fr_1.1fr]">
      <Link href={href} className="product-tile relative block aspect-[4/3] sm:aspect-auto sm:min-h-72">
        {b.image_url ? (
          <Image src={b.image_url} alt={name} fill sizes="(min-width:1024px) 30vw, 100vw" className="object-contain p-6 transition-transform duration-700 group-hover:scale-[1.04]" />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-teal"><Package className="size-14" strokeWidth={1.2} /></span>
        )}
        {b.year_number != null && (
          <span className="absolute start-4 top-4 rounded-full bg-navy px-3 py-1 text-xs font-medium text-white">{year}</span>
        )}
      </Link>
      <div className="flex flex-col gap-3 p-6">
        <h3 className="text-xl font-semibold leading-tight"><Link href={href} className="hover:underline">{name}</Link></h3>
        <p className="line-clamp-3 text-sm text-muted">{pick(locale, b.description_en, b.description_ar).replace(/<[^>]+>/g, " ")}</p>
        <p className="text-sm text-ink">
          <span className="font-medium tabular-nums text-navy">{b.item_count}</span> {t.common.items}
          {b.items_value > 0 && <span className="text-muted"> · {t.common.worth} {formatPrice(b.items_value, locale)}</span>}
        </p>
        <div className="mt-auto flex flex-col gap-3 pt-2">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <Price price={price} compare={compare} locale={locale} />
            {saving > 0 && <span className="text-sm text-teal-strong">{fmt(t.common.youSave, { amount: formatPrice(saving, locale) })}</span>}
          </div>
          {!b.in_stock && <p className="text-sm text-danger">{t.common.outOfStock}</p>}
          <div className="flex flex-wrap gap-2">
            <AddToCartButton
              compact
              disabled={!b.in_stock}
              line={{ type: "bundle", id: b.id, variantId: null, snapshot: { slug: b.slug, name_en: b.name_en, name_ar: b.name_ar, image: b.image_url, price } }}
            />
            <Link href={href} className="btn btn-ghost btn-sm">{t.bundle.details}</Link>
          </div>
        </div>
      </div>
    </article>
  );
}

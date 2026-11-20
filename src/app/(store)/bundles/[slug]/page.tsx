import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Package } from "lucide-react";
import { getBundle } from "@/lib/catalog";
import { getI18n } from "@/lib/i18n/server";
import { fmt, formatPrice, pick } from "@/lib/i18n";
import { variantLabel } from "@/lib/utils";
import { bundlePrices } from "@/components/commerce/BundleCard";
import { Price } from "@/components/commerce/Price";
import { AddToCartButton } from "@/components/commerce/AddToCartButton";
import { Breadcrumbs } from "@/components/ui/Section";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await getI18n();
  const r = await getBundle(decodeURIComponent((await params).slug));
  return r ? { title: pick(locale, r.bundle.name_en, r.bundle.name_ar), openGraph: { images: r.bundle.image_url ? [r.bundle.image_url] : undefined } } : {};
}

export default async function BundlePage({ params }: Props) {
  const [{ slug }, { t, locale }] = await Promise.all([params, getI18n()]);
  const r = await getBundle(decodeURIComponent(slug));
  if (!r) notFound();
  const { bundle: b, items } = r;
  const name = pick(locale, b.name_en, b.name_ar);
  const { price, compare, saving } = bundlePrices(b);
  const description = pick(locale, b.description_en, b.description_ar);
  const images = [b.image_url, ...b.gallery].filter(Boolean) as string[];

  return (
    <div className="container-x pb-10 pt-6">
      <Breadcrumbs items={[
        { label: t.nav.home, href: "/" },
        b.year_slug ? { label: pick(locale, b.year_name_en, b.year_name_ar), href: `/students/${b.year_slug}` } : { label: t.bundle.title, href: "/bundles" },
        { label: name },
      ]} />
      <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <div className="flex flex-col gap-3 lg:sticky lg:top-24 lg:self-start">
          <div className="product-tile relative aspect-[4/3] overflow-hidden rounded-[1.75rem]">
            {images[0] ? <Image src={images[0]} alt={name} fill priority sizes="(min-width:1024px) 55vw, 100vw" className="object-contain p-8" />
              : <span className="absolute inset-0 grid place-items-center text-teal"><Package className="size-20" strokeWidth={1} /></span>}
          </div>
          {images.length > 1 && (
            <ul className="grid grid-cols-4 gap-3">
              {images.slice(1, 5).map((src) => (
                <li key={src} className="product-tile relative aspect-square overflow-hidden rounded-xl"><Image src={src} alt="" fill sizes="160px" className="object-contain p-3" /></li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {b.year_number != null && <span className="w-fit rounded-full bg-mist px-3 py-1 text-sm font-medium text-navy">{pick(locale, b.year_name_en, b.year_name_ar)}</span>}
          <h1 className="text-[clamp(1.9rem,3.6vw,3rem)] font-bold leading-[1.05] tracking-[-0.025em] rtl:leading-snug rtl:tracking-normal">{name}</h1>
          {description && <div className="prose-eds text-muted" dir="auto" dangerouslySetInnerHTML={{ __html: description }} />}

          <div className="rounded-[1.5rem] bg-cloud p-6">
            <p className="text-sm text-muted">{t.bundle.price}</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-3">
              <Price price={price} compare={compare} locale={locale} size="lg" />
              {saving > 0 && <span className="text-sm font-medium text-teal-strong">{fmt(t.common.youSave, { amount: formatPrice(saving, locale) })}</span>}
            </div>
            {b.items_value > 0 && <p className="mt-2 text-sm text-muted">{t.common.worth}: {formatPrice(b.items_value, locale)}</p>}
            <p className={`mt-3 flex items-center gap-2 text-sm ${b.in_stock ? "text-success" : "text-danger"}`}>
              <span className={`size-2 rounded-full ${b.in_stock ? "bg-success" : "bg-danger"}`} />{b.in_stock ? t.common.inStock : t.common.outOfStock}
            </p>
            <AddToCartButton className="mt-5 h-12 w-full" disabled={!b.in_stock}
              line={{ type: "bundle", id: b.id, variantId: null, snapshot: { slug: b.slug, name_en: b.name_en, name_ar: b.name_ar, image: b.image_url, price } }} />
          </div>

          <section aria-labelledby="inside">
            <h2 id="inside" className="mb-4 text-xl font-semibold">{t.bundle.included} <span className="text-base font-normal text-muted">({items.reduce((n, i) => n + i.quantity, 0)} {t.common.items})</span></h2>
            <ul className="divide-y divide-line border-y border-line">
              {items.map((i) => (
                <li key={i.id}>
                  <Link href={`/products/${encodeURIComponent(i.product.slug)}`} className="flex items-center gap-4 py-3 hover:bg-cloud/60">
                    <span className="product-tile relative size-16 shrink-0 overflow-hidden rounded-xl">
                      {i.product.image_url && <Image src={i.product.image_url} alt="" fill sizes="64px" className="object-contain p-1.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-ink">{pick(locale, i.product.name_en, i.product.name_ar)}</span>
                      {i.variant && <span className="text-xs text-muted">{variantLabel(i.variant.options)}</span>}
                    </span>
                    <span className="shrink-0 rounded-full bg-mist px-2.5 py-1 text-sm tabular-nums text-navy">{fmt(t.bundle.qty, { n: i.quantity })}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

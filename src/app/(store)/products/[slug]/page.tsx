import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPairedProducts, getProduct, getRelatedProducts } from "@/lib/catalog";
import { getI18n } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n";
import { SITE_URL } from "@/lib/env";
import { ProductView } from "@/components/product/ProductView";
import { RecentlyViewed } from "@/components/product/RecentlyViewed";
import { ProductRailSection } from "@/components/commerce/ProductCollections";
import { Breadcrumbs } from "@/components/ui/Section";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await getI18n();
  const p = await getProduct(decodeURIComponent((await params).slug));
  if (!p) return {};
  const name = pick(locale, p.name_en, p.name_ar);
  const desc = pick(locale, p.short_description_en, p.short_description_ar) ||
    pick(locale, p.description_en, p.description_ar).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 160);
  return {
    title: name,
    description: desc || undefined,
    openGraph: { title: name, images: p.images[0]?.url ? [p.images[0].url] : undefined },
    alternates: { canonical: `/products/${p.slug}` },
  };
}

export default async function ProductPage({ params }: Props) {
  const [{ slug }, { t, locale }] = await Promise.all([params, getI18n()]);
  const product = await getProduct(decodeURIComponent(slug));
  if (!product) notFound();
  const [relatedAll, paired] = await Promise.all([
    getRelatedProducts(product.id, product.categories.map((c) => c.id)),
    getPairedProducts(product.id),
  ]);
  const related = relatedAll.filter((r) => !paired.some((x) => x.id === r.id));
  const name = pick(locale, product.name_en, product.name_ar);
  const description = pick(locale, product.description_en, product.description_ar);
  const short = pick(locale, product.short_description_en, product.short_description_ar);
  const mainCategory = product.categories[0];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    image: product.images.map((i) => i.url),
    sku: product.sku ?? undefined,
    brand: product.brand_name ? { "@type": "Brand", name: product.brand_name } : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "EGP",
      price: product.price,
      availability: product.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${SITE_URL}/products/${product.slug}`,
    },
  };

  const header = (
    <div className="flex flex-col gap-3">
      {product.brand_name && (
        <Link href={`/brands/${product.brand_slug}`} className="w-fit text-sm font-medium text-teal-strong hover:underline">{product.brand_name}</Link>
      )}
      <h1 className="text-[clamp(1.4rem,2.4vw,2rem)] font-semibold leading-[1.15] tracking-[-0.02em] rtl:leading-snug rtl:tracking-normal">{name}</h1>
      {short && <p className="leading-relaxed text-muted">{short}</p>}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        {product.sku && <span>{t.common.sku}: <span className="text-ink" dir="ltr">{product.sku}</span></span>}
        {(product.audience === "student" || product.audience === "both") && product.years.length > 0 && (
          <span>{t.product.forYear}: {product.years.map((y, i) => (
            <span key={y.id}>{i > 0 && "، "}<Link href={`/students/${y.slug}`} className="text-ink hover:text-navy hover:underline">{pick(locale, y.name_en, y.name_ar)}</Link></span>
          ))}</span>
        )}
      </div>
    </div>
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="container-x pb-6 pt-6">
        <Breadcrumbs items={[
          { label: t.nav.home, href: "/" },
          mainCategory ? { label: pick(locale, mainCategory.name_en, mainCategory.name_ar), href: `/categories/${mainCategory.slug}` } : { label: t.nav.shop, href: "/shop" },
          { label: name },
        ]} />
        <div className="mt-6">
          <ProductView product={product} header={header} />
        </div>

        {(description || product.specifications.length > 0) && (
          <div className={`mt-16 grid gap-12 border-t border-line pt-12 lg:gap-14 ${description && product.specifications.length > 0 ? "lg:grid-cols-[1.15fr_1fr]" : ""}`}>
            {description && (
              <section aria-labelledby="desc">
                <h2 id="desc" className="mb-5 text-xl font-semibold">{t.product.description}</h2>
                <div className="prose-eds max-w-[68ch]" dir="auto" dangerouslySetInnerHTML={{ __html: description }} />
              </section>
            )}
            {product.specifications.length > 0 && (
              <section aria-labelledby="specs">
                <h2 id="specs" className="mb-5 text-xl font-semibold">{t.product.specifications}</h2>
                <dl className="divide-y divide-line border-y border-line">
                  {product.specifications.map((s, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1.4fr] gap-4 py-3 text-sm">
                      <dt className="text-muted">{pick(locale, s.label_en, s.label_ar)}</dt>
                      <dd className="text-ink">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>
        )}
      </div>

      {paired.length > 0 && (
        <ProductRailSection
          title="Use it together"
          text="Items that go with this one — chosen by our team."
          products={paired} t={t} locale={locale}
          className="mt-8 rounded-[2.5rem] bg-aqua !py-12 lg:!py-16"
        />
      )}
      <ProductRailSection title={t.product.related} products={related} t={t} locale={locale} />
      <RecentlyViewed excludeId={product.id} />
    </>
  );
}

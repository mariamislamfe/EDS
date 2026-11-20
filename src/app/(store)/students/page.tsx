import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { browseProducts, getBanners, getBundles, getTaxonomyCounts, getYears } from "@/lib/catalog";
import { getI18n } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n";
import { YearRuler } from "@/components/home/YearRuler";
import { BundleCard } from "@/components/commerce/BundleCard";
import { ProductRailSection } from "@/components/commerce/ProductCollections";
import { Breadcrumbs, SectionHead } from "@/components/ui/Section";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.students, description: t.students.heroText };
}

export default async function StudentsPage() {
  const { t, locale } = await getI18n();
  const [years, stats, bundles, essentials, popular, fresh, offers, banners] = await Promise.all([
    getYears(), getTaxonomyCounts(), getBundles(),
    browseProducts({ audience: "student", flag: "featured", per_page: 12 }),
    browseProducts({ audience: "student", flag: "best", sort: "best", per_page: 12 }),
    browseProducts({ audience: "student", sort: "newest", per_page: 12 }),
    browseProducts({ audience: "student", flag: "sale", per_page: 12 }),
    getBanners("students_hero"),
  ]);
  const banner = banners[0];

  return (
    <>
      <section className="container-x pb-6 pt-8">
        <Breadcrumbs items={[{ label: t.nav.home, href: "/" }, { label: t.nav.students }]} />
        <div className="mt-6 grid items-end gap-8 lg:grid-cols-[1.3fr_1fr]">
          <h1 className="animate-rise text-[clamp(2.4rem,6vw,4.8rem)] font-bold leading-[0.98] tracking-[-0.035em] rtl:leading-[1.15] rtl:tracking-normal">
            {banner ? pick(locale, banner.title_en, banner.title_ar) || t.students.heroTitle : t.students.heroTitle}
          </h1>
          <p className="animate-rise text-lg leading-relaxed text-muted [animation-delay:150ms]">
            {banner ? pick(locale, banner.subtitle_en, banner.subtitle_ar) || t.students.heroText : t.students.heroText}
          </p>
        </div>
        {banner?.image_url && (
          <div className="relative mt-10 aspect-[21/8] overflow-hidden rounded-[2rem] bg-mist">
            <Image src={banner.image_url} alt="" fill priority sizes="100vw" className="object-cover" />
          </div>
        )}
      </section>

      <section className="container-x py-10" aria-labelledby="pick-year">
        <h2 id="pick-year" className="mb-5 text-lg font-semibold">{t.students.pickYear}</h2>
        <YearRuler years={years} stats={stats.year} t={t} locale={locale} />
      </section>

      {bundles.length > 0 && (
        <section className="container-x py-14" data-reveal>
          <SectionHead title={t.students.bundles} text={t.bundle.text} href="/bundles" linkLabel={t.common.seeAll} />
          <ul className="grid gap-5 lg:grid-cols-2">
            {bundles.slice(0, 4).map((b) => <li key={b.id}><BundleCard bundle={b} t={t} locale={locale} /></li>)}
          </ul>
        </section>
      )}

      <ProductRailSection title={t.students.essentials} products={essentials.items} t={t} locale={locale} href="/shop?audience=student" linkLabel={t.common.seeAll} />
      <ProductRailSection title={t.students.popular} products={popular.items} t={t} locale={locale} href="/shop?audience=student&sort=best" linkLabel={t.common.seeAll} />
      <ProductRailSection title={t.students.offers} products={offers.items} t={t} locale={locale} />
      <ProductRailSection title={t.students.newArrivals} products={fresh.items} t={t} locale={locale} href="/shop?audience=student&sort=newest" linkLabel={t.common.seeAll} />

      <section className="container-x py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] bg-mist p-8 sm:p-10">
          <p className="max-w-xl font-display text-xl font-semibold text-navy">{t.home.contactText}</p>
          <Link href="/shop?audience=student" className="btn btn-primary">{t.nav.shop}</Link>
        </div>
      </section>
    </>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { browseProducts, getBanners, getCategories, getSpecialties, getTaxonomyCounts } from "@/lib/catalog";
import { getI18n } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n";
import { SpecialtyIndex } from "@/components/dentists/SpecialtyIndex";
import { BrandStrip, CategoryMosaic } from "@/components/home/Sections";
import { ProductRailSection } from "@/components/commerce/ProductCollections";
import { SectionHead } from "@/components/ui/Section";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.dentists, description: t.dentists.heroText };
}

export default async function DentistsPage() {
  const { t, locale } = await getI18n();
  const [specialties, categories, stats, best, fresh, equipment, offers, facets, banners] = await Promise.all([
    getSpecialties(), getCategories(), getTaxonomyCounts(),
    browseProducts({ audience: "dentist", flag: "best", sort: "best", per_page: 12 }),
    browseProducts({ audience: "dentist", sort: "newest", per_page: 12 }),
    browseProducts({ audience: "dentist", category: "equipment", sort: "featured", per_page: 12 }),
    browseProducts({ audience: "dentist", flag: "sale", per_page: 12 }),
    browseProducts({ audience: "dentist", per_page: 1 }),
    getBanners("dentists_hero"),
  ]);
  const banner = banners[0];
  const brands = facets.facets.brands.sort((a, b) => b.count - a.count).slice(0, 16)
    .map((b) => ({ id: b.slug, slug: b.slug, name: b.name, logo_url: null, is_featured: false }));

  return (
    <>
      <section className="relative overflow-hidden bg-navy-deep text-white">
        {banner?.image_url && <Image src={banner.image_url} alt="" fill priority sizes="100vw" className="object-cover opacity-35" />}
        <div className="container-x relative grid gap-10 pb-16 pt-14 lg:grid-cols-[1.3fr_1fr] lg:items-end lg:pb-24 lg:pt-24">
          <div>
            <h1 className="animate-rise text-[clamp(2.5rem,6.4vw,5.2rem)] font-bold leading-[0.98] tracking-[-0.035em] text-white rtl:leading-[1.15] rtl:tracking-normal">
              {banner ? pick(locale, banner.title_en, banner.title_ar) || t.dentists.heroTitle : t.dentists.heroTitle}
            </h1>
            <p className="mt-6 max-w-xl animate-rise text-lg leading-relaxed text-white/70 [animation-delay:150ms]">
              {banner ? pick(locale, banner.subtitle_en, banner.subtitle_ar) || t.dentists.heroText : t.dentists.heroText}
            </p>
          </div>
          <ul className="flex animate-rise flex-wrap gap-2 [animation-delay:300ms] lg:justify-end">
            {specialties.map((s) => (
              <li key={s.id}>
                <Link href={`/dentists/${s.slug}`} className="inline-flex h-10 items-center rounded-full border border-white/20 px-4 text-sm text-white/85 transition-colors hover:border-teal hover:text-teal">
                  {pick(locale, s.name_en, s.name_ar)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-x py-14 lg:py-20" data-reveal>
        <SectionHead title={t.dentists.bySpecialty} />
        <SpecialtyIndex specialties={specialties} stats={stats.specialty} t={t} locale={locale} />
      </section>

      <CategoryMosaic categories={categories} stats={stats.category} t={t} locale={locale} title={t.dentists.byCategory} audience="dentist" />
      <ProductRailSection title={t.dentists.equipment} products={equipment.items} t={t} locale={locale} href="/categories/equipment?audience=dentist" linkLabel={t.common.seeAll} />
      <ProductRailSection title={t.dentists.best} products={best.items} t={t} locale={locale} href="/shop?audience=dentist&sort=best" linkLabel={t.common.seeAll} />
      <BrandStrip brands={brands} title={t.dentists.featuredBrands} />
      <ProductRailSection title={t.dentists.offers} products={offers.items} t={t} locale={locale} />
      <ProductRailSection title={t.dentists.newArrivals} products={fresh.items} t={t} locale={locale} href="/shop?audience=dentist&sort=newest" linkLabel={t.common.seeAll} />
    </>
  );
}

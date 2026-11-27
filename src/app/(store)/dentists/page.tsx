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
import { WorldLink } from "@/components/fx/Cinematic";
import { MotionReady } from "@/components/fx/MotionLayer";
import { ArrowUpRight } from "lucide-react";
import { getBundles } from "@/lib/catalog";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.dentists, description: t.dentists.heroText };
}

export default async function DentistsPage() {
  const { t, locale } = await getI18n();
  const [specialties, categories, stats, best, fresh, equipment, offers, facets, banners, clinic] = await Promise.all([
    getSpecialties(), getCategories(), getTaxonomyCounts(),
    browseProducts({ audience: "dentist", flag: "best", sort: "best", per_page: 12 }),
    browseProducts({ audience: "dentist", sort: "newest", per_page: 12 }),
    browseProducts({ audience: "dentist", category: "equipment", sort: "featured", per_page: 12 }),
    browseProducts({ audience: "dentist", flag: "sale", per_page: 12 }),
    browseProducts({ audience: "dentist", per_page: 1 }),
    getBanners("dentists_hero"),
    getBundles({ kind: "clinic_setup", audience: "dentist" }),
  ]);
  const banner = banners[0];
  const brands = facets.facets.brands.sort((a, b) => b.count - a.count).slice(0, 16)
    .map((b) => ({ id: b.slug, slug: b.slug, name: b.name, logo_url: null, is_featured: false }));

  return (
    <>
      <section className="on-dark relative isolate overflow-hidden bg-navy-deep text-white">
        <div aria-hidden className="mm-grid-dark absolute inset-0" />
        {banner?.image_url && <Image src={banner.image_url} alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-30" />}
        <div aria-hidden className="absolute -right-40 top-10 size-[44rem] rounded-full bg-[radial-gradient(circle,rgb(101_194_199/0.2),transparent_65%)]" />
        <div className="container-x relative flex min-h-[calc(88svh-4.75rem)] flex-col justify-end pb-12 pt-16 lg:pb-16">
          <p className="eyebrow animate-rise">Journey 02 — For dentists & clinics</p>
          <h1 className="display mt-4 whitespace-nowrap text-[clamp(5rem,19vw,17rem)] leading-[0.8] tracking-[-0.065em] text-white animate-rise [animation-delay:80ms]">
            <span className="font-serif font-normal italic text-teal">D</span>entists
          </h1>
          <div className="mt-10 grid gap-8 border-t border-white/15 pt-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
            <div className="animate-rise [animation-delay:200ms]">
              {banner && pick(locale, banner.title_en, banner.title_ar) && <p className="display mb-3 text-[clamp(1.5rem,2.6vw,2.2rem)] leading-tight text-white">{pick(locale, banner.title_en, banner.title_ar)}</p>}
              <p className="max-w-xl text-lg leading-relaxed text-white/70">{(banner && pick(locale, banner.subtitle_en, banner.subtitle_ar)) || t.dentists.heroText}</p>
            </div>
            <ul className="flex flex-wrap gap-2 animate-rise [animation-delay:300ms] lg:justify-end">
              {specialties.map((s) => (
                <li key={s.id}>
                  <Link href={`/dentists/${s.slug}`} className="inline-flex h-10 items-center rounded-full border border-white/20 px-4 text-sm text-white/85 transition-colors hover:border-teal hover:text-teal">
                    {pick(locale, s.name_en, s.name_ar)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="container-x py-14 lg:py-20" data-reveal>
        <SectionHead title={t.dentists.bySpecialty} />
        <SpecialtyIndex specialties={specialties} stats={stats.specialty} t={t} locale={locale} />
      </section>

      <section className="container-x py-6">
        <WorldLink world="clinic" href="/clinic-setup?for=dentist"
          className="group relative grid overflow-hidden rounded-[2.5rem] border border-line bg-aqua p-8 sm:p-12 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:gap-10">
          <div aria-hidden className="mm-grid absolute inset-0" />
          <div className="relative">
            <p className="eyebrow">Opening or upgrading a room?</p>
            <p className="display mt-4 text-[clamp(2.2rem,5vw,4.4rem)] leading-[0.92]">
              Equip the whole <span className="font-serif font-normal italic text-teal-strong">clinic.</span>
            </p>
            <p className="mt-4 max-w-lg text-muted">Unit, handpieces, radiology, endo and sterilisation — mapped on a real treatment room{clinic.length ? `, with ${clinic.length} ready packages` : ""}.</p>
          </div>
          <span className="relative mt-8 inline-flex items-center gap-3 self-end text-lg font-medium text-navy lg:justify-self-end">
            Clinic setup <span className="grid size-12 place-items-center rounded-full bg-navy text-white transition-transform duration-500 group-hover:rotate-45"><ArrowUpRight className="size-5" /></span>
          </span>
        </WorldLink>
      </section>

      <CategoryMosaic categories={categories} stats={stats.category} t={t} locale={locale} title={t.dentists.byCategory} audience="dentist" />
      <ProductRailSection title={t.dentists.equipment} products={equipment.items} t={t} locale={locale} href="/categories/equipment?audience=dentist" linkLabel={t.common.seeAll} />
      <ProductRailSection title={t.dentists.best} products={best.items} t={t} locale={locale} href="/shop?audience=dentist&sort=best" linkLabel={t.common.seeAll} />
      <BrandStrip brands={brands} title={t.dentists.featuredBrands} />
      <ProductRailSection title={t.dentists.offers} products={offers.items} t={t} locale={locale} />
      <ProductRailSection title={t.dentists.newArrivals} products={fresh.items} t={t} locale={locale} href="/shop?audience=dentist&sort=newest" linkLabel={t.common.seeAll} />
      <MotionReady />
    </>
  );
}

import { MotionReady } from "@/components/fx/MotionLayer";
import {
  browseProducts, getBanners, getBundles, getCategories, getSettings, getSpecialties, getTaxonomyCounts, getTestimonials, getYears,
} from "@/lib/catalog";
import { getI18n } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n";
import type { CatalogProduct } from "@/lib/types";
import { HeroStage } from "@/components/home/HeroStage";
import { PathFinder, type PathYear } from "@/components/home/PathFinder";
import { Discovery } from "@/components/home/Discovery";
import Image from "next/image";
import Link from "next/link";
import { BrandStrip, ContactBlock, PromoBanner, Testimonials, WhyEds } from "@/components/home/Sections";

const PRO_CATEGORIES = ["handpieces", "equipment", "endodontic-supplies", "burs", "composites", "orthodontic-instruments", "radiology", "polishing"];
const withImage = (list: CatalogProduct[]) => list.filter((p) => p.image_url);
const photoFirst = (list: CatalogProduct[]) => [...withImage(list), ...list.filter((p) => !p.image_url)];
const name = (p: { name_en: string | null; name_ar: string | null }) => pick("en", p.name_en, p.name_ar);

export default async function HomePage() {
  const { t } = await getI18n();
  const [settings, years, stats, categories, specialties, bundles, studentPicks, best, newest, sale, promos, testimonials, facets] = await Promise.all([
    getSettings(), getYears(), getTaxonomyCounts(), getCategories(), getSpecialties(), getBundles(),
    browseProducts({ audience: "student", sort: "featured", per_page: 12 }),
    browseProducts({ sort: "best", per_page: 12 }),
    browseProducts({ sort: "newest", per_page: 12 }),
    browseProducts({ flag: "sale", per_page: 12 }),
    getBanners("home_promo"),
    getTestimonials(),
    browseProducts({ per_page: 1 }),
  ]);
  const on = (k: string) => settings.homeSections[k] !== false;

  // hero copy (editable in Admin → Content); the last word becomes the serif accent
  const heroTitle = (settings.homeHero.title_en || "Precision Starts Here.").trim();
  const split = heroTitle.lastIndexOf(" ");
  const heroLead = split > 0 ? heroTitle.slice(0, split) : heroTitle;
  const heroAccent = split > 0 ? heroTitle.slice(split + 1) : "";
  const heroSub = settings.homeHero.subtitle_en || "Everything you need to create better smiles.";

  // academic years with a few of their own products (fallback when a year has no bundle yet)
  const yearProducts = await Promise.all(years.map((y) => browseProducts({ year: y.slug, sort: "featured", per_page: 8 })));
  const pathYears: PathYear[] = years.map((y, i) => ({
    slug: y.slug, number: y.number, name: pick("en", y.name_en, y.name_ar), tagline: pick("en", y.tagline_en, y.tagline_ar),
    count: stats.year[y.slug]?.count ?? 0,
    products: withImage(yearProducts[i].items).slice(0, 4).map((p) => ({ slug: p.slug, name: name(p), image: p.image_url!, price: p.price })),
  }));

  const proCats = PRO_CATEGORIES.map((slug) => categories.find((c) => c.slug === slug)).filter(Boolean).map((c) => ({
    href: `/categories/${c!.slug}?audience=dentist`, title: pick("en", c!.name_en, c!.name_ar), count: stats.category[c!.slug]?.count ?? 0,
  }));

  const catRows = categories.filter((c) => !c.parent_id && (stats.category[c.slug]?.count ?? 0) > 0 && !PRO_CATEGORIES.includes(c.slug)).slice(0, 8).map((c) => ({
    href: `/categories/${c.slug}`, title: pick("en", c.name_en, c.name_ar),
    meta: `${stats.category[c.slug].count} products`, image: c.image_url ?? stats.category[c.slug]?.covers[0] ?? null,
  }));

  const brands = facets.facets.brands.sort((a, b) => b.count - a.count).slice(0, 18)
    .map((b) => ({ id: b.slug, slug: b.slug, name: b.name, logo_url: null, is_featured: false }));

  return (
    <>
      <HeroStage title={heroLead} accent={heroAccent} subtitle={heroSub} />

      <PathFinder
        years={pathYears.filter((y) => y.count > 0 || bundles.some((b) => b.year_slug === y.slug))}
        bundles={bundles}
        specialties={specialties.map((s) => ({ href: `/dentists/${s.slug}`, title: pick("en", s.name_en, s.name_ar), count: stats.specialty[s.slug]?.count ?? 0 }))}
        categories={proCats}
      />

      <Discovery
        tabs={[
          { id: "best", label: "Best sellers", href: "/shop?sort=best", products: photoFirst(best.items) },
          { id: "new", label: "New arrivals", href: "/shop?sort=newest", products: photoFirst(newest.items) },
          { id: "sale", label: "On offer", href: "/shop?flag=sale", products: photoFirst(sale.items) },
          { id: "students", label: "Student picks", href: "/shop?audience=student", products: photoFirst(studentPicks.items).slice(0, 7) },
        ]}
      />

      {on("categories") && catRows.length > 0 && (
        <section className="container-x pb-16 sm:pb-24 lg:pb-32" aria-labelledby="cat-title">
          <div className="mb-8 flex items-end justify-between gap-6">
            <h2 id="cat-title" className="display text-[clamp(2rem,4.4vw,3.6rem)] leading-[0.95]">
              Browse by <span className="font-serif font-normal italic text-teal-strong">category.</span>
            </h2>
            <a href="/shop" className="font-mono text-xs uppercase tracking-[0.14em] text-navy-deep underline-offset-4 hover:underline">All {categories.length}</a>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {catRows.map((c) => (
              <li key={c.href}>
                <Link href={c.href} className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-white transition-[border-color,box-shadow] duration-300 hover:border-navy/30 hover:shadow-lg hover:shadow-navy/5">
                  <span className="relative block aspect-[4/3] bg-cloud">
                    {c.image && <Image src={c.image} alt="" fill sizes="(min-width:1024px) 22vw, (min-width:640px) 30vw, 46vw" className="object-contain p-[14%] mix-blend-multiply transition-transform duration-500 group-hover:scale-105" />}
                  </span>
                  <span className="flex flex-1 flex-col gap-0.5 p-4">
                    <span className="font-display text-base font-semibold leading-tight text-navy-deep sm:text-lg">{c.title}</span>
                    <span className="text-xs text-muted sm:text-sm">{c.meta}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {on("brands") && <BrandStrip brands={brands} title={t.home.brandsTitle} />}

      {on("why") && <WhyEds t={t} />}

      {on("promo") && promos[0] && <PromoBanner banner={promos[0]} locale="en" />}

      {on("testimonials") && <Testimonials items={testimonials} t={t} locale="en" />}

      {on("contact") && <ContactBlock store={settings.store} t={t} locale="en" />}
      <MotionReady />
    </>
  );
}

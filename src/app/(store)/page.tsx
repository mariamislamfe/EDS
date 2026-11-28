import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { MotionReady } from "@/components/fx/MotionLayer";
import {
  browseProducts, getBanners, getBundles, getCategories, getSettings, getSpecialties, getStoreLocations, getTaxonomyCounts, getTestimonials, getYears,
} from "@/lib/catalog";
import { getI18n } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n";
import type { CatalogProduct } from "@/lib/types";
import { HeroBanner } from "@/components/home/HeroBanner";
import { Worlds } from "@/components/home/Worlds";
import { CategoryCarousel } from "@/components/home/CategoryCarousel";
import { Discovery } from "@/components/home/Discovery";
import { StoreMap } from "@/components/home/StoreMap";
import { BrandStrip, ContactBlock, FeedbackWall, PromoBanner, SaleBand, WhyEds } from "@/components/home/Sections";

const withImage = (list: CatalogProduct[]) => list.filter((p) => p.image_url);
const photoFirst = (list: CatalogProduct[]) => [...withImage(list), ...list.filter((p) => !p.image_url)];

export default async function HomePage() {
  const { t } = await getI18n();
  const [settings, years, stats, categories, specialties, clinicBundles, studentPicks, best, newest, sale, promos, slides, feedback, facets, locations] = await Promise.all([
    getSettings(), getYears(), getTaxonomyCounts(), getCategories(), getSpecialties(), getBundles({ kind: "clinic_setup" }),
    browseProducts({ audience: "student", sort: "featured", per_page: 12 }),
    browseProducts({ sort: "best", per_page: 12 }),
    browseProducts({ sort: "newest", per_page: 12 }),
    browseProducts({ flag: "sale", per_page: 16 }),
    getBanners("home_promo"),
    getBanners("home_hero"),
    getTestimonials(),
    browseProducts({ per_page: 1 }),
    getStoreLocations(),
  ]);
  const on = (k: string) => settings.homeSections[k] !== false;

  // hero copy (editable in Admin → Content); the last word becomes the serif accent
  const heroTitle = (settings.homeHero.title_en || "Precision Starts Here.").trim();
  const split = heroTitle.lastIndexOf(" ");
  const heroLead = split > 0 ? heroTitle.slice(0, split) : heroTitle;
  const heroAccent = split > 0 ? heroTitle.slice(split + 1) : "";
  const heroSub = settings.homeHero.subtitle_en || "Everything you need to create better smiles.";
  // full-bleed photos from Admin → Banners ("Homepage hero slideshow"); a built-in photo otherwise
  // products floating around the hero headline: discounted first, then best sellers (with photos)
  const heroSeen = new Set<string>();
  const heroProducts = [...withImage(sale.items), ...withImage(best.items)]
    .filter((p) => !heroSeen.has(p.id) && heroSeen.add(p.id))
    .slice(0, 4)
    .map((p) => ({ key: p.id, href: `/products/${p.slug}`, image: p.image_url!, title: pick("en", p.name_en, p.name_ar), price: p.price }));
  const heroSlides = slides.filter((b) => b.image_url).slice(0, 5)
    .map((b) => ({ src: b.image_url!, alt: pick("en", b.title_en, b.title_ar) || "EDS" }));

  const carousel = categories
    .filter((c) => !c.parent_id && (stats.category[c.slug]?.count ?? 0) > 0)
    .sort((a, b) => (stats.category[b.slug]?.count ?? 0) - (stats.category[a.slug]?.count ?? 0))
    .slice(0, 12)
    .map((c) => ({ href: `/categories/${c.slug}`, title: pick("en", c.name_en, c.name_ar), count: stats.category[c.slug]?.count ?? 0, image: c.image_url ?? stats.category[c.slug]?.covers[0] ?? null }));

  const brands = facets.facets.brands.sort((a, b) => b.count - a.count).slice(0, 18)
    .map((b) => ({ id: b.slug, slug: b.slug, name: b.name, logo_url: null, is_featured: false }));

  return (
    <>
      <HeroBanner lead={heroLead} accent={heroAccent} subtitle={heroSub} slides={heroSlides}
        stats={{ products: facets.total, brands: facets.facets.brands.length, categories: categories.filter((c) => !c.parent_id).length }}
        proof={{ clients: settings.homeHero.happy_clients ?? null, rating: settings.homeHero.rating ?? null, avatars: feedback.map((f) => f.image_url).filter((x): x is string => Boolean(x)) }}
        products={heroProducts}
        years={years.map((y) => ({ href: `/students/${y.slug}`, label: pick("en", y.name_en, y.name_ar) }))}
        specialties={specialties.map((sp) => ({ href: `/dentists/${sp.slug}`, label: pick("en", sp.name_en, sp.name_ar) }))} />

      <Worlds
        studentImage={settings.homeHero.student_image ?? null}
        dentistImage={settings.homeHero.dentist_image ?? null}
        years={years.map((y) => ({ number: y.number, name: pick("en", y.name_en, y.name_ar) }))}
        specialties={specialties.map((s) => pick("en", s.name_en, s.name_ar))}
        clinicCount={clinicBundles.length}
      />

      {on("categories") && carousel.length > 0 && (
        <section className="px-2 py-8 sm:px-3 sm:py-12" aria-labelledby="cat-title">
          <div className="on-dark relative isolate overflow-hidden rounded-[1.75rem] bg-abyss py-8 text-white sm:rounded-[2.25rem] sm:py-10">
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
              <div className="mm-grid-dark absolute inset-0 [mask-image:radial-gradient(70%_60%_at_50%_55%,#000,transparent)]" />
              <div className="absolute left-1/2 top-[58%] size-[56rem] max-w-[160vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(101_194_199/0.28),transparent_60%)]" />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(0deg,rgb(4_61_116/0.55),transparent)]" />
            </div>
            <div className="container-x mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
              <div>
                <p className="eyebrow mb-2">Shop by category</p>
                <h2 id="cat-title" className="display text-[clamp(1.9rem,3.6vw,3rem)] leading-[0.95]">
                  Browse by <span className="font-serif font-normal italic text-teal">category.</span>
                </h2>
              </div>
              <Link href="/shop" className="btn btn-outline-light max-sm:hidden">Shop all products <ArrowUpRight className="size-4" /></Link>
            </div>
            <CategoryCarousel items={carousel} />
          </div>
        </section>
      )}

      {on("sale") && <SaleBand products={photoFirst(sale.items)} t={t} locale="en" />}

      <Discovery
        tabs={[
          { id: "best", label: "Best sellers", href: "/shop?sort=best", products: photoFirst(best.items) },
          { id: "new", label: "New arrivals", href: "/shop?sort=newest", products: photoFirst(newest.items) },
          { id: "students", label: "Student picks", href: "/shop?audience=student", products: photoFirst(studentPicks.items).slice(0, 7) },
        ]}
      />

      {on("brands") && <BrandStrip brands={brands} title={t.home.brandsTitle} />}
      {on("testimonials") && <FeedbackWall items={feedback} />}

      {on("why") && <WhyEds t={t} />}
      {on("promo") && promos[0] && <PromoBanner banner={promos[0]} locale="en" />}
      {on("contact") && <ContactBlock store={settings.store} t={t} locale="en" />}
      {on("map") && <StoreMap locations={locations} />}
      <MotionReady />
    </>
  );
}

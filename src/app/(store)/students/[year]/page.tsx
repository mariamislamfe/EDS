import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { browseProducts, getBundles, getTaxonomyCounts, getYear, getYearChecklist, getYears } from "@/lib/catalog";
import { getI18n } from "@/lib/i18n/server";
import { fmt, pick } from "@/lib/i18n";
import { YearRuler } from "@/components/home/YearRuler";
import { BundleCard } from "@/components/commerce/BundleCard";
import { ProductRailSection } from "@/components/commerce/ProductCollections";
import { Listing, type SearchParams } from "@/components/catalog/Listing";
import { ListingSkeleton } from "@/components/catalog/ListingSkeleton";
import { Breadcrumbs, EmptyState, SectionHead } from "@/components/ui/Section";
import { Checklist } from "@/components/students/Checklist";
import Link from "next/link";

type Props = { params: Promise<{ year: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, t } = await getI18n();
  const y = await getYear((await params).year);
  return y ? { title: `${pick(locale, y.name_en, y.name_ar)} — ${t.nav.students}`, description: pick(locale, y.tagline_en, y.tagline_ar) || undefined } : {};
}

export default async function YearPage({ params, searchParams }: Props) {
  const [{ year: slug }, sp, { t, locale }] = await Promise.all([params, searchParams, getI18n()]);
  const year = await getYear(slug);
  if (!year) notFound();
  const [years, stats, bundles, essentials, checklistItems] = await Promise.all([
    getYears(), getTaxonomyCounts(), getBundles({ yearSlug: year.slug }),
    browseProducts({ year: year.slug, audience: "student", essential: true, per_page: 12 }),
    getYearChecklist(year.id),
  ]);
  const next = years.find((y) => y.number === year.number + 1);
  const nextProducts = next ? await browseProducts({ year: next.slug, audience: "student", sort: "featured", per_page: 12 }) : null;
  const name = pick(locale, year.name_en, year.name_ar);
  const count = stats.year[year.slug]?.count ?? 0;
  const intro = pick(locale, year.intro_en, year.intro_ar);

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="container-x pb-10 pt-8">
          <Breadcrumbs items={[{ label: t.nav.home, href: "/" }, { label: t.nav.students, href: "/students" }, { label: name }]} />
          <div className="mt-6 grid items-center gap-8 lg:grid-cols-[auto_1fr] lg:gap-16">
            <span aria-hidden className="animate-rise font-display text-[clamp(9rem,22vw,17rem)] font-extrabold leading-[0.8] tracking-[-0.07em] text-teal">
              {year.number}
            </span>
            <div className="max-w-2xl">
              <h1 className="animate-rise text-[clamp(2.2rem,5vw,4rem)] font-bold leading-none tracking-[-0.03em] [animation-delay:100ms] rtl:leading-tight rtl:tracking-normal">{name}</h1>
              {pick(locale, year.tagline_en, year.tagline_ar) && (
                <p className="mt-4 animate-rise text-xl text-navy/80 [animation-delay:200ms]">{pick(locale, year.tagline_en, year.tagline_ar)}</p>
              )}
              {intro && <p className="mt-4 animate-rise whitespace-pre-line leading-relaxed text-muted [animation-delay:300ms]">{intro}</p>}
              {count > 0 && <p className="mt-5 text-sm text-muted">{fmt(t.dentists.specialtyProducts, { n: count })}</p>}
            </div>
          </div>
          {year.hero_image_url && (
            <div className="relative mt-10 aspect-[21/8] overflow-hidden rounded-[2rem] bg-mist">
              <Image src={year.hero_image_url} alt="" fill priority sizes="100vw" className="object-cover" />
            </div>
          )}
        </div>
        <div className="container-x pb-6">
          <YearRuler years={years} stats={stats.year} t={t} locale={locale} activeSlug={year.slug} compact />
        </div>
      </section>

      {bundles.length > 0 && (
        <section className="container-x py-12" data-reveal>
          <SectionHead title={t.students.bundles} />
          <ul className="grid gap-5 lg:grid-cols-2">
            {bundles.map((b) => <li key={b.id}><BundleCard bundle={b} t={t} locale={locale} /></li>)}
          </ul>
        </section>
      )}

      <ProductRailSection title={t.students.recommended} products={essentials.items} t={t} locale={locale} />

      {checklistItems.length > 0 && (
        <section className="container-x py-12" data-reveal>
          <SectionHead title={t.students.checklist} text={t.students.checklistHint} />
          <Checklist items={checklistItems.map((c) => ({ id: c.id, label: pick(locale, c.label_en, c.label_ar), href: c.product_slug ? `/products/${encodeURIComponent(c.product_slug)}` : null }))} />
        </section>
      )}

      <section className="container-x py-12" id="all">
        <SectionHead title={fmt(t.students.allForYear, { year: name })} />
        {count > 0 ? (
          <Suspense key={JSON.stringify(sp)} fallback={<ListingSkeleton />}>
            <Listing basePath={`/students/${year.slug}`} searchParams={sp} fixed={{ year: year.slug, audience: "student" }} t={t} locale={locale} />
          </Suspense>
        ) : (
          <EmptyState title={t.students.noYearProducts} text={t.students.noYearProductsHint}>
            <Link href="/shop" className="btn btn-primary btn-sm">{t.nav.shop}</Link>
          </EmptyState>
        )}
      </section>

      {next && nextProducts && (
        <ProductRailSection title={`${t.students.related} — ${pick(locale, next.name_en, next.name_ar)}`} products={nextProducts.items}
          href={`/students/${next.slug}`} linkLabel={t.common.seeAll} t={t} locale={locale} />
      )}
    </>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { browseProducts, getBundles, getTaxonomyCounts, getYear, getYearChecklist, getYears, getYearSubjects } from "@/lib/catalog";
import { MotionReady } from "@/components/fx/MotionLayer";
import { cn } from "@/lib/utils";
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
  const [years, stats, bundles, essentials, checklistItems, subjects] = await Promise.all([
    getYears(), getTaxonomyCounts(), getBundles({ yearSlug: year.slug, kind: "kit" }),
    browseProducts({ year: year.slug, audience: "student", essential: true, per_page: 12 }),
    getYearChecklist(year.id),
    getYearSubjects(year.id),
  ]);
  const subjectId = typeof sp.subject === "string" ? sp.subject : null;
  const subject = subjects.find((x) => x.id === subjectId) ?? null;
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

      {subjects.length > 0 && (
        <section className="container-x py-12" aria-labelledby="subjects-title">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <h2 id="subjects-title" className="display text-[clamp(1.8rem,3.6vw,3rem)] leading-[0.95]">
              Pick a <span className="font-serif font-normal italic text-teal-strong">subject.</span>
            </h2>
            <p className="text-sm text-muted">{subjects.length} subjects in {name}</p>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" data-stagger>
            {subjects.map((sub, i) => {
              const on = subject?.id === sub.id;
              return (
                <li key={sub.id}>
                  <Link href={on ? `/students/${year.slug}#all` : `/students/${year.slug}?subject=${sub.id}#all`} scroll={false} aria-current={on ? "true" : undefined}
                    className={cn("group relative flex h-full min-h-40 flex-col justify-between overflow-hidden rounded-[1.5rem] border p-5 transition-[background-color,border-color,transform] duration-500 ease-[var(--ease-out-soft)] hover:-translate-y-1",
                      on ? "border-navy bg-navy-deep text-white" : "border-line bg-white hover:border-navy/40")}>
                    <span className="flex items-start justify-between gap-2">
                      <span className={cn("font-mono text-xs", on ? "text-teal" : "text-teal-strong")}>{String(i + 1).padStart(2, "0")}</span>
                      <span className="flex -space-x-2">
                        {(sub.image_url ? [sub.image_url] : sub.covers.slice(0, 3)).map((c) => (
                          <span key={c} className="product-tile relative size-9 overflow-hidden rounded-full ring-2 ring-white"><Image src={c} alt="" fill sizes="36px" className="object-contain p-1" /></span>
                        ))}
                      </span>
                    </span>
                    <span>
                      <span className={cn("block font-display text-lg font-semibold leading-tight", on ? "text-white" : "text-navy-deep")}>{pick(locale, sub.name_en, sub.name_ar)}</span>
                      {sub.name_ar && <span className={cn("block text-sm", on ? "text-white/60" : "text-muted")} dir="rtl">{sub.name_ar}</span>}
                      <span className={cn("mt-1 block text-xs", on ? "text-teal" : "text-muted")}>{Number(sub.products)} products</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

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

      <section className="container-x scroll-mt-24 py-12" id="all">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHead title={subject ? `${pick(locale, subject.name_en, subject.name_ar)} — ${name}` : fmt(t.students.allForYear, { year: name })} />
          {subject && <Link href={`/students/${year.slug}#all`} scroll={false} className="btn btn-ghost btn-sm mb-6">All subjects ×</Link>}
        </div>
        {subject?.description_en && <p className="-mt-3 mb-6 max-w-2xl text-muted">{subject.description_en}</p>}
        {count > 0 ? (
          <Suspense key={JSON.stringify(sp)} fallback={<ListingSkeleton />}>
            <Listing basePath={`/students/${year.slug}`} searchParams={sp} fixed={{ year: year.slug, audience: "student", ...(subject ? { subject: subject.id } : {}) }} t={t} locale={locale} />
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
      <MotionReady />
    </>
  );
}

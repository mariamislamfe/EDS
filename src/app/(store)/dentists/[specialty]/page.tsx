import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSpecialties, getTaxonomyCounts } from "@/lib/catalog";
import { getI18n } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n";
import { Listing, type SearchParams } from "@/components/catalog/Listing";
import { ListingSkeleton } from "@/components/catalog/ListingSkeleton";
import { Breadcrumbs, EmptyState } from "@/components/ui/Section";

type Props = { params: Promise<{ specialty: string }>; searchParams: Promise<SearchParams> };

async function load(slug: string) {
  return (await getSpecialties()).find((s) => s.slug === decodeURIComponent(slug)) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await getI18n();
  const s = await load((await params).specialty);
  return s ? { title: pick(locale, s.name_en, s.name_ar), description: pick(locale, s.description_en, s.description_ar) || undefined } : {};
}

export default async function SpecialtyPage({ params, searchParams }: Props) {
  const [{ specialty: slug }, sp, { t, locale }] = await Promise.all([params, searchParams, getI18n()]);
  const specialty = await load(slug);
  if (!specialty) notFound();
  const [specialties, stats] = await Promise.all([getSpecialties(), getTaxonomyCounts()]);
  const count = stats.specialty[specialty.slug]?.count ?? 0;
  const name = pick(locale, specialty.name_en, specialty.name_ar);

  return (
    <>
      <section className="bg-navy-deep text-white">
        <div className="container-x pb-12 pt-8">
          <nav aria-label="Breadcrumb" className="text-sm text-white/60 [&_a:hover]:text-white">
            <Link href="/">{t.nav.home}</Link> <span className="text-white/30">/</span> <Link href="/dentists">{t.nav.dentists}</Link> <span className="text-white/30">/</span> <span className="text-white">{name}</span>
          </nav>
          <h1 className="mt-6 animate-rise text-[clamp(2.4rem,6vw,4.6rem)] font-bold leading-none tracking-[-0.035em] text-white rtl:leading-tight rtl:tracking-normal">{name}</h1>
          {pick(locale, specialty.description_en, specialty.description_ar) && (
            <p className="mt-4 max-w-2xl animate-rise text-lg text-white/70 [animation-delay:120ms]">{pick(locale, specialty.description_en, specialty.description_ar)}</p>
          )}
          <ul className="mt-8 flex flex-wrap gap-2">
            {specialties.map((s) => (
              <li key={s.id}>
                <Link href={`/dentists/${s.slug}`} aria-current={s.slug === specialty.slug ? "page" : undefined}
                  className={`inline-flex h-9 items-center rounded-full px-4 text-sm transition-colors ${s.slug === specialty.slug ? "bg-teal text-navy-deep" : "border border-white/20 text-white/80 hover:border-teal hover:text-teal"}`}>
                  {pick(locale, s.name_en, s.name_ar)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <div className="container-x py-12">
        {count > 0 ? (
          <Suspense key={JSON.stringify(sp)} fallback={<ListingSkeleton />}>
            <Listing basePath={`/dentists/${specialty.slug}`} searchParams={sp} fixed={{ specialty: specialty.slug, audience: "dentist" }} t={t} locale={locale} />
          </Suspense>
        ) : (
          <EmptyState title={t.dentists.noSpecialtyProducts} text={t.students.noYearProductsHint}>
            <Link href="/shop" className="btn btn-primary btn-sm">{t.nav.shop}</Link>
          </EmptyState>
        )}
      </div>
    </>
  );
}

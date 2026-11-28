import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getBrands } from "@/lib/catalog";
import { getI18n } from "@/lib/i18n/server";
import { Listing, type SearchParams } from "@/components/catalog/Listing";
import { ListingSkeleton } from "@/components/catalog/ListingSkeleton";
import { Breadcrumbs } from "@/components/ui/Section";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

async function load(slug: string) {
  return (await getBrands()).find((b) => b.slug === decodeURIComponent(slug)) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const b = await load((await params).slug);
  return b ? { title: b.name } : {};
}

export default async function BrandPage({ params, searchParams }: Props) {
  const [{ slug }, sp, { t, locale }] = await Promise.all([params, searchParams, getI18n()]);
  const brand = await load(slug);
  if (!brand) notFound();
  return (
    <div className="container-x pb-10 pt-8">
      <Breadcrumbs items={[{ label: t.nav.home, href: "/" }, { label: t.nav.brands }, { label: brand.name }]} />
      <h1 className="mb-10 mt-4 text-[clamp(1.6rem,3vw,2.4rem)] font-bold leading-none tracking-[-0.03em]">{brand.name}</h1>
      <Suspense key={JSON.stringify(sp)} fallback={<ListingSkeleton />}>
        <Listing basePath={`/brands/${brand.slug}`} searchParams={sp} fixed={{ brand: brand.slug }} t={t} locale={locale} />
      </Suspense>
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCategories } from "@/lib/catalog";
import { getI18n } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n";
import { Listing, type SearchParams } from "@/components/catalog/Listing";
import { ListingSkeleton } from "@/components/catalog/ListingSkeleton";
import { Breadcrumbs } from "@/components/ui/Section";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

async function load(slug: string) {
  return (await getCategories()).find((c) => c.slug === decodeURIComponent(slug)) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await getI18n();
  const c = await load((await params).slug);
  return c ? { title: pick(locale, c.name_en, c.name_ar), description: pick(locale, c.description_en, c.description_ar) || undefined } : {};
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, sp, { t, locale }] = await Promise.all([params, searchParams, getI18n()]);
  const category = await load(slug);
  if (!category) notFound();
  const title = pick(locale, category.name_en, category.name_ar);
  const desc = pick(locale, category.description_en, category.description_ar);
  return (
    <div className="container-x pb-10 pt-8">
      <Breadcrumbs items={[{ label: t.nav.home, href: "/" }, { label: t.nav.shop, href: "/shop" }, { label: title }]} />
      <header className="mb-10 mt-4 max-w-3xl">
        <h1 className="text-[clamp(2rem,4.5vw,3.4rem)] font-bold leading-none tracking-[-0.03em] rtl:leading-tight rtl:tracking-normal">{title}</h1>
        {desc && <p className="mt-4 text-lg text-muted">{desc}</p>}
      </header>
      <Suspense key={JSON.stringify(sp)} fallback={<ListingSkeleton />}>
        <Listing basePath={`/categories/${category.slug}`} searchParams={sp} fixed={{ category: category.slug }} t={t} locale={locale} />
      </Suspense>
    </div>
  );
}

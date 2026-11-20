import type { Metadata } from "next";
import { Suspense } from "react";
import { getI18n } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n";
import { Listing, type SearchParams } from "@/components/catalog/Listing";
import { ListingSkeleton } from "@/components/catalog/ListingSkeleton";
import { Breadcrumbs } from "@/components/ui/Section";

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const { t } = await getI18n();
  const q = (await searchParams).q;
  return { title: typeof q === "string" ? fmt(t.search.resultsFor, { q }) : t.nav.shop };
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const { t, locale } = await getI18n();
  const q = typeof sp.q === "string" ? sp.q : null;
  return (
    <div className="container-x pb-10 pt-8">
      <Breadcrumbs items={[{ label: t.nav.home, href: "/" }, { label: t.nav.shop }]} />
      <h1 className="mb-10 mt-4 text-[clamp(2rem,4.5vw,3.4rem)] font-bold leading-none tracking-[-0.03em] rtl:leading-tight rtl:tracking-normal">
        {q ? fmt(t.search.resultsFor, { q }) : t.nav.shop}
      </h1>
      <Suspense key={JSON.stringify(sp)} fallback={<ListingSkeleton />}>
        <Listing basePath="/shop" searchParams={sp} t={t} locale={locale} />
      </Suspense>
    </div>
  );
}

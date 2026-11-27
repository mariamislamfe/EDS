import type { Metadata } from "next";
import { Suspense } from "react";
import { getI18n } from "@/lib/i18n/server";
import { Listing, type SearchParams } from "@/components/catalog/Listing";
import { ListingSkeleton } from "@/components/catalog/ListingSkeleton";
import Link from "next/link";
import { MotionReady } from "@/components/fx/MotionLayer";

export const metadata: Metadata = { title: "Offers", description: "Dental supplies on sale at EDS — limited-time prices while stock lasts." };

export default async function OffersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [sp, { t, locale }] = await Promise.all([searchParams, getI18n()]);
  return (
    <>
      <section className="on-dark relative overflow-hidden bg-navy-deep text-white">
        <div aria-hidden className="mm-grid-dark absolute inset-0" />
        <div className="container-x relative pb-14 pt-8 lg:pb-20">
          <nav aria-label="Breadcrumb" className="text-sm text-white/60"><Link href="/" className="hover:text-white">{t.nav.home}</Link> <span className="text-white/30">/</span> <span className="text-white">Offers</span></nav>
          <h1 className="display mt-8 text-[clamp(3.4rem,11vw,9rem)] leading-[0.85] tracking-[-0.06em] text-white animate-rise">
            On <span className="font-serif font-normal italic text-teal">sale.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-white/70 animate-rise [animation-delay:120ms]">Reduced prices across student kits and clinic supplies — while stock lasts.</p>
        </div>
      </section>
      <div className="container-x py-12">
        <Suspense key={JSON.stringify(sp)} fallback={<ListingSkeleton />}>
          <Listing basePath="/offers" searchParams={sp} fixed={{ flag: "sale" }} t={t} locale={locale} />
        </Suspense>
      </div>
      <MotionReady />
    </>
  );
}

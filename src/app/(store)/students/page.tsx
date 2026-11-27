import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Sparkles } from "lucide-react";
import { browseProducts, getBanners, getBundles, getTaxonomyCounts, getYears } from "@/lib/catalog";
import { getI18n } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n";
import { YearRuler } from "@/components/home/YearRuler";
import { BundleCard } from "@/components/commerce/BundleCard";
import { ProductRailSection } from "@/components/commerce/ProductCollections";
import { SectionHead } from "@/components/ui/Section";
import { WorldLink } from "@/components/fx/Cinematic";
import { MotionReady } from "@/components/fx/MotionLayer";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.students, description: t.students.heroText };
}

export default async function StudentsPage() {
  const { t, locale } = await getI18n();
  const [years, stats, kits, clinic, essentials, popular, fresh, offers, banners] = await Promise.all([
    getYears(), getTaxonomyCounts(), getBundles({ kind: "kit" }), getBundles({ kind: "clinic_setup", audience: "student" }),
    browseProducts({ audience: "student", flag: "featured", per_page: 12 }),
    browseProducts({ audience: "student", flag: "best", sort: "best", per_page: 12 }),
    browseProducts({ audience: "student", sort: "newest", per_page: 12 }),
    browseProducts({ audience: "student", flag: "sale", per_page: 12 }),
    getBanners("students_hero"),
  ]);
  const banner = banners[0];
  const title = banner ? pick(locale, banner.title_en, banner.title_ar) : "";
  const sub = (banner && pick(locale, banner.subtitle_en, banner.subtitle_ar)) || t.students.heroText;
  const total = Object.values(stats.year).reduce((n, s) => n + s.count, 0);

  return (
    <>
      {/* ---------- title card ---------- */}
      <section className="relative isolate overflow-hidden bg-aqua">
        <div aria-hidden className="mm-grid absolute inset-0 opacity-80" />
        {banner?.image_url && (
          <>
            <Image src={banner.image_url} alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-30" />
          </>
        )}
        <div className="container-x relative flex min-h-[calc(88svh-4.75rem)] flex-col justify-end pb-12 pt-16 lg:pb-16">
          <p className="eyebrow animate-rise">Journey 01 — For dental students</p>
          <h1 className="display mt-4 whitespace-nowrap text-[clamp(5rem,19vw,17rem)] leading-[0.8] tracking-[-0.065em] animate-rise [animation-delay:80ms]" data-drift="-8">
            Students<span className="font-serif font-normal italic text-teal-strong">.</span>
          </h1>
          <div className="mt-10 grid gap-8 border-t border-navy/15 pt-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
            <div className="animate-rise [animation-delay:200ms]">
              {title && <p className="display mb-3 text-[clamp(1.5rem,2.6vw,2.2rem)] leading-tight">{title}</p>}
              <p className="max-w-xl text-lg leading-relaxed text-muted">{sub}</p>
            </div>
            <div className="flex flex-wrap gap-3 animate-rise [animation-delay:300ms] lg:justify-end">
              <a href="#years" className="btn btn-primary btn-lg">Pick your year <ArrowDown className="size-4" /></a>
              <button type="button" data-open-assistant className="btn btn-ghost btn-lg"><Sparkles className="size-4 text-teal-strong" /> Check my university list</button>
            </div>
          </div>
          <dl className="mt-10 grid max-w-xl grid-cols-3 font-mono text-xs uppercase tracking-[0.12em] text-muted animate-rise [animation-delay:380ms]">
            <div><dt>Years</dt><dd className="display mt-1 font-sans text-4xl normal-case tracking-[-0.04em]">{years.length}</dd></div>
            <div><dt>Products</dt><dd className="display mt-1 font-sans text-4xl normal-case tracking-[-0.04em]">{total}</dd></div>
            <div><dt>Kits</dt><dd className="display mt-1 font-sans text-4xl normal-case tracking-[-0.04em]">{kits.length}</dd></div>
          </dl>
        </div>
      </section>

      {/* ---------- years ---------- */}
      <section id="years" className="container-x scroll-mt-20 py-16 lg:py-24" aria-labelledby="pick-year">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 id="pick-year" className="display text-[clamp(2rem,4.4vw,3.6rem)] leading-[0.95]">
            Which year <span className="font-serif font-normal italic text-teal-strong">are you in?</span>
          </h2>
          <p className="max-w-sm text-muted">Each year is split into its subjects — open yours and you&apos;ll only see what that course asks for.</p>
        </div>
        <div data-rise><YearRuler years={years} stats={stats.year} t={t} locale={locale} /></div>
      </section>

      {kits.length > 0 && (
        <section className="container-x pb-14" data-reveal>
          <SectionHead title={t.students.bundles} text={t.bundle.text} href="/bundles" linkLabel={t.common.seeAll} />
          <ul className="grid gap-5 lg:grid-cols-2">
            {kits.slice(0, 4).map((b) => <li key={b.id}><BundleCard bundle={b} t={t} locale={locale} /></li>)}
          </ul>
        </section>
      )}

      {/* ---------- graduating: clinic setup ---------- */}
      <section className="container-x py-10">
        <WorldLink world="clinic" href="/clinic-setup?for=student"
          className="on-dark group relative grid overflow-hidden rounded-[2.5rem] bg-navy-deep p-8 text-white sm:p-12 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:gap-10">
          <div aria-hidden className="mm-grid-dark absolute inset-0" />
          <div aria-hidden className="absolute -right-32 -top-32 size-[30rem] rounded-full bg-[radial-gradient(circle,rgb(101_194_199/0.25),transparent_65%)] transition-transform duration-700 group-hover:scale-110" />
          <div className="relative">
            <p className="eyebrow">Final year & graduates</p>
            <p className="display mt-4 text-[clamp(2.2rem,5vw,4.4rem)] leading-[0.92]">
              Set up your first <span className="font-serif font-normal italic text-teal">clinic.</span>
            </p>
            <p className="mt-4 max-w-lg text-white/65">Walk a real treatment room, station by station — chair, handpieces, X-ray, endo and sterilisation{clinic.length ? `, or start from one of ${clinic.length} ready packages` : ""}.</p>
          </div>
          <span className="relative mt-8 inline-flex items-center gap-3 self-end text-lg font-medium text-teal lg:justify-self-end">
            Enter the clinic <span className="grid size-12 place-items-center rounded-full bg-teal text-navy-deep transition-transform duration-500 group-hover:rotate-45"><ArrowUpRight className="size-5" /></span>
          </span>
        </WorldLink>
      </section>

      <ProductRailSection title={t.students.essentials} products={essentials.items} t={t} locale={locale} href="/shop?audience=student" linkLabel={t.common.seeAll} />
      <ProductRailSection title={t.students.popular} products={popular.items} t={t} locale={locale} href="/shop?audience=student&sort=best" linkLabel={t.common.seeAll} />
      <ProductRailSection title={t.students.offers} products={offers.items} t={t} locale={locale} href="/offers" linkLabel={t.common.seeAll} />
      <ProductRailSection title={t.students.newArrivals} products={fresh.items} t={t} locale={locale} href="/shop?audience=student&sort=newest" linkLabel={t.common.seeAll} />

      <section className="container-x py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] bg-mist p-8 sm:p-10">
          <p className="max-w-xl font-display text-xl font-semibold text-navy">Got your list from the faculty? Paste it or snap a photo — we&apos;ll tell you what&apos;s in stock.</p>
          <div className="flex gap-3">
            <button type="button" data-open-assistant className="btn btn-primary"><Sparkles className="size-4" /> Check my list</button>
            <Link href="/shop?audience=student" className="btn btn-ghost">{t.nav.shop}</Link>
          </div>
        </div>
      </section>
      <MotionReady />
    </>
  );
}

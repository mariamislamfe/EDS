import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Phone, Mail } from "lucide-react";
import type { Banner, Brand, CatalogProduct, Category, StoreSettings } from "@/lib/types";
import { Rail } from "@/components/ui/Rail";
import { ProductCard } from "@/components/commerce/ProductCard";
import type { Feedback, TaxStat } from "@/lib/catalog";
import { fmt, pick, type Dictionary, type Locale } from "@/lib/i18n";
import { SectionHead } from "@/components/ui/Section";
import { Words } from "@/components/fx/Words";
import { cn } from "@/lib/utils";

/** Asymmetric mosaic: the first category gets a large tile, the rest flow around it. */
export function CategoryMosaic({ categories, stats, t, locale, title, audience }: {
  categories: Category[]; stats: Record<string, TaxStat>; t: Dictionary; locale: Locale; title: string; audience?: "dentist" | "student";
}) {
  const list = categories.filter((c) => (stats[c.slug]?.count ?? 0) > 0).slice(0, 7);
  if (!list.length) return null;
  return (
    <section className="container-x py-14 lg:py-20" data-reveal>
      <SectionHead title={title} href="/shop" linkLabel={t.common.seeAll} />
      <ul className="grid auto-rows-[11rem] grid-cols-2 gap-3 sm:auto-rows-[13rem] md:grid-cols-4 lg:gap-4">
        {list.map((c, i) => {
          const cover = c.image_url ?? stats[c.slug]?.covers[0];
          const big = i === 0;
          return (
            <li key={c.id} className={cn(big && "col-span-2 row-span-2", i === 3 && "md:col-span-2")}>
              <Link
                href={`/categories/${c.slug}${audience ? `?audience=${audience}` : ""}`}
                className="group relative flex h-full flex-col justify-end overflow-hidden rounded-[1.5rem] bg-cloud p-5"
              >
                {cover && (
                  <Image src={cover} alt="" fill sizes={big ? "(min-width:768px) 50vw, 100vw" : "(min-width:768px) 25vw, 50vw"}
                    className={cn("object-contain mix-blend-multiply transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.06]", big ? "p-[14%] pb-[22%]" : "p-[18%] pb-[30%]")} />
                )}
                <span className="relative">
                  <span className={cn("block font-display font-semibold leading-tight text-navy", big ? "text-2xl sm:text-3xl" : "text-base sm:text-lg")}>
                    {pick(locale, c.name_en, c.name_ar)}
                  </span>
                  <span className="text-sm text-muted">{fmt(t.dentists.specialtyProducts, { n: stats[c.slug]?.count ?? 0 })}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function BrandStrip({ brands, title }: { brands: (Brand & { count?: number })[]; title: string }) {
  if (!brands.length) return null;
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {brands.map((b) => (
        <li key={`${hidden}-${b.id}`} className="flex items-center">
          <Link href={`/brands/${b.slug}`} tabIndex={hidden ? -1 : undefined}
            className="display px-8 text-[clamp(2rem,4.5vw,4rem)] leading-none text-navy-deep/25 transition-colors duration-300 hover:text-navy-deep">
            {b.logo_url ? <Image src={b.logo_url} alt={b.name} width={160} height={48} className="h-10 w-auto object-contain" /> : b.name}
          </Link>
          <span aria-hidden className="size-2 rounded-full bg-teal" />
        </li>
      ))}
    </ul>
  );
  return (
    <section className="overflow-hidden border-y border-line py-8 lg:py-12" aria-labelledby="brands-title">
      <div className="container-x mb-8 flex items-end justify-between">
        <h2 id="brands-title" className="eyebrow">{title}</h2>
        <p className="font-mono text-xs text-muted">{brands.length} brands</p>
      </div>
      <div className="marquee" style={{ ["--marquee-speed" as string]: `${Math.max(30, brands.length * 4)}s` }}>
        {row(false)}
        {row(true)}
      </div>
    </section>
  );
}

export function WhyEds({ t }: { t: Dictionary }) {
  const items = [
    { k: "Y/01–05", title: t.home.why1Title, text: t.home.why1Text },
    { k: "Rx", title: t.home.why2Title, text: t.home.why2Text },
    { k: "EGP", title: t.home.why3Title, text: t.home.why3Text },
    { k: "27 gov.", title: t.home.why4Title, text: t.home.why4Text },
  ];
  return (
    <section className="bg-aqua py-12 lg:py-16" aria-labelledby="why-title">
      <div className="container-x">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <div>
            <p className="eyebrow mb-4">Specification sheet</p>
            <h2 id="why-title" className="display text-[clamp(1.9rem,3.6vw,3rem)] leading-[0.95]" data-split>
              <Words text="Why dentists" accent="choose EDS." />
            </h2>
          </div>
          <dl className="grid border-t border-navy/15 sm:grid-cols-2" data-stagger>
            {items.map((it, i) => (
              <div key={it.title} className={cn("flex flex-col gap-2 border-b border-navy/15 py-5 sm:px-6", i % 2 === 0 ? "sm:border-r sm:pl-0" : "sm:pr-0")}>
                <span className="font-mono text-xs text-teal-strong">{String(i + 1).padStart(2, "0")} — {it.k}</span>
                <dt className="display text-xl leading-tight">{it.title}</dt>
                <dd className="text-sm leading-relaxed text-muted">{it.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

export function PromoBanner({ banner, locale }: { banner: Banner; locale: Locale }) {
  const title = pick(locale, banner.title_en, banner.title_ar);
  const sub = pick(locale, banner.subtitle_en, banner.subtitle_ar);
  const cta = pick(locale, banner.cta_label_en, banner.cta_label_ar);
  return (
    <section className="container-x py-10" data-reveal>
      <div className="relative grid min-h-72 overflow-hidden rounded-[2rem] bg-navy text-white md:grid-cols-2">
        <div className="relative z-10 flex flex-col justify-center gap-4 p-8 sm:p-12">
          <h2 className="text-[clamp(1.8rem,3.4vw,2.8rem)] font-bold leading-tight text-white">{title}</h2>
          {sub && <p className="max-w-md text-white/75">{sub}</p>}
          {banner.cta_href && cta && <Link href={banner.cta_href} className="btn btn-teal mt-2 w-fit">{cta}</Link>}
        </div>
        {banner.image_url && (
          <div className="relative min-h-56">
            <Image src={banner.image_url} alt="" fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}

export function FeedbackWall({ items }: { items: Feedback[] }) {
  if (!items.length) return null;
  // enough cards to fill wide screens before the loop repeats
  const loop = items.length < 6 ? Array.from({ length: Math.ceil(6 / items.length) }, () => items).flat() : items;
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 gap-4 pe-4" aria-hidden={hidden || undefined}>
      {loop.map((f, i) => (
        <li key={`${hidden}-${f.id}-${i}`} className="w-[15rem] shrink-0 sm:w-[17rem]">
          <figure className="group relative flex aspect-[4/5] flex-col overflow-hidden rounded-[1.5rem] bg-navy-deep p-2.5 shadow-[0_30px_60px_-40px_rgb(2_42_82/0.6)]">
            {f.image_url ? (
              <span className="relative block flex-1 overflow-hidden rounded-[1.1rem] bg-aqua">
                <Image src={f.image_url} alt={hidden ? "" : `Feedback${f.author ? ` from ${f.author}` : ""}`} fill sizes="272px"
                  className="object-cover object-top transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]" />
                <span aria-hidden className="absolute inset-0 rounded-[1.1rem] ring-1 ring-inset ring-navy/10" />
                <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(0deg,rgb(2_42_82/0.55),transparent)]" />
              </span>
            ) : (
              <blockquote className="flex flex-1 flex-col justify-center rounded-[1.1rem] bg-aqua p-6 text-lg leading-snug text-navy-deep">
                <span className="font-serif text-5xl leading-none text-teal-strong">“</span>
                <span className="line-clamp-[8]">{f.quote}</span>
              </blockquote>
            )}
            <figcaption className="flex items-center justify-between gap-2 px-2 pb-1 pt-3 text-white">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{f.author || "EDS customer"}</span>
                {f.role_en && <span className="block truncate text-xs text-white/55">{f.role_en}</span>}
              </span>
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-teal font-serif text-lg text-navy-deep">”</span>
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
  return (
    <section className="overflow-hidden pb-12 pt-4 lg:pb-16" aria-labelledby="feedback-title">
      <div className="container-x mb-8 flex flex-wrap items-end justify-between gap-4">
        <h2 id="feedback-title" className="display text-[clamp(1.9rem,3.6vw,3rem)] leading-[0.95]">
          Straight from <span className="font-serif font-normal italic text-teal-strong">our customers.</span>
        </h2>
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Real messages · unedited</p>
      </div>
      <div className="marquee marquee-rev" style={{ ["--marquee-speed" as string]: `${Math.max(40, loop.length * 7)}s` }}>
        {row(false)}
        {row(true)}
      </div>
    </section>
  );
}

export function ContactBlock({ store, t, locale }: { store: StoreSettings | null; t: Dictionary; locale: Locale }) {
  const channels = [
    store?.whatsapp && { icon: MessageCircle, label: "WhatsApp", value: store.whatsapp, href: `https://wa.me/${store.whatsapp.replace(/\D/g, "")}` },
    store?.phone && { icon: Phone, label: locale === "ar" ? "اتصل بنا" : "Call", value: store.phone, href: `tel:${store.phone.replace(/\s/g, "")}` },
    store?.email && { icon: Mail, label: "Email", value: store.email, href: `mailto:${store.email}` },
  ].filter(Boolean) as { icon: typeof Phone; label: string; value: string; href: string }[];
  if (!channels.length) return null;
  return (
    <section className="container-x pb-10 pt-16" data-reveal>
      <div className="grid gap-8 border-t border-line pt-12 lg:grid-cols-[1fr_1.4fr] lg:items-center">
        <div>
          <p className="eyebrow mb-3">Talk to us</p>
          <h2 className="display text-[clamp(1.8rem,3.4vw,2.8rem)] leading-tight">{t.home.contactTitle}</h2>
          <p className="mt-3 text-muted">{t.home.contactText}</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-3">
          {channels.map((c) => (
            <li key={c.href}>
              <a href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                className="flex h-full flex-col gap-3 rounded-2xl bg-aqua p-5 transition-colors hover:bg-navy-deep hover:text-white [&:hover_*]:text-white" data-magnetic>
                <c.icon className="size-5 text-teal-strong" />
                <span className="text-sm text-muted">{c.label}</span>
                <span dir="ltr" className="text-start font-medium text-navy rtl:text-end">{c.value}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** "On sale" band: a running headline over a rail of discounted products. */
export function SaleBand({ products, t, locale }: { products: CatalogProduct[]; t: Dictionary; locale: Locale }) {
  if (!products.length) return null;
  const best = Math.max(...products.map((p) => (p.compare_at_price && p.compare_at_price > p.price ? Math.round((1 - p.price / p.compare_at_price) * 100) : 0)));
  const word = (hidden: boolean) => (
    <p aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {Array.from({ length: 4 }, (_, i) => (
        <span key={i} className="display flex items-center gap-8 pe-8 text-[clamp(2.6rem,6vw,5.5rem)] leading-none tracking-[-0.05em]">
          <span className={i % 2 ? "outline-num text-teal" : "text-white"}>On sale</span>
          <span className="size-4 rounded-full bg-teal sm:size-6" />
        </span>
      ))}
    </p>
  );
  return (
    <section className="on-dark relative overflow-hidden bg-navy-deep py-10 text-white lg:py-14" aria-labelledby="sale-title">
      <div aria-hidden className="mm-grid-dark absolute inset-0" />
      <h2 id="sale-title" className="sr-only">On sale</h2>
      <div className="relative marquee" style={{ ["--marquee-speed" as string]: "38s" }}>{word(false)}{word(true)}</div>
      <div className="container-x relative mt-5 flex flex-wrap items-end justify-between gap-4 lg:pe-[8.5rem]">
        <p className="max-w-md text-lg text-white/70">
          {best > 0 ? <>Up to <span className="font-semibold text-teal">{best}% off</span> — while stock lasts.</> : "Limited-time prices — while stock lasts."}
        </p>
        <Link href="/offers" className="btn btn-teal">All offers</Link>
      </div>
      <div className="container-x relative mt-5">
        <Rail label="On sale">
          {products.map((p) => <ProductCard key={p.id} product={p} locale={locale} t={t} tone="dark" />)}
        </Rail>
      </div>
    </section>
  );
}

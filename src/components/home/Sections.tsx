import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Phone, Mail } from "lucide-react";
import type { Banner, Brand, Category, StoreSettings } from "@/lib/types";
import type { TaxStat } from "@/lib/catalog";
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
    <section className="overflow-hidden border-y border-line py-14 lg:py-20" aria-labelledby="brands-title">
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
    <section className="bg-aqua py-24 lg:py-32" aria-labelledby="why-title">
      <div className="container-x">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
          <div>
            <p className="eyebrow mb-4">Specification sheet</p>
            <h2 id="why-title" className="display text-[clamp(2.4rem,5vw,4.6rem)] leading-[0.92]" data-split>
              <Words text="Why dentists" accent="choose EDS." />
            </h2>
          </div>
          <dl className="grid border-t border-navy/15 sm:grid-cols-2" data-stagger>
            {items.map((it, i) => (
              <div key={it.title} className={cn("flex flex-col gap-3 border-b border-navy/15 py-8 sm:px-8", i % 2 === 0 ? "sm:border-r sm:pl-0" : "sm:pr-0")}>
                <span className="font-mono text-xs text-teal-strong">{String(i + 1).padStart(2, "0")} — {it.k}</span>
                <dt className="display text-2xl leading-tight">{it.title}</dt>
                <dd className="leading-relaxed text-muted">{it.text}</dd>
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

export function Testimonials({ items, t, locale }: {
  items: { id: string; author: string; role_en: string | null; role_ar: string | null; quote: string }[]; t: Dictionary; locale: Locale;
}) {
  if (!items.length) return null;
  const [lead, ...rest] = items;
  return (
    <section className="container-x py-24 lg:py-32" aria-labelledby="voices-title">
      <p id="voices-title" className="eyebrow mb-8">{t.home.testimonialsTitle}</p>
      <figure className="max-w-5xl" data-rise>
        <blockquote className="display text-[clamp(1.8rem,4vw,3.6rem)] leading-[1.05]">
          <span className="font-serif font-normal italic text-teal-strong">“</span>{lead.quote}<span className="font-serif font-normal italic text-teal-strong">”</span>
        </blockquote>
        <figcaption className="mt-6 font-mono text-xs uppercase tracking-[0.14em] text-muted">
          {lead.author}{pick(locale, lead.role_en, lead.role_ar) && ` — ${pick(locale, lead.role_en, lead.role_ar)}`}
        </figcaption>
      </figure>
      {rest.length > 0 && (
        <ul className="mt-16 grid gap-10 border-t border-line pt-10 md:grid-cols-3" data-stagger>
          {rest.slice(0, 3).map((q) => (
            <li key={q.id} className="flex flex-col gap-4">
              <blockquote className="text-lg leading-relaxed text-ink">“{q.quote}”</blockquote>
              <p className="mt-auto font-mono text-xs text-muted">{q.author}{pick(locale, q.role_en, q.role_ar) && ` — ${pick(locale, q.role_en, q.role_ar)}`}</p>
            </li>
          ))}
        </ul>
      )}
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

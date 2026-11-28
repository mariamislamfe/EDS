"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, BadgeCheck, GraduationCap, Star, Truck, Warehouse } from "lucide-react";
import { cn } from "@/lib/utils";

const SLIDE_MS = 7000;
export const DEFAULT_HERO = { src: "/hero/eds-hero.webp", alt: "Dental handpieces on a treatment unit" };

export type HeroSlide = { src: string; alt: string; href?: string | null };

/**
 * Full-bleed cinematic hero. The photo runs under the (transparent) header;
 * copy sits bottom-left, the numbers bottom-right. Photos come from
 * Admin → Website content → Banners ("Homepage hero slideshow"); without any,
 * the built-in studio shot is used. Only the current and next slide load.
 */
const PERKS = [
  { icon: GraduationCap, title: "Organised by year", text: "Every student list, ready" },
  { icon: BadgeCheck, title: "Clinic-grade range", text: "Trusted dental brands" },
  { icon: Warehouse, title: "Real stock", text: "Prices straight from inventory" },
  { icon: Truck, title: "Nationwide delivery", text: "Order online, we ship" },
];

function Stars({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5" aria-hidden>
      {Array.from({ length: 5 }, (_, k) => {
        const fill = Math.max(0, Math.min(1, value - k));
        return (
          <span key={k} className="relative grid size-6 place-items-center overflow-hidden rounded-md bg-white/15">
            <span className="absolute inset-y-0 start-0 bg-teal" style={{ width: `${fill * 100}%` }} />
            <Star className="relative size-3.5 fill-white text-white" />
          </span>
        );
      })}
    </span>
  );
}

export function HeroBanner({ lead, accent, subtitle, slides, stats, proof }: {
  lead: string; accent: string; subtitle: string;
  slides: HeroSlide[];
  stats: { products: number; brands: number; categories: number };
  /** social proof, from Admin → Website content (hidden when empty) */
  proof: { clients: number | null; rating: number | null; avatars: string[] };
}) {
  const list = slides.length ? slides : [DEFAULT_HERO];
  const n = list.length;
  const root = useRef<HTMLElement>(null);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  // current slide + the next one; later slides load as they come up
  const [seen, setSeen] = useState<Set<number>>(() => new Set([0, 1 % n]));
  const go = (k: number) => {
    setI(k);
    setSeen((s) => (s.has(k) && s.has((k + 1) % n) ? s : new Set([...s, k, (k + 1) % n])));
  };

  useEffect(() => {
    if (n < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => {
      const k = (i + 1) % n;
      setI(k);
      setSeen((s) => (s.has((k + 1) % n) ? s : new Set([...s, k, (k + 1) % n])));
    }, SLIDE_MS);
    return () => window.clearTimeout(t);
  }, [i, n, paused]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let off = false;
    const sync = () => setPaused(off || document.hidden);
    const io = new IntersectionObserver(([e]) => { off = !e.isIntersecting; sync(); }, { threshold: 0.1 });
    io.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, []);

  const words = lead.split(" ").filter(Boolean);
  const stat = (value: React.ReactNode, label: string) => (
    <div className="flex flex-col items-center px-4 py-3 sm:px-6">
      <dd className="font-serif text-[1.9rem] leading-none sm:text-[2.3rem]" dir="ltr">{value}</dd>
      <dt className="mt-1 text-[0.7rem] uppercase tracking-[0.14em] text-white/55">{label}</dt>
    </div>
  );

  return (
    <section ref={root} aria-labelledby="hero-title"
      className="on-dark relative isolate -mt-16 flex min-h-[max(38rem,100svh)] flex-col overflow-hidden bg-abyss text-white lg:-mt-[4.75rem] lg:min-h-[max(46rem,100svh)]">
      {/* photo, graded into the brand's navy/teal */}
      <div aria-hidden className="hero-bg absolute inset-0 -z-10">
        {list.map((s, k) => (
          <div key={s.src} className={cn("hero-photo absolute inset-0", k === i && "is-on")}>
            {seen.has(k) && (
              <Image src={s.src} alt="" fill priority={k === 0} sizes="100vw" quality={70}
                className="object-cover object-[68%_50%] opacity-70 mix-blend-luminosity sm:object-center" />
            )}
          </div>
        ))}
        <div className="absolute inset-0 bg-[radial-gradient(55%_60%_at_78%_28%,rgb(101_194_199/0.38),transparent_70%)] mix-blend-screen" />
        <div className="absolute inset-0 bg-[radial-gradient(45%_45%_at_15%_85%,rgb(4_61_116/0.85),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_85%_at_50%_42%,transparent_35%,rgb(2_28_56/0.92)_92%)]" />
        {/* soft scrim behind the centred copy */}
        <div className="absolute inset-0 bg-[radial-gradient(42%_38%_at_50%_48%,rgb(2_28_56/0.6),transparent_100%)]" />
        <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgb(2_28_56/0.75),transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(0deg,rgb(2_28_56),rgb(2_28_56/0.6)_40%,transparent)]" />
      </div>

      {/* copy, centred */}
      <div className="hero-copy container-x flex flex-1 flex-col items-center justify-center pb-8 pt-28 text-center sm:pt-32">
        <p className="hero-in inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] py-1.5 pe-4 ps-2 text-[0.78rem] text-white/85 backdrop-blur-md">
          <span className="grid size-5 place-items-center rounded-full bg-teal/20"><span className="size-1.5 rounded-full bg-teal" /></span>
          Al Esraa Dental Store · Egypt
        </p>
        <h1 id="hero-title" className="mt-6 max-w-5xl text-[clamp(2.9rem,8.6vw,7.6rem)] font-semibold leading-[0.92] tracking-[-0.055em] text-white">
          <span className="block">
            {words.map((w, k) => <span key={k} className="hero-word inline-block" style={{ ["--i" as string]: k }}>{w}&nbsp;</span>)}
          </span>
          {accent && (
            <span className="hero-word block font-serif font-normal italic tracking-[-0.02em] text-teal" style={{ ["--i" as string]: words.length }}>{accent}</span>
          )}
        </h1>
        <p className="hero-in hero-in-2 mx-auto mt-6 max-w-xl text-[1.05rem] leading-relaxed text-white/70 sm:text-lg">{subtitle}</p>
        <div className="hero-in hero-in-2 mt-8 flex flex-wrap justify-center gap-2.5 sm:gap-3">
          <Link href="/shop" className="btn group min-h-12 bg-white px-6 text-navy-deep shadow-[0_18px_40px_-18px_rgb(101_194_199/0.9)] hover:bg-teal sm:min-h-14 sm:px-8 sm:text-base">
            Shop all products
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          <Link href="/offers" className="btn group min-h-12 border border-white/25 bg-white/[0.08] px-6 text-white backdrop-blur-md hover:bg-white/15 sm:min-h-14 sm:px-8 sm:text-base">
            Today&apos;s offers
            <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:rotate-45" />
          </Link>
        </div>

        {/* glass numbers bar */}
        <div className="hero-in hero-in-3 mt-12 w-full max-w-4xl sm:mt-14">
          {(proof.clients || proof.rating) ? (
            <div className="mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              {proof.avatars.length > 0 && (
                <span className="flex -space-x-2.5">
                  {proof.avatars.slice(0, 4).map((src) => (
                    <span key={src} className="relative size-8 overflow-hidden rounded-full border-2 border-abyss bg-white/20">
                      <Image src={src} alt="" fill sizes="32px" className="object-cover" />
                    </span>
                  ))}
                </span>
              )}
              {proof.clients ? <p className="text-sm text-white/75"><b className="font-semibold text-white" dir="ltr">{proof.clients.toLocaleString("en")}+</b> happy clients</p> : null}
              {proof.rating ? (
                <span className="flex items-center gap-2" aria-label={`Rated ${proof.rating} out of 5`}>
                  <Stars value={proof.rating} />
                  <span className="text-sm font-semibold" dir="ltr">{proof.rating.toFixed(1)}</span>
                </span>
              ) : null}
            </div>
          ) : null}
          <dl className="hero-stats grid grid-cols-2 overflow-hidden rounded-3xl border border-white/12 bg-white/[0.06] backdrop-blur-xl sm:grid-cols-4 sm:rounded-full">
            {stat(<>{stats.products.toLocaleString("en")}<span className="text-teal">+</span></>, "Products")}
            {stat(stats.brands, "Brands")}
            {stat(stats.categories, "Categories")}
            {stat(<>27<span className="text-teal">/</span>27</>, "Governorates")}
          </dl>
        </div>

        {n > 1 && (
          <ol className="mt-6 flex gap-2" aria-label="Slides">
            {list.map((s, k) => (
              <li key={s.src}>
                <button type="button" onClick={() => go(k)} aria-label={`Show slide ${k + 1}`} aria-current={k === i} className="grid h-11 place-items-center">
                  <span className="block h-1 w-8 overflow-hidden rounded-full bg-white/25">
                    <span className={cn("spot-progress block h-full bg-teal", k === i && !paused && "is-on", (k < i || (k === i && paused)) && "is-full")}
                      style={{ ["--slide-ms" as string]: `${SLIDE_MS}ms` }} />
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* why-EDS ticker */}
      <div className="relative border-t border-white/10 bg-abyss/60 py-3.5 backdrop-blur-md" aria-label="Why EDS">
        <div className="marquee" style={{ ["--marquee-speed" as string]: "48s" }}>
          {[false, true].map((dup) => (
            <ul key={String(dup)} aria-hidden={dup || undefined} className="flex shrink-0 items-center">
              {[...PERKS, ...PERKS].map(({ icon: Icon, title, text }, k) => (
                <li key={k} className="flex items-center gap-2.5 whitespace-nowrap pe-8 text-sm">
                  <Icon className="size-4 text-teal" />
                  <span className="font-medium text-white">{title}</span>
                  <span className="text-white/45">{text}</span>
                  <span className="ms-6 size-1 rounded-full bg-white/25" />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}

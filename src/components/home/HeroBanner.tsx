"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, BadgeCheck, GraduationCap, Star, Truck, Warehouse } from "lucide-react";
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

  return (
    <section ref={root} aria-labelledby="hero-title"
      className="on-dark relative isolate -mt-16 flex min-h-[max(36rem,100svh)] flex-col overflow-hidden bg-abyss text-white lg:-mt-[4.75rem] lg:min-h-[max(44rem,100svh)]">
      {/* photo */}
      <div aria-hidden={n > 1 ? undefined : true} className="absolute inset-0 -z-10">
        {list.map((s, k) => (
          <div key={s.src} className={cn("hero-photo absolute inset-0", k === i && "is-on")} aria-hidden={k !== i}>
            {seen.has(k) && (
              <Image src={s.src} alt={k === i ? s.alt : ""} fill priority={k === 0} sizes="100vw" quality={70}
                className="object-cover object-[68%_50%] sm:object-center" />
            )}
          </div>
        ))}
        {/* grade: brand tint + legibility */}
        <div className="absolute inset-0 bg-[#022a52]/35 mix-blend-multiply" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(2_28_56/0.88)_0%,rgb(2_28_56/0.55)_38%,rgb(2_28_56/0)_70%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[70%] bg-[linear-gradient(0deg,rgb(2_28_56/0.95),rgb(2_28_56/0.5)_45%,transparent)]" />
        <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgb(2_28_56/0.65),transparent)]" />
      </div>

      <div className="container-x flex flex-1 flex-col justify-end pb-6 pt-28 sm:pb-8 lg:pb-8">
        <div className="grid items-end gap-10 lg:grid-cols-[1fr_auto]">
          <div className="hero-in max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] py-1.5 pe-4 ps-3 text-[0.8rem] text-white/85 backdrop-blur-md">
              <span className="size-1.5 rounded-full bg-teal" />
              Al Esraa Dental Store · Egypt
            </p>
            <h1 id="hero-title" className="mt-5 text-[clamp(2.8rem,7.4vw,6.8rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-white">
              <span className="block">{lead}</span>
              {accent && <span className="block font-serif font-normal italic tracking-[-0.02em] text-teal">{accent}</span>}
            </h1>
            <p className="mt-5 max-w-lg text-[1.05rem] leading-relaxed text-white/75 sm:text-lg">{subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-2.5 sm:gap-3">
              <Link href="/shop" className="btn btn-teal group min-h-12 px-6 sm:min-h-14 sm:px-7 sm:text-base">
                Shop all products
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link href="/offers" className="btn group min-h-12 border border-white/25 bg-white/10 px-6 text-white backdrop-blur-md hover:bg-white/20 sm:min-h-14 sm:px-7 sm:text-base">
                Today&apos;s offers
                <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:rotate-45" />
              </Link>
            </div>
          </div>

          {/* numbers, bottom-right */}
          <div className="hero-in hero-in-2 lg:w-[22rem]">
            <p className="font-serif text-[clamp(3rem,5.5vw,4.75rem)] leading-none" dir="ltr">
              {stats.products.toLocaleString("en")}<span className="text-teal">+</span>
            </p>
            <p className="mt-2 text-sm text-white/75 sm:text-base">Products in stock: instruments, materials and equipment.</p>
            <dl className="mt-5 grid grid-cols-3 border-t border-white/20 pt-4 text-sm">
              <div><dt className="text-white/55">Brands</dt><dd className="mt-0.5 text-lg font-semibold" dir="ltr">{stats.brands}</dd></div>
              <div><dt className="text-white/55">Categories</dt><dd className="mt-0.5 text-lg font-semibold" dir="ltr">{stats.categories}</dd></div>
              <div><dt className="text-white/55">Delivery</dt><dd className="mt-0.5 text-lg font-semibold">All Egypt</dd></div>
            </dl>
          </div>
        </div>

        {/* proof + perks */}
        <div className="hero-in hero-in-2 mt-9 grid gap-5 border-t border-white/15 pt-5 sm:mt-12 lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-10">
          {(proof.clients || proof.rating) ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {proof.avatars.length > 0 && (
                <span className="flex -space-x-2.5">
                  {proof.avatars.slice(0, 4).map((src) => (
                    <span key={src} className="relative size-9 overflow-hidden rounded-full border-2 border-abyss bg-white/20">
                      <Image src={src} alt="" fill sizes="36px" className="object-cover" />
                    </span>
                  ))}
                </span>
              )}
              {proof.clients ? (
                <p className="text-sm text-white/80"><b className="text-base font-semibold text-white" dir="ltr">{proof.clients.toLocaleString("en")}+</b> happy clients</p>
              ) : null}
              {proof.rating ? (
                <span className="flex items-center gap-2" aria-label={`Rated ${proof.rating} out of 5`}>
                  <Stars value={proof.rating} />
                  <span className="text-sm font-semibold" dir="ltr">{proof.rating.toFixed(1)}</span>
                </span>
              ) : null}
            </div>
          ) : <span className="hidden lg:block" />}

          <ul className="scroll-rail -mx-4 auto-cols-[minmax(13rem,1fr)] gap-3 px-4 sm:mx-0 sm:px-0 lg:auto-cols-fr lg:gap-0 lg:divide-x lg:divide-white/12" aria-label="Why EDS">
            {PERKS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.06] p-3 backdrop-blur-md lg:rounded-none lg:border-0 lg:bg-transparent lg:px-5 lg:py-1 lg:backdrop-blur-none">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal/15 text-teal"><Icon className="size-5" /></span>
                <span className="min-w-0">
                  <span className="block whitespace-nowrap text-sm font-semibold text-white">{title}</span>
                  <span className="block truncate text-xs text-white/60">{text}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="hidden items-center gap-3 lg:flex">
            {n > 1 && (
              <ol className="flex gap-2" aria-label="Slides">
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
            <a href="#worlds" className="grid size-11 place-items-center rounded-full border border-white/25 text-white/80 transition-colors hover:border-teal hover:text-teal" aria-label="Scroll to the store">
              <ArrowDown className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

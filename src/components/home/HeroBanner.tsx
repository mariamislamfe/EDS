"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Search, Star } from "lucide-react";
import { formatPrice, pick } from "@/lib/i18n";
import { useSuggest } from "@/components/layout/useSuggest";
import { cn } from "@/lib/utils";

const SLIDE_MS = 7000;
export const DEFAULT_HERO = { src: "/hero/eds-hero.webp", alt: "Dental handpieces on a treatment unit" };
const TYPED = ["K-files", "composite", "burs", "endo motor", "impression trays", "apex locator", "gloves"];

export type HeroSlide = { src: string; alt: string };

function Stars({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5" aria-hidden>
      {Array.from({ length: 5 }, (_, k) => (
        <Star key={k} className={cn("size-3.5", value - k >= 0.5 ? "fill-teal text-teal" : "text-white/30")} />
      ))}
    </span>
  );
}

/** Placeholder that types itself: "Search for K-files…" (static under reduced motion). */
function useTypedWord(active: boolean) {
  const [text, setText] = useState(TYPED[0]);
  useEffect(() => {
    if (!active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let w = 0, c = TYPED[0].length, deleting = true, t = 0;
    const tick = () => {
      if (deleting) {
        c--;
        if (c <= 0) { deleting = false; w = (w + 1) % TYPED.length; c = 0; }
      } else {
        c++;
        if (c >= TYPED[w].length) { deleting = true; setText(TYPED[w]); t = window.setTimeout(tick, 1700); return; }
      }
      setText(TYPED[w].slice(0, Math.max(0, c)));
      t = window.setTimeout(tick, deleting ? 45 : 85);
    };
    t = window.setTimeout(tick, 1800);
    return () => window.clearTimeout(t);
  }, [active]);
  return text;
}

/**
 * One-screen cinematic hero (never taller than the viewport):
 *  - brand-graded photo; on desktop a teal "flashlight" follows the pointer and
 *    reveals the photo in colour
 *  - search right in the hero (live results while typing, self-typing hint)
 *  - the two main calls to action
 * The pointer effect writes CSS variables directly (no React re-render per move).
 */
export function HeroBanner({ lead, accent, subtitle, slides, stats, proof }: {
  lead: string; accent: string; subtitle: string;
  slides: HeroSlide[];
  stats: { products: number; brands: number; categories: number };
  proof: { clients: number | null; rating: number | null; avatars: string[] };
}) {
  const list = slides.length ? slides : [DEFAULT_HERO];
  const n = list.length;
  const root = useRef<HTMLElement>(null);
  const router = useRouter();
  const [i, setI] = useState(0);
  const [seen, setSeen] = useState<Set<number>>(() => new Set([0, 1 % n]));
  const [paused, setPaused] = useState(false);
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const searchBox = useRef<HTMLDivElement>(null);
  const { items, loading, ready } = useSuggest(q);
  const typed = useTypedWord(!focused && !q && !paused);
  const open = focused && ready;

  // slideshow (admin banners)
  useEffect(() => {
    if (n < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => {
      const k = (i + 1) % n;
      setI(k);
      setSeen((s) => (s.has((k + 1) % n) ? s : new Set([...s, k, (k + 1) % n])));
    }, SLIDE_MS);
    return () => window.clearTimeout(t);
  }, [i, n, paused]);

  // pause work while off screen / tab hidden
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

  // pointer flashlight + parallax (fine pointers only; one style write per frame)
  useEffect(() => {
    const el = root.current;
    if (!el || !window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0, x = 0, y = 0;
    const apply = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${x - r.left}px`);
      el.style.setProperty("--my", `${y - r.top}px`);
      el.style.setProperty("--px", ((x - r.left) / r.width - 0.5).toFixed(3));
      el.style.setProperty("--py", ((y - r.top) / r.height - 0.5).toFixed(3));
    };
    const move = (e: PointerEvent) => { x = e.clientX; y = e.clientY; if (!raf) raf = requestAnimationFrame(apply); };
    const enter = () => el.classList.add("lit");
    const leave = () => el.classList.remove("lit");
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    return () => { cancelAnimationFrame(raf); el.removeEventListener("pointermove", move); el.removeEventListener("pointerenter", enter); el.removeEventListener("pointerleave", leave); };
  }, []);

  // close search results on outside click
  useEffect(() => {
    if (!focused) return;
    const away = (e: PointerEvent) => { if (!searchBox.current?.contains(e.target as Node)) setFocused(false); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [focused]);

  const go = (href: string) => { setFocused(false); setQ(""); router.push(href); };
  const words = lead.split(" ").filter(Boolean);

  return (
    <section ref={root} aria-labelledby="hero-title"
      className="hero on-dark relative isolate z-10 -mt-16 flex h-[100svh] min-h-[36rem] flex-col text-white lg:-mt-[4.75rem] lg:min-h-[40rem]">
      {/* ---------- backdrop ---------- */}
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden bg-abyss">
        <div className="hero-bg absolute inset-0">
          {list.map((s, k) => (
            <div key={s.src} className={cn("hero-photo absolute inset-0", k === i && "is-on")}>
              {seen.has(k) && (
                <>
                  <Image src={s.src} alt="" fill priority={k === 0} sizes="100vw" quality={70}
                    className="object-cover object-[68%_50%] opacity-70 mix-blend-luminosity sm:object-center" />
                  {/* the flashlight: same photo in colour, masked to the pointer */}
                  <Image src={s.src} alt="" fill sizes="100vw" quality={70} loading="lazy"
                    className="hero-reveal hidden object-cover object-[68%_50%] sm:object-center lg:block" />
                </>
              )}
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(55%_60%_at_78%_28%,rgb(101_194_199/0.34),transparent_70%)] mix-blend-screen" />
        <div className="absolute inset-0 bg-[radial-gradient(45%_45%_at_15%_85%,rgb(4_61_116/0.85),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_85%_at_50%_42%,transparent_35%,rgb(2_28_56/0.92)_92%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(44%_40%_at_50%_46%,rgb(2_28_56/0.62),transparent_100%)]" />
        <div className="hero-glow absolute inset-0 hidden lg:block" />
        <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgb(2_28_56/0.75),transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-[linear-gradient(0deg,rgb(2_28_56),rgb(2_28_56/0.55)_45%,transparent)]" />
      </div>

      {/* ---------- copy ---------- */}
      <div className="hero-copy container-x relative z-20 flex min-h-0 flex-1 flex-col items-center justify-center pt-[calc(4rem+2svh)] text-center lg:pt-[calc(4.75rem+1svh)]">
        <p className="hero-in inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/[0.09] py-2 pe-5 ps-3.5 text-[clamp(0.95rem,2.1svh,1.15rem)] font-medium tracking-[-0.01em] text-white shadow-[0_10px_30px_-15px_rgb(101_194_199/0.6)] backdrop-blur-md">
          <span className="relative grid size-3 place-items-center" aria-hidden>
            <span className="absolute inset-0 animate-ping rounded-full bg-teal/70 [animation-duration:2.2s]" />
            <span className="relative size-2.5 rounded-full bg-teal" />
          </span>
          Al Esraa Dental Store
        </p>
        <h1 id="hero-title" className="mt-[2.2svh] max-w-5xl text-[clamp(2.5rem,min(8.2vw,11svh),7.2rem)] font-semibold leading-[0.92] tracking-[-0.055em] text-white">
          <span className="block">
            {words.map((w, k) => <span key={k} className="hero-word inline-block" style={{ ["--i" as string]: k }}>{w}&nbsp;</span>)}
          </span>
          {accent && <span className="hero-word block font-serif font-normal italic tracking-[-0.02em] text-teal" style={{ ["--i" as string]: words.length }}>{accent}</span>}
        </h1>
        <p className="hero-in hero-in-2 mx-auto mt-[1.8svh] max-w-lg text-[clamp(0.95rem,2svh,1.1rem)] leading-relaxed text-white/70">{subtitle}</p>

        {/* search */}
        <div ref={searchBox} className="hero-in hero-in-2 relative z-30 mt-[3svh] w-full max-w-xl">
          <form role="search" onSubmit={(e) => {
            e.preventDefault();
            if (active >= 0 && items[active]) return go(`/products/${encodeURIComponent(items[active].slug)}`);
            if (q.trim()) go(`/shop?q=${encodeURIComponent(q.trim())}`);
          }}>
            <label className="group flex h-[clamp(3.2rem,7svh,3.75rem)] items-center gap-3 rounded-full border border-white/20 bg-white/[0.1] pe-1.5 ps-5 shadow-[0_20px_60px_-25px_rgb(101_194_199/0.55)] backdrop-blur-xl transition-colors focus-within:border-teal/70 focus-within:bg-white/[0.14]">
              <Search className="size-5 shrink-0 text-white/70" />
              <span className="relative min-w-0 flex-1">
                <input value={q}
                  onChange={(e) => { setQ(e.target.value); setActive(-1); setFocused(true); }}
                  onFocus={() => setFocused(true)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
                    if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
                    if (e.key === "Escape") { setFocused(false); (e.target as HTMLInputElement).blur(); }
                  }}
                  aria-label="Search products" role="combobox" aria-expanded={open} aria-controls="hero-search-results"
                  aria-activedescendant={active >= 0 ? `hr-${active}` : undefined}
                  autoComplete="off" enterKeyHint="search"
                  className="w-full bg-transparent text-[0.98rem] text-white outline-none" />
                {!q && (
                  <span aria-hidden className="pointer-events-none absolute inset-y-0 start-0 flex items-center truncate text-[0.98rem] text-white/55">
                    Search for&nbsp;<span className="text-white/85">{typed}</span><span className="hero-caret ms-px h-5 w-px bg-teal" />
                  </span>
                )}
              </span>
              <button type="submit" className="grid h-[calc(100%-0.6rem)] shrink-0 place-items-center rounded-full bg-white px-4 text-sm font-semibold text-navy-deep transition-colors hover:bg-teal sm:px-5" aria-label="Search">
                <span className="hidden sm:inline">Search</span><ArrowRight className="size-4 sm:hidden" />
              </button>
            </label>
          </form>

          {open && (
            <div data-enter className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-line bg-white text-start text-ink shadow-[0_40px_80px_-30px_rgb(0_0_0/0.6)]">
              <div className="max-h-[min(50svh,26rem)] overflow-y-auto p-2" aria-live="polite">
                {loading && items.length === 0 && <div className="flex flex-col gap-2 p-2">{[0, 1, 2].map((k) => <div key={k} className="skeleton h-12" />)}</div>}
                {!loading && items.length === 0 && <p className="p-5 text-center text-sm text-muted">No matches — try another word.</p>}
                {items.length > 0 && (
                  <ul id="hero-search-results" role="listbox" className={loading ? "opacity-60" : ""}>
                    {items.map((p, k) => (
                      <li key={p.id} id={`hr-${k}`} role="option" aria-selected={k === active}>
                        <Link href={`/products/${encodeURIComponent(p.slug)}`} prefetch={false} onClick={() => { setFocused(false); setQ(""); }}
                          className={cn("flex items-center gap-3 rounded-xl p-2", k === active ? "bg-mist" : "hover:bg-cloud")}>
                          <span className="product-tile relative size-11 shrink-0 overflow-hidden rounded-lg">
                            {p.image_url && <Image src={p.image_url} alt="" fill sizes="44px" className="object-contain p-1" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-1 text-sm">{pick("en", p.name_en, p.name_ar)}</span>
                            {p.brand_name && <span className="text-xs text-muted">{p.brand_name}</span>}
                          </span>
                          <span className="shrink-0 text-sm font-medium tabular-nums text-navy" dir="ltr">{formatPrice(p.price, "en")}</span>
                        </Link>
                      </li>
                    ))}
                    <li>
                      <button type="button" onClick={() => go(`/shop?q=${encodeURIComponent(q.trim())}`)} className="w-full rounded-xl p-2.5 text-start text-sm font-medium text-teal-strong hover:bg-cloud">
                        See all results for “{q.trim()}”
                      </button>
                    </li>
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="hero-in hero-in-3 mt-[2.6svh] flex flex-wrap justify-center gap-2.5 sm:gap-3">
          <Link href="/shop" className="btn group min-h-12 bg-white px-6 text-navy-deep shadow-[0_18px_40px_-18px_rgb(101_194_199/0.9)] hover:bg-teal sm:min-h-[3.25rem] sm:px-8 sm:text-base">
            Shop all products
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          <Link href="/offers" className="btn group min-h-12 border border-white/25 bg-white/[0.08] px-6 text-white backdrop-blur-md hover:bg-white/15 sm:min-h-[3.25rem] sm:px-8 sm:text-base">
            Today&apos;s offers
            <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:rotate-45" />
          </Link>
        </div>
      </div>

      {/* ---------- numbers ---------- */}
      <div className="hero-in hero-in-3 container-x relative z-20 pb-[5.25rem] pt-[1.5svh] sm:pb-[max(1rem,2.5svh)]">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-2.5 text-[0.8rem] text-white/60 backdrop-blur-md sm:rounded-full">
          {(proof.clients || proof.rating) ? (
            <span className="flex items-center gap-2">
              {proof.rating ? <Stars value={proof.rating} /> : null}
              {proof.clients ? <span><b className="font-semibold text-white" dir="ltr">{proof.clients.toLocaleString("en")}+</b> happy clients</span> : null}
            </span>
          ) : null}
          <span><b className="font-semibold text-white" dir="ltr">{stats.products.toLocaleString("en")}+</b> products</span>
          <span><b className="font-semibold text-white" dir="ltr">{stats.brands}</b> brands</span>
          <span className="hidden sm:inline"><b className="font-semibold text-white" dir="ltr">{stats.categories}</b> categories</span>
          <span><b className="font-semibold text-white">27/27</b> governorates</span>
          {n > 1 && (
            <span className="flex gap-1.5" aria-label="Slides">
              {list.map((s, k) => (
                <button key={s.src} type="button" onClick={() => { setI(k); setSeen((x) => new Set([...x, k, (k + 1) % n])); }} aria-label={`Show slide ${k + 1}`} aria-current={k === i}
                  className={cn("h-1.5 rounded-full transition-all", k === i ? "w-5 bg-teal" : "w-1.5 bg-white/30")} />
              ))}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

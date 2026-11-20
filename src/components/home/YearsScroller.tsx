"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { formatPrice } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useCleanImages } from "@/lib/useCleanImages";

export type YearPanel = {
  slug: string; number: number; name: string; tagline: string; count: number;
  products: { slug: string; name: string; image: string; price: number }[];
};

const TINTS = ["#ffffff", "#f1f9f9", "#e6f4f5", "#f4f8fa", "#e9f5f6"];
const WORDS = ["Foundations", "Operative", "Prosthodontics", "Clinical", "Graduation"];

/**
 * Desktop: the section pins and the five years travel horizontally, each with
 * an oversized numeral and its own products drifting at different depths.
 * Mobile / reduced motion: a native horizontal snap rail.
 */
export function YearsScroller({ years }: { years: YearPanel[] }) {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const stRef = useRef<ScrollTrigger | null>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const verdict = useCleanImages(years.flatMap((y) => y.products.map((p) => p.image)));
  const panelProducts = (y: YearPanel) => (verdict ? y.products.filter((p) => verdict.clean.has(p.image)).slice(0, 3) : []);

  useEffect(() => {
    const el = root.current, tr = track.current;
    if (!el || !tr) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      const dist = () => tr.scrollWidth - window.innerWidth;
      const tween = gsap.to(tr, {
        x: () => -dist(), ease: "none",
        scrollTrigger: {
          trigger: el, start: "top top", end: () => `+=${dist()}`, pin: true, scrub: 0.8, invalidateOnRefresh: true,
          onUpdate: (s) => {
            el.style.setProperty("--yp", s.progress.toFixed(4));
            const i = Math.round(s.progress * (years.length - 1));
            el.querySelectorAll<HTMLElement>("[data-year-dot]").forEach((d, j) => d.toggleAttribute("data-on", j === i));
          },
        },
      });
      stRef.current = tween.scrollTrigger ?? null;
      tweenRef.current = tween;
      tr.querySelectorAll<HTMLElement>("[data-numeral]").forEach((node) => {
        gsap.fromTo(node, { yPercent: 18, opacity: 0.25 }, {
          yPercent: 0, opacity: 1, ease: "none",
          scrollTrigger: { trigger: node.closest("[data-panel]"), containerAnimation: tween, start: "left 90%", end: "left 20%", scrub: true },
        });
      });
      return () => { stRef.current = null; tweenRef.current = null; };
    });
    return () => mm.revert();
  }, [years.length]);

  // depth: once the cut-outs are known, they drift at different speeds inside each panel
  useEffect(() => {
    const tween = tweenRef.current, tr = track.current;
    if (!verdict || !tween || !tr) return;
    const tweens = Array.from(tr.querySelectorAll<HTMLElement>("[data-depth]")).map((node) => {
      const d = Number(node.dataset.depth);
      return gsap.fromTo(node, { xPercent: d * 40 }, {
        xPercent: -d * 40, ease: "none",
        scrollTrigger: { trigger: node.closest("[data-panel]"), containerAnimation: tween, start: "left right", end: "right left", scrub: true },
      });
    });
    return () => tweens.forEach((t) => { t.scrollTrigger?.kill(); t.kill(); });
  }, [verdict]);

  const goTo = (i: number) => {
    const st = stRef.current;
    if (!st) {
      document.getElementById(`year-${years[i].slug}`)?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
      return;
    }
    window.scrollTo({ top: st.start + (st.end - st.start) * (i / (years.length - 1)) + 2, behavior: "smooth" });
  };

  return (
    <section ref={root} className="relative overflow-hidden bg-white lg:h-[100svh]" aria-labelledby="years-title">
      <div className="container-x relative z-10 flex flex-wrap items-end justify-between gap-6 pt-20 lg:absolute lg:inset-x-0 lg:top-0 lg:pt-28">
        <div>
          <p className="eyebrow mb-3">Journey 01 · The five years</p>
          <h2 id="years-title" className="display text-[clamp(2.2rem,4.4vw,4rem)] leading-[0.95]">
            Five years. <span className="font-serif font-normal italic text-teal-strong">One list at a time.</span>
          </h2>
        </div>
        {/* interactive year selector */}
        <div className="flex items-center gap-1 rounded-full border border-line bg-white/80 p-1 backdrop-blur" role="tablist" aria-label="Jump to a year">
          {years.map((y, i) => (
            <button
              key={y.slug} type="button" onClick={() => goTo(i)} data-year-dot={true} data-on={i === 0 ? "" : undefined}
              className="grid size-10 place-items-center rounded-full font-mono text-sm text-muted transition-colors data-[on]:bg-navy-deep data-[on]:text-white hover:text-navy-deep"
              aria-label={y.name}
            >
              {y.number}
            </button>
          ))}
        </div>
      </div>

      <div ref={track} className="scroll-rail mt-10 flex gap-0 lg:mt-0 lg:h-full lg:overflow-visible" style={{ scrollSnapType: "x mandatory" }}>
        {years.map((y, i) => (
          <article
            key={y.slug} id={`year-${y.slug}`} data-panel
            className="relative flex h-[34rem] w-[88vw] shrink-0 overflow-hidden sm:h-[38rem] lg:h-full lg:w-[78vw] xl:w-[70vw]"
            style={{ background: TINTS[i % TINTS.length] }}
          >
            <span data-numeral aria-hidden
              className="display pointer-events-none absolute -bottom-[0.18em] left-[-0.04em] select-none text-[clamp(16rem,58vh,40rem)] leading-none tracking-[-0.08em]"
              style={i % 2 ? { color: "#022a52" } : { color: "transparent", WebkitTextStroke: "1.5px rgb(4 61 116 / 0.35)" }}>
              {y.number}
            </span>
            <div className="relative z-10 ml-auto flex w-full flex-col justify-end gap-5 p-6 sm:p-10 lg:w-[52%] lg:justify-center lg:pt-40">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-teal-strong">Y/0{y.number} — {WORDS[i] ?? "Essentials"}</p>
              <h3 className="display text-[clamp(2.2rem,4vw,3.6rem)] leading-[0.95]">{y.name}</h3>
              {y.tagline && <p className="max-w-sm text-lg leading-relaxed text-muted">{y.tagline}</p>}
              <div className="flex items-center gap-4">
                <Link href={`/students/${y.slug}`} className="btn btn-primary" data-magnetic>
                  Shop {y.name} <ArrowUpRight className="size-4" />
                </Link>
                {y.count > 0 && <span className="font-mono text-xs text-muted">{y.count} products</span>}
              </div>
            </div>
            {/* products drifting at different depths */}
            <div className="pointer-events-none absolute inset-0 hidden lg:block">
              {panelProducts(y).map((p, j) => (
                <Link
                  key={p.slug} href={`/products/${encodeURIComponent(p.slug)}`} data-depth={[0.5, -0.35, 0.8][j]}
                  className="cutout group/p pointer-events-auto absolute block"
                  style={[
                    { left: "26%", top: "16%", width: "15rem" },
                    { left: "8%", top: "48%", width: "11rem" },
                    { left: "34%", top: "56%", width: "12.5rem" },
                  ][j]}
                  data-cursor="view"
                >
                  <span className="relative block aspect-square">
                    <Image src={p.image} alt={p.name} fill sizes="240px" className="object-contain transition-transform duration-700 group-hover/p:scale-110 group-hover/p:-rotate-3" />
                  </span>
                  <span className="mt-1 block text-center font-mono text-[0.65rem] text-muted opacity-0 transition-opacity group-hover/p:opacity-100">{formatPrice(p.price, "en")}</span>
                </Link>
              ))}
            </div>
            {/* mobile: a compact product strip */}
            <div className="absolute inset-x-6 top-8 grid grid-cols-3 gap-3 sm:inset-x-10 lg:hidden">
              {panelProducts(y).map((p) => (
                <Link key={p.slug} href={`/products/${encodeURIComponent(p.slug)}`} className="cutout relative block aspect-square">
                  <Image src={p.image} alt={p.name} fill sizes="30vw" className="object-contain" />
                </Link>
              ))}
            </div>
          </article>
        ))}
      </div>

      {/* progress ruler */}
      <div aria-hidden className="pointer-events-none absolute inset-x-10 bottom-8 hidden h-4 lg:block">
        <div className="ruler-ticks absolute inset-0 text-navy/20" />
        <div className="absolute bottom-0 left-0 h-[3px] w-full origin-left bg-teal-strong" style={{ transform: "scaleX(var(--yp, 0))" }} />
      </div>
    </section>
  );
}

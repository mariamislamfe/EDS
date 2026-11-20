"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { gsap } from "@/lib/gsap";
import { formatPrice } from "@/lib/i18n";
import { AddToCartButton } from "@/components/commerce/AddToCartButton";
import type { CartLine } from "@/lib/store";
import { pickCutouts, useCleanImages } from "@/lib/useCleanImages";
import { cn } from "@/lib/utils";

export type KitItem = { slug: string; name: string; image: string; price?: number };

// flat-lay slots on a 100 × 62 stage: [left%, top%, width%, rotation]
const SLOTS: [number, number, number, number][] = [
  [3, 8, 22, -9], [27, 2, 20, 6], [50, 10, 19, -4], [72, 4, 24, 10],
  [8, 50, 19, 7], [30, 44, 23, -6], [55, 52, 18, 12], [76, 48, 20, -8], [44, 26, 14, 18],
];

/**
 * A product-launch moment for a kit: the items begin stacked in the centre and
 * spread into a flat-lay as the visitor scrolls (scrubbed, reversible).
 */
export function KitLaunch({ eyebrow, title, accent, text, href, cta, items, price, compare, line }: {
  eyebrow: string; title: string; accent: string; text: string; href: string; cta: string;
  items: KitItem[]; price?: number | null; compare?: number | null; line?: Omit<CartLine, "key" | "qty">;
}) {
  const root = useRef<HTMLElement>(null);
  const verdict = useCleanImages(items.slice(0, 24).map((i) => i.image));
  const shown = pickCutouts(items.slice(0, 24), verdict?.clean, SLOTS.length, 5);

  useEffect(() => {
    const el = root.current;
    if (!el || !shown.length) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const nodes = gsap.utils.toArray<HTMLElement>("[data-kit-item]", el);
      const stage = el.querySelector<HTMLElement>("[data-kit-stage]")!;
      const tl = gsap.timeline({
        scrollTrigger: { trigger: stage, start: "top 85%", end: "center 45%", scrub: 0.9 },
      });
      nodes.forEach((n, i) => {
        const r = stage.getBoundingClientRect(), b = n.getBoundingClientRect();
        const dx = r.left + r.width / 2 - (b.left + b.width / 2);
        const dy = r.top + r.height / 2 - (b.top + b.height / 2);
        tl.fromTo(n, { x: dx, y: dy, scale: 0.55, rotate: (i % 2 ? 1 : -1) * (14 + i * 4), autoAlpha: 0.0 },
          { x: 0, y: 0, scale: 1, rotate: 0, autoAlpha: 1, ease: "power2.out", duration: 1 }, i * 0.06);
      });
      tl.fromTo(el.querySelectorAll("[data-kit-label]"), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, stagger: 0.04, duration: 0.4 }, 0.8);
    });
    return () => mm.revert();
  }, [shown.length]);

  return (
    <section ref={root} className="relative overflow-hidden bg-white py-24 lg:py-36" aria-labelledby="kit-title">
      <div className="container-x">
        <div className="mx-auto max-w-4xl text-center">
          <p className="eyebrow mb-5">{eyebrow}</p>
          <h2 id="kit-title" className="display text-[clamp(3rem,8vw,7.5rem)] leading-[0.88]">
            {title} <span className="font-serif font-normal italic text-teal-strong">{accent}</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted">{text}</p>
        </div>

        {/* flat-lay: product photography on a white surface, so each item reads as an isolated object */}
        <div data-kit-stage className="relative mx-auto mt-12 hidden aspect-[100/62] max-w-6xl md:block">
          {shown.map((it, i) => {
            const [l, t, w, rot] = SLOTS[i];
            return (
              <Link
                key={it.slug} href={`/products/${encodeURIComponent(it.slug)}`} data-kit-item data-cursor="view"
                className={cn("group/k absolute block", it.cutout && "cutout")} style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, zIndex: i === 8 ? 5 : 1 }}
              >
                <span className={cn("relative block aspect-square", !it.cutout && "scale-[0.82] overflow-hidden rounded-2xl shadow-[0_24px_40px_-24px_rgb(2_42_82/0.45)]")} style={{ transform: `rotate(${rot}deg)` }}>
                  <Image src={it.image} alt={it.name} fill sizes="(min-width:1280px) 260px, 22vw"
                    className={cn("transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover/k:scale-[1.07]", it.cutout ? "object-contain" : "object-cover")} />
                </span>
                <span data-kit-label className="mt-1 block text-center">
                  <span className="font-mono text-[0.62rem] text-teal-strong">{String(i + 1).padStart(2, "0")}</span>
                  <span className="mx-auto line-clamp-1 block max-w-[90%] text-xs text-muted group-hover/k:text-navy-deep">{it.name}</span>
                </span>
              </Link>
            );
          })}
        </div>
        {/* mobile flat-lay */}
        <ul className="mt-10 grid grid-cols-3 gap-x-3 gap-y-6 md:hidden" data-stagger>
          {shown.map((it, i) => (
            <li key={it.slug}>
              <Link href={`/products/${encodeURIComponent(it.slug)}`} className={cn("block", it.cutout && "cutout")}>
                <span className={cn("relative block aspect-square", !it.cutout && "overflow-hidden rounded-xl")} style={{ transform: `rotate(${SLOTS[i][3] / 2}deg)` }}>
                  <Image src={it.image} alt={it.name} fill sizes="30vw" className={it.cutout ? "object-contain" : "object-cover"} />
                </span>
                <span className="mt-1 line-clamp-1 block text-center text-[0.7rem] text-muted">{it.name}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mx-auto mt-14 flex max-w-3xl flex-col items-center justify-between gap-6 border-t border-line pt-8 sm:flex-row">
          <div className="flex items-baseline gap-4">
            <span className="font-mono text-xs uppercase tracking-[0.16em] text-muted">{items.length} items</span>
            {price != null && price > 0 && (
              <span className="display text-3xl tabular-nums">
                {formatPrice(price, "en")}
                {compare != null && compare > price && <s className="ml-3 text-lg font-normal text-muted">{formatPrice(compare, "en")}</s>}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {line && <AddToCartButton line={line} />}
            <Link href={href} className={line ? "btn btn-ghost btn-lg" : "btn btn-primary btn-lg"} data-magnetic>
              {cta} <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

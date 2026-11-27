"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type CarouselCategory = { href: string; title: string; count: number; image: string | null };

const AUTO_MS = 4500;

/**
 * Glass cover-flow of categories. The centre card faces the viewer; its
 * neighbours turn away in 3D and step back. A control pill underneath shows
 * the current category. Loops; drag, swipe, arrows or keys. Each card moves
 * with one transform (compositor only); only cards near the centre load images.
 */
export function CategoryCarousel({ items }: { items: CarouselCategory[] }) {
  const n = items.length;
  const [active, setActive] = useState(0);
  const [drag, setDrag] = useState(0);
  const [hover, setHover] = useState(false);
  const [visible, setVisible] = useState(false);
  const [w, setW] = useState(300);
  const [narrow, setNarrow] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; moved: boolean } | null>(null);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const cw = el.clientWidth;
      setNarrow(cw < 640);
      setW(cw < 640 ? Math.min(cw * 0.58, 230) : Math.min(290, cw * 0.21));
    });
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => { ro.disconnect(); io.disconnect(); };
  }, []);

  const go = useCallback((d: number) => setActive((a) => (a + d + n) % n), [n]);

  useEffect(() => {
    if (!visible || hover || start.current || n < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => go(1), AUTO_MS);
    return () => window.clearTimeout(t);
  }, [active, visible, hover, go, n]);

  if (!n) return null;

  const gap = w * (narrow ? 0.84 : 0.9);
  const rel = (i: number) => {
    let d = i - active;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d;
  };
  const cur = items[active];

  return (
    <div
      className="relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onKeyDown={(e) => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); }}
    >
      <div
        ref={stage}
        className="relative h-[clamp(19rem,30vw,23.5rem)] touch-pan-y select-none overflow-hidden [perspective:1600px]"
        onPointerDown={(e) => { start.current = { x: e.clientX, moved: false }; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); }}
        onPointerMove={(e) => {
          if (!start.current) return;
          const dx = e.clientX - start.current.x;
          if (Math.abs(dx) > 6) start.current.moved = true;
          setDrag(dx);
        }}
        onPointerUp={() => {
          if (!start.current) return;
          const steps = Math.round(-drag / (gap * 0.55));
          if (steps) go(Math.max(-2, Math.min(2, steps)));
          setDrag(0);
          window.setTimeout(() => (start.current = null), 0);
        }}
        onPointerCancel={() => { start.current = null; setDrag(0); }}
        role="region"
        aria-roledescription="carousel"
        aria-label="Categories"
      >
        {/* edge fades as plain gradients (a CSS mask would repaint the whole stage every frame) */}
        <span aria-hidden className="pointer-events-none absolute inset-y-0 start-0 z-30 w-[8%] bg-gradient-to-r from-abyss to-transparent" />
        <span aria-hidden className="pointer-events-none absolute inset-y-0 end-0 z-30 w-[8%] bg-gradient-to-l from-abyss to-transparent" />
        {items.map((c, i) => {
          const d = rel(i);
          const pos = d + drag / gap;
          const abs = Math.min(Math.abs(pos), 3);
          const sign = pos === 0 ? 0 : pos / Math.abs(pos);
          const turn = Math.min(abs, 1.6) * (narrow ? 22 : 30) * -sign;
          const depth = -Math.min(abs, 2.5) * 140;
          // every card in the visible range keeps its image, so a step only mounts one at the faded edge
          const near = Math.abs(d) <= 3;
          const shown = Math.abs(d) <= 3;
          if (!shown && !drag) return null; // off-stage cards aren't rendered: fewer layers to rebuild per step
          const center = d === 0;
          return (
            <Link
              key={c.href}
              href={c.href}
              prefetch={false}
              draggable={false}
              tabIndex={center ? 0 : -1}
              aria-hidden={!center}
              onClick={(e) => {
                if (start.current?.moved) { e.preventDefault(); return; }
                if (!center) { e.preventDefault(); go(d); }
              }}
              className={cn(
                "group absolute left-1/2 top-1/2 flex flex-col overflow-hidden rounded-[1.75rem] border p-2 will-change-transform [backface-visibility:hidden]",
                center
                  ? "border-white/35 bg-[#16416b] shadow-[0_50px_90px_-30px_rgb(0_0_0/0.75)]"
                  : "border-white/15 bg-[#0c2f55] shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)]",
                drag ? "" : "transition-[transform,opacity] duration-700 ease-[var(--ease-out-soft)]",
              )}
              style={{
                width: w, height: w * 1.18,
                transform: `translate3d(calc(-50% + ${pos * gap}px), -50%, ${depth}px) rotateY(${turn}deg)`,
                zIndex: 20 - Math.round(abs * 4),
                opacity: shown ? 1 - Math.max(0, abs - 1.7) * 0.7 : 0,
                pointerEvents: shown ? undefined : "none",
              }}
            >
              {/* photo plate */}
              <span className="relative block flex-1 overflow-hidden rounded-[1.35rem] bg-[radial-gradient(80%_70%_at_50%_40%,#fff,#e9eff3)]">
                {near && c.image && (
                  <Image src={c.image} alt="" fill sizes="(min-width:640px) 380px, 66vw" draggable={false}
                    className="object-contain p-[13%] mix-blend-multiply transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-105" />
                )}
                <span className={cn("absolute inset-0 bg-abyss transition-opacity duration-700", center ? "opacity-0" : "opacity-25")} />
                <span className={cn("absolute inset-x-0 top-3 flex justify-center transition-opacity duration-500", center ? "opacity-100" : "opacity-0")}>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-deep px-3 py-1.5 text-xs font-medium text-white">
                    Shop now <ArrowUpRight className="size-3.5" />
                  </span>
                </span>
              </span>
              {/* glass caption */}
              <span className="flex items-end justify-between gap-3 px-2.5 pb-1.5 pt-3 text-white">
                <span className="min-w-0">
                  <span className={cn("block truncate font-display font-semibold leading-tight", center ? "text-lg sm:text-xl" : "text-sm sm:text-base")}>{c.title}</span>
                  <span className="mt-0.5 block text-xs text-white/65 sm:text-sm">{c.count} products</span>
                </span>
                <span className={cn("shrink-0 whitespace-nowrap font-mono text-xs tabular-nums text-white/60 transition-opacity", center ? "opacity-100" : "opacity-0")} dir="ltr">
                  {i + 1} / {n}
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      {/* control pill */}
      <div className="mt-4 flex flex-col items-center gap-3">
        <div className="flex w-full max-w-md items-center gap-3 rounded-full border border-white/15 bg-[#0d3357] p-2 text-white">
          <button type="button" onClick={() => go(-1)} className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20" aria-label="Previous category">
            <ArrowLeft className="size-4" />
          </button>
          <Link href={cur.href} className="group flex min-w-0 flex-1 items-center gap-3">
            <span className="relative size-11 shrink-0 overflow-hidden rounded-full bg-white">
              {cur.image && <Image src={cur.image} alt="" fill sizes="44px" className="object-contain p-1.5 mix-blend-multiply" />}
            </span>
            <span key={cur.href} className="min-w-0 animate-[fade_.4s_ease]">
              <span className="block truncate text-sm font-semibold group-hover:text-teal">{cur.title}</span>
              <span className="block text-xs text-white/60">{cur.count} products · Shop the range</span>
            </span>
          </Link>
          <button type="button" onClick={() => go(1)} className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20" aria-label="Next category">
            <ArrowRight className="size-4" />
          </button>
        </div>
        <ol className="flex gap-1.5" aria-hidden>
          {items.map((c, i) => <li key={c.href} className={cn("h-1.5 rounded-full transition-all duration-500", i === active ? "w-6 bg-teal" : "w-1.5 bg-white/30")} />)}
        </ol>
      </div>
    </div>
  );
}

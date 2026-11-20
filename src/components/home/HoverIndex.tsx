"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { gsap } from "@/lib/gsap";
import { cn } from "@/lib/utils";

export type IndexRow = { href: string; title: string; meta?: string; image?: string | null };

/**
 * Large typographic index. On fine pointers a round preview "lens" follows the
 * cursor and shows the hovered row's product photography.
 */
export function HoverIndex({ rows, dark = false, numbered = true }: { rows: IndexRow[]; dark?: boolean; numbered?: boolean }) {
  const lens = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = lens.current;
    if (!el || !window.matchMedia("(pointer: fine)").matches) return;
    const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3.out" });
    const move = (e: PointerEvent) => { xTo(e.clientX); yTo(e.clientY); };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  const img = active != null ? rows[active]?.image : null;
  return (
    <div onMouseLeave={() => setActive(null)}>
      <ol className={cn("border-t", dark ? "border-white/10" : "border-navy/10")} data-stagger>
        {rows.map((r, i) => (
          <li key={r.href} className={cn("border-b", dark ? "border-white/10" : "border-navy/10")}>
            <Link
              href={r.href}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              data-cursor="view"
              className="group/r flex items-center gap-5 py-5 sm:py-6"
            >
              {numbered && <span className={cn("w-8 font-mono text-xs", dark ? "text-white/40" : "text-muted")}>{String(i + 1).padStart(2, "0")}</span>}
              <span className={cn(
                "display flex-1 text-[clamp(1.6rem,3.6vw,3.4rem)] leading-none transition-[transform,opacity,color] duration-500 ease-[var(--ease-out-soft)] group-hover/r:translate-x-4",
                dark ? "text-white group-hover/r:text-teal" : "text-navy-deep group-hover/r:text-teal-strong",
                active != null && active !== i && "opacity-35",
              )}>
                {r.title}
              </span>
              {r.meta && <span className={cn("hidden font-mono text-xs sm:block", dark ? "text-white/45" : "text-muted")}>{r.meta}</span>}
              <ArrowUpRight className={cn("size-6 transition-transform duration-500 group-hover/r:rotate-45", dark ? "text-white/40" : "text-navy/30")} />
            </Link>
          </li>
        ))}
      </ol>
      <div
        ref={lens}
        aria-hidden
        className={cn(
          "pointer-events-none fixed left-0 top-0 z-40 -ml-36 -mt-36 hidden size-72 overflow-hidden rounded-full bg-white shadow-[0_40px_80px_-30px_rgb(0_0_0/0.45)] transition-[opacity,scale] duration-500 ease-[var(--ease-out-soft)] [@media(pointer:fine)]:block",
          img ? "scale-100 opacity-100" : "scale-50 opacity-0",
        )}
      >
        {rows.map((r, i) => r.image && (
          <Image key={r.href} src={r.image} alt="" fill sizes="288px"
            className={cn("object-contain p-10 transition-opacity duration-300", active === i ? "opacity-100" : "opacity-0")} />
        ))}
      </div>
    </div>
  );
}

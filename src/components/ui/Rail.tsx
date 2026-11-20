"use client";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/** Horizontal scroll-snap rail. Native scrolling (touch/trackpad) + arrow buttons. */
export function Rail({ children, itemClass, label, className }: { children: React.ReactNode; itemClass?: string; label?: string; className?: string }) {
  const { locale, t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const rtl = locale === "ar";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const pos = Math.abs(el.scrollLeft);
      setEdges({ start: pos < 4, end: pos > max - 4 });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { el.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, []);

  const go = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85 * (rtl ? -1 : 1), behavior: "smooth" });
  };

  return (
    <div className={cn("relative", className)} role="region" aria-label={label}>
      <div
        ref={ref}
        className={cn(
          "scroll-rail -mx-4 gap-4 px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:gap-6 lg:px-0",
          itemClass ?? "auto-cols-[68%] sm:auto-cols-[40%] md:auto-cols-[30%] lg:auto-cols-[calc((100%-4.5rem)/4)]",
        )}
      >
        {children}
      </div>
      <div className="pointer-events-none absolute -top-[4.25rem] end-0 hidden gap-2 lg:flex">
        <button type="button" onClick={() => go(-1)} disabled={edges.start} aria-label={t.common.previous}
          className="pointer-events-auto grid size-11 place-items-center rounded-full border border-line bg-white text-navy transition-opacity hover:border-navy disabled:opacity-30">
          {rtl ? <ArrowRight className="size-4" /> : <ArrowLeft className="size-4" />}
        </button>
        <button type="button" onClick={() => go(1)} disabled={edges.end} aria-label={t.common.next}
          className="pointer-events-auto grid size-11 place-items-center rounded-full border border-line bg-white text-navy transition-opacity hover:border-navy disabled:opacity-30">
          {rtl ? <ArrowLeft className="size-4" /> : <ArrowRight className="size-4" />}
        </button>
      </div>
    </div>
  );
}

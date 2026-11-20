"use client";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { CatalogProduct } from "@/lib/types";
import { useI18n } from "@/lib/i18n/client";
import { gsap, prefersReduced } from "@/lib/gsap";
import { ProductCard } from "@/components/commerce/ProductCard";
import { cn } from "@/lib/utils";

export type DiscoveryTab = { id: string; label: string; href: string; products: CatalogProduct[] };

/** Tabbed discovery: a sliding indicator over an even grid of equal cards. */
export function Discovery({ tabs }: { tabs: DiscoveryTab[] }) {
  const { t } = useI18n();
  const list = tabs.filter((x) => x.products.length > 0);
  const [active, setActive] = useState(list[0]?.id);
  const bar = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLUListElement>(null);
  const [pill, setPill] = useState({ x: 0, w: 0 });
  const first = useRef(true);

  useLayoutEffect(() => {
    const btn = bar.current?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    if (btn) setPill({ x: btn.offsetLeft, w: btn.offsetWidth });
  }, [active]);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!grid.current || prefersReduced()) return;
    gsap.fromTo(grid.current.children, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.03, ease: "power3.out" });
  }, [active]);

  if (!list.length) return null;
  const tab = list.find((x) => x.id === active) ?? list[0];
  const items = tab.products.slice(0, 8);

  return (
    <section className="container-x py-16 sm:py-24 lg:py-32" aria-labelledby="disc-title">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-8">
        <div>
          <p className="eyebrow mb-3">The catalogue</p>
          <h2 id="disc-title" className="display text-[clamp(2.4rem,5vw,4.6rem)] leading-[0.92]">
            Discover <span className="font-serif font-normal italic text-teal-strong">what&apos;s on the tray.</span>
          </h2>
        </div>
        <div ref={bar} role="tablist" aria-label="Product collections" className="relative flex max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-white p-1">
          <span aria-hidden className="absolute bottom-1 top-1 rounded-full bg-navy-deep transition-[transform,width] duration-500 ease-[var(--ease-out-soft)]" style={{ transform: `translateX(${pill.x - 4}px)`, width: pill.w, left: 4 }} />
          {list.map((x) => (
            <button
              key={x.id} type="button" role="tab" data-tab={x.id} aria-selected={x.id === tab.id}
              onClick={() => setActive(x.id)}
              className={cn("relative z-10 h-10 whitespace-nowrap rounded-full px-5 text-sm font-medium transition-colors", x.id === tab.id ? "text-white" : "text-ink/70 hover:text-navy-deep")}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>

      <ul ref={grid} className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-12" role="tabpanel">
        {items.map((p, i) => (
          <li key={p.id}><ProductCard product={p} locale="en" t={t} priority={i < 2} /></li>
        ))}
      </ul>

      <div className="mt-14 flex justify-center">
        <Link href={tab.href} className="btn btn-ghost btn-lg" data-magnetic>
          See all {tab.label.toLowerCase()} <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}

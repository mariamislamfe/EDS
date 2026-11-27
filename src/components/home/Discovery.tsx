"use client";
import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { CatalogProduct } from "@/lib/types";
import { useI18n } from "@/lib/i18n/client";
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

  useLayoutEffect(() => {
    const btn = bar.current?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    if (btn) setPill({ x: btn.offsetLeft, w: btn.offsetWidth });
  }, [active]);


  if (!list.length) return null;
  const tab = list.find((x) => x.id === active) ?? list[0];
  const items = tab.products.slice(0, 4); // one row on desktop, 2×2 on phones

  return (
    <section className="container-x py-10 sm:py-14" aria-labelledby="disc-title">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">The catalogue</p>
          <h2 id="disc-title" className="display text-[clamp(1.9rem,3.6vw,3rem)] leading-[0.95]">
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

      <ul key={tab.id} ref={grid} className="tab-swap grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-4 md:grid-cols-4 lg:gap-x-6" role="tabpanel">
        {items.map((p) => (
          <li key={p.id}><ProductCard product={p} locale="en" t={t} /></li>
        ))}
      </ul>

      <div className="mt-6 flex justify-center">
        <Link href={tab.href} className="btn btn-ghost" data-magnetic>
          See all {tab.label.toLowerCase()} <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}

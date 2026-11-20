"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { gsap, prefersReduced } from "@/lib/gsap";
import { formatPrice } from "@/lib/i18n";
import { pickCutouts, useCleanImages } from "@/lib/useCleanImages";
import { cn } from "@/lib/utils";

export type Exhibit = { slug: string; name: string; image: string; price: number };

/** Three products hung like museum pieces: cut-outs blend into the wall, other photos are framed. */
export function Exhibits({ items }: { items: Exhibit[] }) {
  const verdict = useCleanImages(items.map((i) => i.image));
  const shown = pickCutouts(items, verdict?.clean, 3);
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!shown.length || !list.current || prefersReduced()) return;
    const tw = gsap.fromTo(list.current.children, { autoAlpha: 0, y: 50 }, {
      autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.1, clearProps: "transform",
      scrollTrigger: { trigger: list.current, start: "top 85%", once: true },
    });
    return () => { tw.scrollTrigger?.kill(); tw.kill(); };
  }, [shown.length]);

  return (
    <ul ref={list} className="grid min-h-[16rem] grid-cols-3 items-end gap-3 sm:gap-6">
      {shown.map((p, i) => (
        <li key={p.slug} className={cn(p.cutout && "cutout", i === 1 ? "-translate-y-10 sm:-translate-y-16" : i === 2 ? "translate-y-6" : "")}>
          <Link href={`/products/${encodeURIComponent(p.slug)}`} className="group/x block" data-cursor="view">
            <span className={cn("relative block aspect-[3/4]", !p.cutout && "overflow-hidden rounded-[1.25rem] shadow-[0_30px_50px_-30px_rgb(2_42_82/0.5)]")}>
              <Image src={p.image} alt={p.name} fill sizes="(min-width:1024px) 20vw, 30vw"
                className={cn("transition-transform duration-700 ease-[var(--ease-out-soft)]",
                  p.cutout ? "object-contain group-hover/x:-translate-y-2 group-hover/x:rotate-[-2deg] group-hover/x:scale-[1.04]" : "object-cover group-hover/x:scale-[1.05]")} />
            </span>
            <span className="mt-4 block border-t border-navy/15 pt-3">
              <span className="font-mono text-[0.65rem] text-teal-strong">No. 0{i + 1}</span>
              <span className="mt-1 line-clamp-2 block text-sm font-medium text-navy-deep">{p.name}</span>
              <span className="mt-1 block text-sm tabular-nums text-muted">{formatPrice(p.price, "en")}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

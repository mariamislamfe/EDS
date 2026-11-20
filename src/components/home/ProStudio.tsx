import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CatalogProduct } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";
import { InstrumentStage } from "@/components/three/InstrumentStage";
import { Words } from "@/components/fx/Words";
import { ProductCard } from "@/components/commerce/ProductCard";
import { Rail } from "@/components/ui/Rail";
import { HoverIndex, type IndexRow } from "./HoverIndex";

/**
 * The professional studio: steel instruments at large scale, rim-lit on navy,
 * turning with the scroll; a typographic index of clinical categories; and a
 * rail of real handpieces & equipment.
 */
export function ProStudio({ rows, products, t }: { rows: IndexRow[]; products: CatalogProduct[]; t: Dictionary }) {
  return (
    <section className="on-dark relative overflow-hidden bg-abyss py-24 text-white lg:py-36" aria-labelledby="pro-title">
      <div aria-hidden className="mm-grid-dark absolute inset-0 opacity-70" />
      <div className="container-x relative grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
        <div className="lg:sticky lg:top-24 lg:h-[calc(100svh-8rem)]">
          <p className="eyebrow mb-4">Professional equipment</p>
          <h2 id="pro-title" className="display text-[clamp(2.6rem,5.6vw,5.4rem)] leading-[0.9]" data-split>
            <Words text="The clinic," accent="in detail." accentClass="font-serif font-normal italic text-teal" />
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-white/60" data-rise>
            High-speed handpieces, extraction forceps, scalers and probes — engineered tools, shown as they are.
          </p>
          <InstrumentStage
            dark
            className="relative -mx-4 mt-4 h-[22rem] sm:h-[28rem] lg:mx-0 lg:h-[calc(100%-15rem)]"
            items={[
              { kind: "handpiece", x: -0.4, y: 0.0, z: 1.2, rz: -0.55, rx: 0.5, scale: 2.5 },
              { kind: "forceps", x: 2.9, y: 0.3, z: -0.8, rz: 0.35, scale: 1.7 },
              { kind: "mirror", x: -3.3, y: 0.5, z: -1.2, rz: 0.6, rx: 0.3, scale: 1.6 },
            ]}
          />
        </div>
        <div>
          <HoverIndex rows={rows} dark />
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/dentists" className="btn btn-light btn-lg" data-magnetic>Shop Professional Supplies <ArrowUpRight className="size-4" /></Link>
            <Link href="/shop?audience=dentist" className="btn btn-outline-light btn-lg" data-magnetic>All clinic products</Link>
          </div>
        </div>
      </div>

      {products.length > 0 && (
        <div className="container-x relative mt-24 lg:mt-32">
          <div className="mb-8 flex items-end justify-between gap-6">
            <h3 className="display text-[clamp(1.8rem,3vw,2.6rem)] leading-none">Handpieces &amp; equipment</h3>
            <Link href="/categories/handpieces" className="text-sm font-medium text-teal underline-offset-4 hover:underline lg:mr-28">See all</Link>
          </div>
          <Rail label="Handpieces and equipment">
            {products.map((p) => <ProductCard key={p.id} product={p} locale="en" t={t} tone="dark" />)}
          </Rail>
        </div>
      )}
    </section>
  );
}

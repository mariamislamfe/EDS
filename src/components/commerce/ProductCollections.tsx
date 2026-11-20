import type { CatalogProduct } from "@/lib/types";
import type { Dictionary, Locale } from "@/lib/i18n";
import { Rail } from "@/components/ui/Rail";
import { SectionHead } from "@/components/ui/Section";
import { ProductCard } from "./ProductCard";
import { cn } from "@/lib/utils";

export function ProductGrid({ products, locale, t, className, priorityCount = 4 }: {
  products: CatalogProduct[]; locale: Locale; t: Dictionary; className?: string; priorityCount?: number;
}) {
  return (
    <ul className={cn("grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:gap-x-6 xl:grid-cols-4", className)}>
      {products.map((p, i) => (
        <li key={p.id} data-reveal style={{ ["--reveal-delay" as string]: `${(i % 4) * 60}ms` }}>
          <ProductCard product={p} locale={locale} t={t} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}

/** Titled horizontal rail of products; renders nothing when empty. */
export function ProductRailSection({ title, text, href, linkLabel, products, locale, t, className }: {
  title: string; text?: string; href?: string; linkLabel?: string;
  products: CatalogProduct[]; locale: Locale; t: Dictionary; className?: string;
}) {
  if (!products.length) return null;
  return (
    <section className={cn("container-x py-14 lg:py-20", className)} data-reveal>
      <SectionHead title={title} text={text} href={href} linkLabel={linkLabel} className="lg:pe-28" />
      <Rail label={title}>
        {products.map((p) => <ProductCard key={p.id} product={p} locale={locale} t={t} />)}
      </Rail>
    </section>
  );
}

import Image from "next/image";
import Link from "next/link";
import type { CatalogProduct } from "@/lib/types";
import { pick, type Dictionary, type Locale } from "@/lib/i18n";
import { cn, discountPercent } from "@/lib/utils";
import { Price } from "./Price";
import { WishlistButton } from "./WishlistButton";
import { CardActions } from "./CardActions";

/**
 * Works in server and client trees: the interactive parts are client islands.
 */
export function ProductCard({
  product: p, locale, t, priority = false, className, tone = "light", size = "md",
}: {
  product: CatalogProduct;
  locale: Locale;
  t: Dictionary;
  priority?: boolean;
  className?: string;
  tone?: "light" | "dark";
  size?: "md" | "lg";
}) {
  const dark = tone === "dark";
  const name = pick(locale, p.name_en, p.name_ar);
  const pct = discountPercent(p.price, p.compare_at_price);
  const href = `/products/${encodeURIComponent(p.slug)}`;

  return (
    <article className={cn(
      "group relative isolate overflow-hidden rounded-[1.25rem] ring-1 ring-navy/[0.06] transition-shadow duration-500 hover:shadow-[0_24px_50px_-28px_rgb(2_42_82/0.55)]",
      size === "lg" ? "aspect-[4/5] lg:aspect-auto lg:h-full" : "aspect-[4/5]",
      dark ? "bg-white" : "product-tile",
      className,
    )}>
      {/* the whole tile opens the product */}
      <Link href={href} prefetch={false} className="absolute inset-0 z-0" aria-label={name} tabIndex={-1} />

      {/* product shot */}
      <div className="pointer-events-none absolute inset-0 p-[9%] pb-[30%] transition-[padding] duration-500 ease-[var(--ease-out-soft)] md:group-hover:pb-[52%]">
        <div className="relative size-full">
          {p.image_url ? (
            <>
              <Image src={p.image_url} alt="" fill priority={priority}
                sizes="(min-width:1280px) 18vw, (min-width:768px) 26vw, 46vw"
                className={cn("cutout object-contain transition-[transform,opacity] duration-700 ease-[var(--ease-out-soft)]", p.image_url_2 && "md:group-hover:opacity-0")} />
              {p.image_url_2 && (
                <Image src={p.image_url_2} alt="" aria-hidden fill loading="lazy"
                  sizes="(min-width:1280px) 18vw, (min-width:768px) 26vw, 46vw"
                  className="cutout hidden object-contain opacity-0 transition-opacity duration-700 md:block md:group-hover:opacity-100" />
              )}
            </>
          ) : (
            <div className="grid h-full place-items-center">
              <Image src="/brand/eds-mark.png" alt="" width={48} height={48} className="opacity-25 grayscale" />
            </div>
          )}
        </div>
      </div>

      {/* corner badges */}
      <div className="pointer-events-none absolute inset-x-2.5 top-2.5 z-10 flex items-start justify-between gap-2">
        <div className="flex flex-col items-start gap-1">
          {pct > 0 && <span className="rounded-full bg-navy px-2 py-0.5 text-[0.68rem] font-semibold tabular-nums text-white">−{pct}%</span>}
          {!p.in_stock && <span className="rounded-full bg-white px-2 py-0.5 text-[0.68rem] font-medium text-muted ring-1 ring-line">{t.common.outOfStock}</span>}
        </div>
        <div className="pointer-events-auto transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <WishlistButton productId={p.id} />
        </div>
      </div>

      {/* info glass: a slim strip at rest, half the card on hover */}
      <div className="absolute inset-x-2 bottom-2 z-10 rounded-[0.95rem] bg-white/80 px-3 py-2.5 shadow-[0_8px_24px_-14px_rgb(2_42_82/0.35)] ring-1 ring-white/70 backdrop-blur-md">
        <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-500 ease-[var(--ease-out-soft)] md:group-hover:grid-rows-[1fr] md:group-focus-within:grid-rows-[1fr]">
          <div className="overflow-hidden">
            {p.brand_name && <p className="truncate pb-1 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-teal-strong">{p.brand_name}</p>}
          </div>
        </div>
        <h3 className={cn("font-sans font-medium leading-snug text-navy-deep", size === "lg" ? "text-base" : "text-[0.8rem] sm:text-[0.86rem]")}>
          <Link href={href} prefetch={false} className="line-clamp-1 md:group-hover:line-clamp-2">{name}</Link>
        </h3>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <Price price={p.price} compare={p.compare_at_price} locale={locale} size="sm" fromLabel={p.has_variants ? t.common.from : undefined} />
          <span className="md:hidden"><CardActions product={p} variant="mobile" /></span>
        </div>
        <div className="hidden grid-rows-[0fr] transition-[grid-template-rows] duration-500 ease-[var(--ease-out-soft)] md:grid md:group-hover:grid-rows-[1fr] md:group-focus-within:grid-rows-[1fr]">
          <div className="overflow-hidden">
            <div className="flex gap-2 pt-2.5">
              <CardActions product={p} variant="desktop" />
              <CardActions product={p} variant="quickview" />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <div className="skeleton aspect-[4/5] rounded-[1.25rem]" />
    </div>
  );
}

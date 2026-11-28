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
      "group relative isolate flex flex-col overflow-hidden rounded-[1.25rem] p-3 transition-shadow duration-300 hover:shadow-[0_18px_40px_-22px_rgb(2_42_82/0.45)] sm:p-3.5",
      size === "lg" ? "aspect-[3/4] lg:aspect-auto lg:h-full" : "aspect-[3/4]",
      dark ? "bg-white" : "product-tile",
      className,
    )}>
      {/* the whole tile opens the product */}
      <Link href={href} prefetch={false} className="absolute inset-0 -z-10" aria-label={name} tabIndex={-1} />

      {/* details on top */}
      <div className="pointer-events-none">
        <div className="min-w-0">
          {p.brand_name && <p className="truncate font-mono text-[0.6rem] uppercase tracking-[0.14em] text-teal-strong">{p.brand_name}</p>}
          <h3 className={cn("mt-0.5 font-sans font-medium leading-snug tracking-[-0.01em] text-navy-deep", size === "lg" ? "text-lg" : "text-[0.8rem] sm:text-[0.88rem]")}>
            <Link href={href} prefetch={false} className="pointer-events-auto line-clamp-2 hover:underline hover:underline-offset-2">{name}</Link>
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <Price price={p.price} compare={p.compare_at_price} locale={locale} size="sm" fromLabel={p.has_variants ? t.common.from : undefined} />
            {pct > 0 && <span className="rounded-full bg-navy px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums text-white">−{pct}%</span>}
          </div>
        </div>
      </div>

      {/* product shot */}
      <div className="pointer-events-none relative mt-1 min-h-0 flex-1">
        {p.image_url ? (
          <>
            <Image
              src={p.image_url}
              alt=""
              fill
              priority={priority}
              sizes="(min-width:1280px) 18vw, (min-width:768px) 26vw, 46vw"
              className={cn(
                "cutout scale-[1.08] object-contain transition-[transform,opacity] duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.14]",
                p.image_url_2 && "md:group-hover:opacity-0",
              )}
            />
            {p.image_url_2 && (
              <Image src={p.image_url_2} alt="" aria-hidden fill loading="lazy"
                sizes="(min-width:1280px) 18vw, (min-width:768px) 26vw, 46vw"
                className="cutout hidden scale-[1.08] object-contain opacity-0 transition-opacity duration-700 md:block md:group-hover:opacity-100" />
            )}
          </>
        ) : (
          <div className="grid h-full place-items-center">
            <Image src="/brand/eds-mark.png" alt="" width={48} height={48} className="opacity-25 grayscale" />
          </div>
        )}
      </div>

      {/* actions */}
      <div className="flex items-end justify-between gap-1.5">
        <span className="pointer-events-auto"><WishlistButton productId={p.id} /></span>
        {!p.in_stock ? (
          <span className="me-auto rounded-full bg-white/95 px-2.5 py-1 text-[0.7rem] font-medium text-muted ring-1 ring-line">{t.common.outOfStock}</span>
        ) : (
          <span className="hidden opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100 md:block">
            <CardActions product={p} variant="quickview" />
          </span>
        )}
        <span className="ms-auto">
          <CardActions product={p} variant="mobile" />
        </span>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <div className="skeleton aspect-[3/4] rounded-[1.25rem]" />
    </div>
  );
}

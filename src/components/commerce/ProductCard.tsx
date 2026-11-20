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
    <article className={cn("group relative flex flex-col", className)}>
      <div className={cn("product-tile relative overflow-hidden rounded-[var(--radius-card)]", size === "lg" ? "aspect-[4/5] lg:aspect-auto lg:flex-1" : "aspect-[4/5]", dark && "!bg-white")}>
        <Link href={href} className="absolute inset-0" aria-label={name} prefetch={false}>
          {p.image_url ? (
            <>
              <Image
                src={p.image_url}
                alt={name}
                fill
                priority={priority}
                sizes="(min-width:1280px) 22vw, (min-width:768px) 30vw, 48vw"
                className={cn(
                  "cutout object-contain p-[10%] transition-[transform,opacity] duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.06]",
                  p.image_url_2 && "md:group-hover:opacity-0",
                )}
              />
              {p.image_url_2 && (
                <Image
                  src={p.image_url_2}
                  alt=""
                  aria-hidden
                  fill
                  loading="lazy"
                  sizes="(min-width:1280px) 22vw, (min-width:768px) 30vw, 48vw"
                  className="cutout hidden object-contain p-[10%] opacity-0 transition-opacity duration-700 md:block md:group-hover:opacity-100"
                />
              )}
            </>
          ) : (
            <div className="grid h-full place-items-center">
              <Image src="/brand/eds-mark.png" alt="" width={56} height={56} className="opacity-25 grayscale" />
            </div>
          )}
        </Link>

        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <div className="flex flex-col items-start gap-1.5">
            {pct > 0 && (
              <span className="rounded-full bg-navy px-2.5 py-1 text-xs font-medium tabular-nums text-white">
                −{pct}%
              </span>
            )}
            {!p.in_stock && (
              <span className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-muted ring-1 ring-line">
                {t.common.outOfStock}
              </span>
            )}
          </div>
          <div className="pointer-events-auto">
            <WishlistButton productId={p.id} />
          </div>
        </div>

        {/* desktop hover actions */}
        <div className="absolute inset-x-3 bottom-3 hidden translate-y-3 gap-2 opacity-0 transition-all duration-300 ease-[var(--ease-out-soft)] group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 md:flex">
          <CardActions product={p} variant="desktop" />
          <CardActions product={p} variant="quickview" />
        </div>
      </div>

      <div className={cn("flex flex-col gap-1 pt-4", size === "lg" ? "" : "flex-1")}>
        {p.brand_name && <p className={cn("font-mono text-[0.65rem] uppercase tracking-[0.14em]", dark ? "text-teal" : "text-teal-strong")}>{p.brand_name}</p>}
        <h3 className={cn("font-sans font-medium leading-snug tracking-[-0.01em]", size === "lg" ? "text-xl" : "text-[0.95rem]", dark ? "text-white" : "text-navy-deep")}>
          <Link href={href} prefetch={false} className={cn("line-clamp-2 bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-[background-size] duration-500 hover:bg-[length:100%_1px]")}>
            {name}
          </Link>
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
          <span className={dark ? "[&_*]:!text-white/90" : ""}>
            <Price price={p.price} compare={p.compare_at_price} locale={locale} size="sm" fromLabel={p.has_variants ? t.common.from : undefined} />
          </span>
          <div className="md:hidden">
            <CardActions product={p} variant="mobile" />
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <div className="skeleton aspect-[4/5] rounded-[var(--radius-card)]" />
      <div className="skeleton h-3 w-1/3" />
      <div className="skeleton h-4 w-4/5" />
      <div className="skeleton h-4 w-1/4" />
    </div>
  );
}

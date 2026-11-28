import { formatPrice, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function Price({
  price, compare, locale, size = "md", fromLabel, className,
}: {
  price: number;
  compare?: number | null;
  locale: Locale;
  size?: "sm" | "md" | "lg";
  fromLabel?: string;
  className?: string;
}) {
  const onSale = compare != null && compare > price;
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      {fromLabel && <span className="text-xs text-muted">{fromLabel}</span>}
      <span
        className={cn(
          "font-display font-semibold tabular-nums text-navy",
          size === "sm" && "text-[0.95rem]",
          size === "md" && "text-lg",
          size === "lg" && "text-2xl tracking-tight",
        )}
      >
        {formatPrice(price, locale)}
      </span>
      {onSale && (
        <s className={cn("tabular-nums text-muted decoration-1", size === "lg" ? "text-base" : "text-sm")}>
          {formatPrice(compare!, locale)}
        </s>
      )}
    </div>
  );
}

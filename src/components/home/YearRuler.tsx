import Link from "next/link";
import type { AcademicYear } from "@/lib/types";
import type { TaxStat } from "@/lib/catalog";
import { fmt, pick, type Dictionary, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Academic-year navigation drawn as an endodontic ruler: one segment per year,
 * millimetre ticks along the bottom edge. The years are a real sequence, so
 * the large numerals carry meaning.
 */
export function YearRuler({ years, stats, t, locale, activeSlug, compact = false }: {
  years: AcademicYear[];
  stats?: Record<string, TaxStat>;
  t: Dictionary;
  locale: Locale;
  activeSlug?: string;
  compact?: boolean;
}) {
  if (!years.length) return null;
  return (
    <nav aria-label={t.nav.years}>
      <ol
        className={cn(
          "scroll-rail -mx-4 auto-cols-[44%] gap-0 px-4 sm:-mx-6 sm:auto-cols-[30%] sm:px-6 lg:mx-0 lg:grid-flow-row lg:px-0",
          years.length >= 5 ? "lg:grid-cols-5" : years.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
        )}
      >
        {years.map((y, i) => {
          const active = activeSlug === y.slug;
          const count = stats?.[y.slug]?.count;
          return (
            <li key={y.id} className="min-w-0">
              <Link
                href={`/students/${y.slug}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group/yr relative flex flex-col justify-between border-y border-e border-navy/15 px-5 pb-7 pt-5 transition-colors duration-300",
                  i === 0 && "border-s rounded-s-[1.5rem]",
                  i === years.length - 1 && "rounded-e-[1.5rem]",
                  compact ? "h-36" : "h-52 lg:h-64",
                  active ? "bg-navy text-white" : "bg-white text-navy hover:bg-navy hover:text-white",
                )}
              >
                <span className="flex items-start justify-between gap-2 text-sm">
                  <span>{pick(locale, y.name_en, y.name_ar)}</span>
                  {count != null && count > 0 && (
                    <span className={cn("tabular-nums", active ? "text-teal" : "text-muted group-hover/yr:text-teal")}>
                      {fmt(t.dentists.specialtyProducts, { n: count })}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "font-display font-extrabold leading-none tracking-[-0.06em] transition-colors",
                    compact ? "text-6xl" : "text-[6.5rem] lg:text-[8.5rem]",
                    active ? "text-teal" : "text-navy group-hover/yr:text-teal",
                  )}
                >
                  {y.number}
                </span>
                {!compact && (
                  <span className={cn("line-clamp-2 min-h-[2.5em] text-sm", active ? "text-white/70" : "text-muted group-hover/yr:text-white/70")}>
                    {pick(locale, y.tagline_en, y.tagline_ar)}
                  </span>
                )}
                <span aria-hidden className={cn("ruler-ticks absolute inset-x-0 bottom-0 h-4 opacity-30", active ? "text-teal" : "text-navy group-hover/yr:text-teal")} />
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

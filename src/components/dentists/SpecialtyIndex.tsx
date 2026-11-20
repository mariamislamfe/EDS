import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Taxon } from "@/lib/types";
import type { TaxStat } from "@/lib/catalog";
import { fmt, pick, type Dictionary, type Locale } from "@/lib/i18n";

/** Editorial index: one row per specialty; product thumbnails slide in on hover. */
export function SpecialtyIndex({ specialties, stats, t, locale }: {
  specialties: Taxon[]; stats: Record<string, TaxStat>; t: Dictionary; locale: Locale;
}) {
  return (
    <ul className="border-t border-line">
      {specialties.map((s) => {
        const st = stats[s.slug];
        const covers = s.image_url ? [s.image_url] : st?.covers ?? [];
        return (
          <li key={s.id} className="border-b border-line">
            <Link href={`/dentists/${s.slug}`} className="group grid items-center gap-x-8 gap-y-2 py-6 sm:grid-cols-[1.1fr_1.4fr_auto] lg:py-7">
              <span className="font-display text-[clamp(1.5rem,3vw,2.3rem)] font-semibold leading-none tracking-[-0.02em] text-navy transition-transform duration-500 group-hover:translate-x-2 rtl:group-hover:-translate-x-2">
                {pick(locale, s.name_en, s.name_ar)}
              </span>
              <span className="text-muted">
                {pick(locale, s.description_en, s.description_ar)}
                {st && st.count > 0 && <span className="ms-2 whitespace-nowrap text-sm text-teal-strong">{fmt(t.dentists.specialtyProducts, { n: st.count })}</span>}
              </span>
              <span className="hidden items-center gap-2 sm:flex">
                {covers.slice(0, 3).map((src, i) => (
                  <span key={src} className="product-tile relative size-14 overflow-hidden rounded-xl opacity-0 transition-all duration-500 group-hover:opacity-100"
                    style={{ transitionDelay: `${i * 60}ms` }}>
                    <Image src={src} alt="" fill sizes="56px" className="object-contain p-1.5" />
                  </span>
                ))}
                <span className="grid size-11 place-items-center rounded-full border border-line text-navy transition-colors group-hover:border-navy group-hover:bg-navy group-hover:text-white">
                  <ArrowUpRight className="size-4 rtl:-scale-x-100" />
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

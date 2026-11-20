"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { useI18n } from "@/lib/i18n/client";

const SORTS = ["featured", "newest", "best", "price_asc", "price_desc"] as const;

export function SortSelect() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, start] = useTransition();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden text-muted sm:inline">{t.common.sort}</span>
      <select
        className="field !min-h-9 !w-auto !py-1.5 pe-8 text-sm"
        value={params.get("sort") ?? "featured"}
        onChange={(e) => {
          const p = new URLSearchParams(params.toString());
          if (e.target.value === "featured") p.delete("sort"); else p.set("sort", e.target.value);
          p.delete("page");
          start(() => router.push(`${pathname}${p.toString() ? `?${p}` : ""}`, { scroll: false }));
        }}
        aria-label={t.common.sort}
      >
        {SORTS.map((s) => <option key={s} value={s}>{t.sort[s]}</option>)}
      </select>
    </label>
  );
}

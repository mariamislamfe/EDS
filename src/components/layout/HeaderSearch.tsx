"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatPrice, pick } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { useSuggest } from "./useSuggest";

/**
 * The header search box itself: results drop down under it while typing
 * (no Enter, no separate page). Enter still opens the full results page.
 */
export function HeaderSearch({ className }: { className?: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const { items, loading, ready } = useSuggest(q);
  const open = focused && ready;

  // close when clicking anywhere else
  useEffect(() => {
    if (!focused) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setFocused(false); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [focused]);

  const reset = () => { setQ(""); setActive(-1); setFocused(false); input.current?.blur(); };
  const go = (href: string) => { reset(); router.push(href); };

  return (
    <div ref={box} className={`hdr-search relative ${className ?? ""}`}>
      <form role="search" onSubmit={(e) => {
        e.preventDefault();
        if (active >= 0 && items[active]) return go(`/products/${encodeURIComponent(items[active].slug)}`);
        if (q.trim()) go(`/shop?q=${encodeURIComponent(q.trim())}`);
      }}>
        <label className="flex h-10 items-center gap-2 rounded-full border border-line bg-white/70 px-4 text-sm transition-colors focus-within:border-navy hover:border-navy">
          <Search className="size-4 shrink-0 text-muted" />
          <input
            ref={input}
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(-1); setFocused(true); }}
            onFocus={() => setFocused(true)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
              if (e.key === "Escape") reset();
            }}
            placeholder={t.nav.searchPlaceholder}
            aria-label={t.nav.search}
            role="combobox"
            aria-expanded={open}
            aria-controls="hdr-search-results"
            aria-activedescendant={active >= 0 ? `hs-${active}` : undefined}
            autoComplete="off"
            enterKeyHint="search"
            className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-muted"
          />
          {q && (
            <button type="button" onClick={() => { setQ(""); input.current?.focus(); }} className="-me-2 grid size-7 shrink-0 place-items-center rounded-full text-muted hover:bg-cloud" aria-label={t.nav.close}>
              <X className="size-3.5" />
            </button>
          )}
        </label>
      </form>

      {open && (
        <div data-enter className="absolute end-0 top-[calc(100%+0.5rem)] z-50 w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_30px_60px_-20px_rgb(2_42_82/0.35)]">
          <div className="max-h-[min(70dvh,30rem)] overflow-y-auto p-2" aria-live="polite">
            {loading && items.length === 0 && (
              <div className="flex flex-col gap-2 p-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-14" />)}</div>
            )}
            {!loading && items.length === 0 && <p className="p-5 text-center text-sm text-muted">{t.search.none}</p>}
            {items.length > 0 && (
              <ul id="hdr-search-results" role="listbox" className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
                {items.map((p, i) => (
                  <li key={p.id} id={`hs-${i}`} role="option" aria-selected={i === active}>
                    <Link href={`/products/${encodeURIComponent(p.slug)}`} prefetch={false} onClick={reset}
                      className={`flex items-center gap-3 rounded-xl p-2 ${i === active ? "bg-mist" : "hover:bg-cloud"}`}>
                      <span className="product-tile relative size-12 shrink-0 overflow-hidden rounded-lg">
                        {p.image_url && <Image src={p.image_url} alt="" fill sizes="48px" className="object-contain p-1" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-1 text-sm text-ink">{pick(locale, p.name_en, p.name_ar)}</span>
                        {p.brand_name && <span className="text-xs text-muted">{p.brand_name}</span>}
                      </span>
                      <span className="shrink-0 text-sm font-medium tabular-nums text-navy" dir="ltr">{formatPrice(p.price, locale)}</span>
                    </Link>
                  </li>
                ))}
                <li>
                  <button type="button" onClick={() => go(`/shop?q=${encodeURIComponent(q.trim())}`)} className="w-full rounded-xl p-2.5 text-start text-sm font-medium text-teal-strong hover:bg-cloud">
                    {t.search.seeAll}
                  </button>
                </li>
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

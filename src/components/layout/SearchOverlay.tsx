"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { suggest } from "@/app/actions";
import type { CatalogProduct } from "@/lib/types";
import { formatPrice, pick } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) { setItems([]); setLoading(false); return; }
    const id = ++seq.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const r = await suggest(query);
        if (id === seq.current) { setItems(r); setActive(-1); }
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [q]);

  const go = (href: string) => { onClose(); router.push(href); };
  const submit = () => {
    if (active >= 0 && items[active]) return go(`/products/${encodeURIComponent(items[active].slug)}`);
    if (q.trim()) go(`/shop?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[65]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-navy-deep/40" onClick={onClose} aria-hidden />
          <motion.div
            role="dialog" aria-modal="true" aria-label={t.search.title}
            initial={{ y: -16 }} animate={{ y: 0 }} exit={{ y: -16 }}
            className="relative mx-auto max-h-[85dvh] w-full max-w-2xl overflow-hidden bg-white shadow-2xl sm:mt-16 sm:rounded-3xl"
          >
            <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex items-center gap-3 border-b border-line px-5">
              <Search className="size-5 shrink-0 text-muted" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
                }}
                placeholder={t.nav.searchPlaceholder}
                className="h-16 flex-1 bg-transparent text-lg outline-none placeholder:text-muted"
                role="combobox"
                aria-expanded={items.length > 0}
                aria-controls="search-results"
                aria-activedescendant={active >= 0 ? `sr-${active}` : undefined}
                enterKeyHint="search"
              />
              <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full hover:bg-cloud" aria-label={t.nav.close}>
                <X className="size-5" />
              </button>
            </form>
            <div className="max-h-[60dvh] overflow-y-auto p-2" aria-live="polite">
              {loading && items.length === 0 && (
                <div className="flex flex-col gap-2 p-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-14" />)}</div>
              )}
              {!loading && q.trim().length >= 2 && items.length === 0 && <p className="p-6 text-center text-muted">{t.search.none}</p>}
              {items.length > 0 && (
                <ul id="search-results" role="listbox">
                  {items.map((p, i) => (
                    <li key={p.id} id={`sr-${i}`} role="option" aria-selected={i === active}>
                      <Link
                        href={`/products/${encodeURIComponent(p.slug)}`}
                        onClick={onClose}
                        className={`flex items-center gap-4 rounded-2xl p-2.5 ${i === active ? "bg-mist" : "hover:bg-cloud"}`}
                      >
                        <span className="product-tile relative size-14 shrink-0 overflow-hidden rounded-xl">
                          {p.image_url && <Image src={p.image_url} alt="" fill sizes="56px" className="object-contain p-1.5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-1 text-ink">{pick(locale, p.name_en, p.name_ar)}</span>
                          {p.brand_name && <span className="text-xs text-muted">{p.brand_name}</span>}
                        </span>
                        <span className="text-sm font-medium tabular-nums text-navy">{formatPrice(p.price, locale)}</span>
                      </Link>
                    </li>
                  ))}
                  <li>
                    <button type="button" onClick={() => go(`/shop?q=${encodeURIComponent(q.trim())}`)} className="w-full rounded-2xl p-3 text-start text-sm font-medium text-teal-strong hover:bg-cloud">
                      {t.search.seeAll}
                    </button>
                  </li>
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

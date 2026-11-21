"use client";
import Link from "next/link";
import { Heart, Search, ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { useCart, useWishlist } from "@/lib/store";
import { openCart } from "@/components/commerce/CartDrawer";
import { SearchOverlay } from "./SearchOverlay";

export function HeaderActions() {
  const { t } = useI18n();
  const lines = useCart();
  const saved = useWishlist();
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const [searchOpen, setSearchOpen] = useState(false);
  const bag = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const onAdd = () => {
      const el = bag.current;
      if (!el) return;
      el.classList.remove("bag-bump");
      void el.offsetWidth; // restart the animation
      el.classList.add("bag-bump");
    };
    window.addEventListener("eds:cart-added", onAdd);
    return () => window.removeEventListener("eds:cart-added", onAdd);
  }, []);

  const iconBtn = "relative grid size-10 place-items-center rounded-full text-navy transition-colors hover:bg-cloud";
  return (
    <div className="ms-auto flex items-center gap-0.5 sm:gap-1">
      <button type="button" onClick={() => setSearchOpen(true)} className="hidden h-10 w-52 items-center gap-2 rounded-full border border-line bg-white/70 px-4 text-sm text-muted transition-colors hover:border-navy md:flex xl:w-64" data-cursor="link" aria-label={t.nav.search}>
        <Search className="size-4" />
        <span className="truncate">{t.nav.searchPlaceholder}</span>
      </button>
      <button type="button" onClick={() => setSearchOpen(true)} className={`${iconBtn} md:hidden`} aria-label={t.nav.search}>
        <Search className="size-5" />
      </button>

      <Link href="/wishlist" className={`${iconBtn} hidden sm:grid`} aria-label={t.nav.wishlist} title={t.nav.wishlist}>
        <Heart className="size-5" />
        {saved.length > 0 && <span className="absolute end-1.5 top-1.5 size-2 rounded-full bg-teal" />}
      </Link>
      <button ref={bag} type="button" onClick={openCart} className={iconBtn} aria-label={`${t.nav.cart} (${count})`}>
        <ShoppingBag className="size-5" />
        {count > 0 && (
          <span key={count} className="absolute -end-0.5 -top-0.5 grid min-w-5 animate-[rise_.4s_var(--ease-out-soft)] place-items-center rounded-full bg-navy px-1 text-[0.7rem] font-semibold tabular-nums text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

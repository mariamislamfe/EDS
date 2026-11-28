"use client";
import Link from "next/link";
import { Heart, Search, ShoppingBag, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { useCart, useWishlist } from "@/lib/store";
import { openCart } from "@/components/commerce/CartDrawer";
import { SearchOverlay } from "./SearchOverlay";
import { HeaderSearch } from "./HeaderSearch";

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
    <div className="hdr-cap ms-auto flex items-center gap-0.5 rounded-full sm:gap-1">
      <HeaderSearch className="hidden w-52 md:block lg:hidden xl:block xl:w-64" />
      <button type="button" onClick={() => setSearchOpen(true)} className={`${iconBtn} md:hidden lg:grid xl:hidden`} aria-label={t.nav.search} aria-expanded={searchOpen}>
        <Search className="size-5" />
      </button>

      <Link href="/wishlist" className={`${iconBtn} hidden sm:grid`} aria-label={t.nav.wishlist} title={t.nav.wishlist}>
        <Heart className="size-5" />
        {saved.length > 0 && <span className="absolute end-1.5 top-1.5 size-2 rounded-full bg-teal" />}
      </Link>
      <Link href="/account" className={iconBtn} aria-label="My account" title="My account">
        <UserRound className="size-5" />
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

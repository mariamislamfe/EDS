"use client";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { productsByIds } from "@/app/actions";
import type { CatalogProduct } from "@/lib/types";
import { useI18n } from "@/lib/i18n/client";
import { useWishlist } from "@/lib/store";
import { ProductGrid } from "@/components/commerce/ProductCollections";
import { ProductCardSkeleton } from "@/components/commerce/ProductCard";

export function WishlistView() {
  const { t, locale } = useI18n();
  const ids = useWishlist();
  const key = ids.join(",");
  const [items, setItems] = useState<CatalogProduct[] | null>(null);

  useEffect(() => {
    if (!key) { setItems([]); return; }
    let alive = true;
    productsByIds(key.split(",")).then((r) => alive && setItems(r)).catch(() => alive && setItems([]));
    return () => { alive = false; };
  }, [key]);

  if (items === null) {
    return <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <ProductCardSkeleton key={i} />)}</div>;
  }
  const visible = items.filter((p) => ids.includes(p.id));
  if (!visible.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[2rem] border border-dashed border-line px-6 py-20 text-center">
        <Heart className="size-10 text-teal" strokeWidth={1.4} />
        <p className="font-display text-xl font-semibold text-navy">{t.wishlist.empty}</p>
        <p className="text-muted">{t.wishlist.emptyHint}</p>
        <Link href="/shop" className="btn btn-primary mt-3">{t.nav.shop}</Link>
      </div>
    );
  }
  return <ProductGrid products={visible} locale={locale} t={t} />;
}

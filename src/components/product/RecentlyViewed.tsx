"use client";
import { useEffect, useState } from "react";
import { productsByIds } from "@/app/actions";
import type { CatalogProduct } from "@/lib/types";
import { useI18n } from "@/lib/i18n/client";
import { useRecentlyViewed } from "@/lib/store";
import { ProductCard } from "@/components/commerce/ProductCard";
import { Rail } from "@/components/ui/Rail";
import { SectionHead } from "@/components/ui/Section";

export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const { t, locale } = useI18n();
  const ids = useRecentlyViewed().filter((id) => id !== excludeId).slice(0, 10);
  const key = ids.join(",");
  const [items, setItems] = useState<CatalogProduct[]>([]);
  useEffect(() => {
    if (!key) { setItems([]); return; }
    let alive = true;
    productsByIds(key.split(",")).then((r) => alive && setItems(r)).catch(() => {});
    return () => { alive = false; };
  }, [key]);
  if (!items.length) return null;
  return (
    <section className="container-x py-14">
      <SectionHead title={t.product.recentlyViewed} className="lg:pe-28" />
      <Rail label={t.product.recentlyViewed}>
        {items.map((p) => <ProductCard key={p.id} product={p} locale={locale} t={t} />)}
      </Rail>
    </section>
  );
}

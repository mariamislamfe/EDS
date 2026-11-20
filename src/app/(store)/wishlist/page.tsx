import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { WishlistView } from "@/components/product/WishlistView";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.wishlist.title, robots: { index: false } };
}

export default async function WishlistPage() {
  const { t } = await getI18n();
  return (
    <div className="container-x pb-10 pt-10">
      <h1 className="mb-10 text-[clamp(2rem,4.5vw,3.2rem)] font-bold leading-none tracking-[-0.03em] rtl:leading-tight rtl:tracking-normal">{t.wishlist.title}</h1>
      <WishlistView />
    </div>
  );
}

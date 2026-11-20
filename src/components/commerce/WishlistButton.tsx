"use client";
import { Heart } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { useWishlist, wishlist } from "@/lib/store";
import { cn } from "@/lib/utils";

export function WishlistButton({ productId, className, withLabel = false }: { productId: string; className?: string; withLabel?: boolean }) {
  const { t } = useI18n();
  const ids = useWishlist();
  const saved = ids.includes(productId);
  const label = saved ? t.common.wishlistRemove : t.common.wishlistAdd;
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); wishlist.toggle(productId); }}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center gap-2 transition-transform active:scale-90",
        withLabel ? "btn btn-ghost" : "size-10 rounded-full bg-white/90 text-navy shadow-sm backdrop-blur hover:bg-white",
        className,
      )}
    >
      <Heart className={cn("size-[18px] transition-colors", saved && "fill-navy")} strokeWidth={1.8} />
      {withLabel && <span>{label}</span>}
    </button>
  );
}

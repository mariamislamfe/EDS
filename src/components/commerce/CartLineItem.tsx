"use client";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import type { QuoteLine } from "@/app/actions";
import { fmt, formatPrice, pick } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { cart, type CartLine } from "@/lib/store";
import { cn } from "@/lib/utils";

export function CartLineItem({ line, quoted, onNavigate }: { line: CartLine; quoted?: QuoteLine; onNavigate?: () => void }) {
  const { t, locale } = useI18n();
  const s = line.snapshot;
  const name = pick(locale, quoted?.name_en ?? s.name_en, quoted?.name_ar ?? s.name_ar);
  const href = line.type === "bundle" ? `/bundles/${encodeURIComponent(s.slug)}` : `/products/${encodeURIComponent(s.slug)}`;
  const unit = quoted?.unit_price ?? s.price;
  const err = quoted && !quoted.ok ? quoted.error : null;
  const errText = err
    ? fmt((t.cart as Record<string, string>)[`lineError_${err}`] ?? t.common.unavailable, { n: quoted?.available ?? 0 })
    : null;

  return (
    <li className="flex gap-3.5 py-4">
      <Link href={href} onClick={onNavigate} className="product-tile relative size-20 shrink-0 overflow-hidden rounded-xl">
        {s.image && <Image src={s.image} alt="" fill sizes="80px" className="object-contain p-2" />}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link href={href} onClick={onNavigate} className="line-clamp-2 text-sm leading-snug text-ink hover:text-navy">{name}</Link>
        {(quoted?.variant_label ?? s.variantLabel) && <p className="text-xs text-muted">{quoted?.variant_label ?? s.variantLabel}</p>}
        {errText && <p className="text-xs text-danger">{errText}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <div className="flex h-9 items-center rounded-full border border-line">
            <button type="button" className="grid size-9 place-items-center text-navy" onClick={() => cart.setQty(line.key, line.qty - 1)} aria-label={t.common.decrease}>
              <Minus className="size-3.5" />
            </button>
            <span className="w-7 text-center text-sm tabular-nums" aria-label={t.common.quantity}>{line.qty}</span>
            <button type="button" className="grid size-9 place-items-center text-navy" onClick={() => cart.setQty(line.key, line.qty + 1)} aria-label={t.common.increase}>
              <Plus className="size-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <span className={cn("text-sm font-medium tabular-nums text-navy", err && "text-muted line-through")}>
              {formatPrice(unit * line.qty, locale)}
            </span>
            <button type="button" onClick={() => cart.remove(line.key)} className="grid size-9 place-items-center rounded-full text-muted hover:text-danger" aria-label={t.common.remove}>
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

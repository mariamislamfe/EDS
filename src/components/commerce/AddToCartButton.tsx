"use client";
import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { cart, type CartLine } from "@/lib/store";
import { cn } from "@/lib/utils";

type Props = {
  line: Omit<CartLine, "key" | "qty">;
  qty?: number;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
  label?: string;
};

export function AddToCartButton({ line, qty = 1, disabled, compact, className, label }: Props) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        cart.add(line, qty);
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
      className={cn(compact ? "btn btn-primary btn-sm" : "btn btn-primary", className)}
      aria-live="polite"
    >
      {done ? <Check className="size-4" /> : <Plus className="size-4" />}
      <span>{done ? t.common.added : label ?? t.common.addToCart}</span>
    </button>
  );
}

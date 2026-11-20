import Image from "next/image";
import type { OrderStatus } from "@/lib/types";
import { formatDate, formatPrice, type Dictionary, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface OrderData {
  order: {
    order_number: string; status: OrderStatus; payment_method: string; payment_status: string;
    customer_name: string; phone: string; email: string | null; governorate_name: string; city: string; address: string;
    notes: string | null; subtotal: number; discount_total: number; shipping_total: number; shipping_pending: boolean;
    total: number; coupon_code: string | null; created_at: string;
  };
  items: { id: string; name: string; variant_label: string | null; image_url: string | null; unit_price: number; quantity: number; line_total: number }[];
  history: { status: OrderStatus; created_at: string }[];
}

const FLOW: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered"];

export function OrderDetail({ data, t, locale, paymentLabel }: { data: OrderData; t: Dictionary; locale: Locale; paymentLabel: string }) {
  const { order: o, items } = data;
  const stepIndex = FLOW.indexOf(o.status);
  const ended = o.status === "cancelled" || o.status === "refunded";
  return (
    <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
      <div className="flex flex-col gap-8">
        <section aria-label={t.order.status}>
          {ended ? (
            <p className="rounded-2xl bg-danger/10 p-4 font-medium text-danger">{t.order.statuses[o.status]}</p>
          ) : (
            <ol className="grid grid-cols-5 gap-1.5">
              {FLOW.map((s, i) => (
                <li key={s} className="flex flex-col gap-2">
                  <span className={cn("h-1.5 rounded-full", i <= stepIndex ? "bg-navy" : "bg-line")} />
                  <span className={cn("text-xs", i === stepIndex ? "font-medium text-navy" : "text-muted")}>{t.order.statuses[s]}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold">{t.order.items}</h2>
          <ul className="divide-y divide-line border-y border-line">
            {items.map((i) => (
              <li key={i.id} className="flex items-center gap-4 py-3">
                <span className="product-tile relative size-14 shrink-0 overflow-hidden rounded-xl">
                  {i.image_url && <Image src={i.image_url} alt="" fill sizes="56px" className="object-contain p-1.5" />}
                </span>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="line-clamp-2">{i.name}</span>
                  {i.variant_label && <span className="text-xs text-muted">{i.variant_label}</span>}
                  <span className="block text-xs text-muted tabular-nums">{i.quantity} × {formatPrice(i.unit_price, locale)}</span>
                </span>
                <span className="text-sm tabular-nums">{formatPrice(i.line_total, locale)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <aside className="flex h-fit flex-col gap-6 rounded-[1.75rem] bg-cloud p-6">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <dt className="text-muted">{t.order.number}</dt><dd className="font-medium text-navy" dir="ltr">{o.order_number}</dd>
          <dt className="text-muted">{t.order.placed}</dt><dd>{formatDate(o.created_at, locale, true)}</dd>
          <dt className="text-muted">{t.order.paymentMethod}</dt><dd>{paymentLabel}</dd>
        </dl>
        <div className="text-sm">
          <p className="mb-1 text-muted">{t.order.deliverTo}</p>
          <p className="font-medium">{o.customer_name}</p>
          <p dir="ltr" className="text-start rtl:text-end">{o.phone}</p>
          <p>{o.address}</p>
          <p>{o.city}، {o.governorate_name}</p>
        </div>
        <dl className="flex flex-col gap-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-muted">{t.cart.subtotal}</dt><dd className="tabular-nums">{formatPrice(o.subtotal, locale)}</dd></div>
          {Number(o.discount_total) > 0 && <div className="flex justify-between text-success"><dt>{t.cart.discount}{o.coupon_code && ` (${o.coupon_code})`}</dt><dd className="tabular-nums">−{formatPrice(o.discount_total, locale)}</dd></div>}
          <div className="flex justify-between"><dt className="text-muted">{t.cart.shipping}</dt><dd className="tabular-nums">{o.shipping_pending ? t.cart.shippingPending : formatPrice(o.shipping_total, locale)}</dd></div>
          <div className="mt-1 flex justify-between border-t border-line pt-3 text-base"><dt className="font-medium text-navy">{t.cart.total}</dt><dd className="font-display font-semibold tabular-nums text-navy">{formatPrice(o.total, locale)}</dd></div>
        </dl>
      </aside>
    </div>
  );
}

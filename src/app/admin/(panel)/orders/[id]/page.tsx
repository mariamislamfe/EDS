import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaffPage } from "@/lib/admin/auth";
import { one, q } from "@/lib/db";
import { formatPrice } from "@/lib/i18n";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { OrderControls } from "@/components/admin/OrderControls";
import { statusTone } from "@/components/admin/status";

export const metadata = { title: "Order" };

export default async function OrderAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  await requireStaffPage();
  type Order = { id: string; order_number: string; status: string; payment_status: string; payment_method: string; created_at: Date; subtotal: number;
    discount_total: number; shipping_total: number; shipping_pending: boolean; total: number; coupon_code: string | null; phone: string; email: string | null;
    customer_name: string; address: string; city: string; governorate_name: string; notes: string | null; user_id: string | null };
  type Item = { id: string; name: string; image_url: string | null; product_id: string | null; bundle_id: string | null; variant_label: string | null;
    sku: string | null; quantity: number; unit_price: number; line_total: number };
  const [o, items, history] = await Promise.all([
    one<Order>(`select * from orders where id = $1`, [id]),
    q<Item>(`select * from order_items where order_id = $1 order by name`, [id]),
    q<{ status: string; note: string | null; created_at: Date }>(`select status, note, created_at from order_status_history where order_id = $1 order by created_at desc`, [id]),
  ]);
  if (!o) notFound();
  const egp = (n: number) => formatPrice(Number(n), "en");
  const waNumber = o.phone.replace(/\D/g, "").replace(/^0/, "20");

  return (
    <>
      <Link href="/admin/orders" className="text-sm text-muted hover:text-navy">← Orders</Link>
      <PageHeader title={o.order_number} text={`Placed ${new Date(o.created_at).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })}`}
        actions={<><Badge tone={statusTone(o.status)}>{o.status}</Badge><Badge tone={statusTone(o.payment_status)}>{o.payment_status.replace("_", " ")}</Badge></>} />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card title="Items">
            <ul className="divide-y divide-line">
              {(items ?? []).map((i) => (
                <li key={i.id} className="flex items-center gap-4 py-3 text-sm">
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-cloud">{i.image_url && <Image src={i.image_url} alt="" fill sizes="48px" className="object-contain p-1" />}</span>
                  <span className="min-w-0 flex-1">
                    {i.product_id ? <Link href={`/admin/products/${i.product_id}`} className="font-medium hover:text-navy">{i.name}</Link>
                      : i.bundle_id ? <Link href={`/admin/bundles/${i.bundle_id}`} className="font-medium hover:text-navy">{i.name} <Badge tone="info">Bundle</Badge></Link> : <span className="font-medium">{i.name}</span>}
                    {i.variant_label && <span className="block text-xs text-muted">{i.variant_label}</span>}
                    {i.sku && <span className="block text-xs text-muted">SKU {i.sku}</span>}
                  </span>
                  <span className="tabular-nums text-muted">{i.quantity} × {egp(i.unit_price)}</span>
                  <span className="w-28 text-right font-medium tabular-nums">{egp(i.line_total)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 grid grid-cols-2 gap-y-1.5 border-t border-line pt-4 text-sm">
              <dt className="text-muted">Subtotal</dt><dd className="text-right tabular-nums">{egp(o.subtotal)}</dd>
              {Number(o.discount_total) > 0 && <><dt className="text-muted">Discount {o.coupon_code && `(${o.coupon_code})`}</dt><dd className="text-right tabular-nums text-success">−{egp(o.discount_total)}</dd></>}
              <dt className="text-muted">Shipping</dt><dd className="text-right tabular-nums">{o.shipping_pending ? <Badge tone="warn">Confirm by phone</Badge> : egp(o.shipping_total)}</dd>
              <dt className="font-medium">Total</dt><dd className="text-right text-base font-semibold tabular-nums text-navy">{egp(o.total)}</dd>
            </dl>
          </Card>
          <Card title="History">
            <ol className="flex flex-col gap-3 text-sm">
              {(history ?? []).map((h, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-teal" />
                  <span><span className="font-medium capitalize">{h.status}</span> <span className="text-muted">· {new Date(h.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
                    {h.note && <span className="block text-muted">{h.note}</span>}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
        <div className="flex flex-col gap-6">
          <OrderControls orderId={o.id} status={o.status} paymentStatus={o.payment_status} />
          <Card title="Customer">
            <div className="flex flex-col gap-1 text-sm">
              <p className="font-medium">{o.customer_name}</p>
              <p><a className="text-teal-strong hover:underline" href={`tel:${o.phone}`}>{o.phone}</a> · <a className="text-teal-strong hover:underline" href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></p>
              {o.email && <p><a className="text-teal-strong hover:underline" href={`mailto:${o.email}`}>{o.email}</a></p>}
              <p className="mt-3 text-muted">Delivery address</p>
              <p dir="auto">{o.address}</p>
              <p dir="auto">{o.city}, {o.governorate_name}</p>
              {o.notes && <><p className="mt-3 text-muted">Notes</p><p dir="auto" className="whitespace-pre-line">{o.notes}</p></>}
              <p className="mt-3 text-muted">Payment method</p>
              <p>{o.payment_method}</p>
              {o.user_id ? <p className="mt-3 text-xs text-muted">Placed by a signed-in customer</p> : <p className="mt-3 text-xs text-muted">Guest checkout</p>}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

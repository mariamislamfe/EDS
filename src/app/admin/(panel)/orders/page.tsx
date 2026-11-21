import Link from "next/link";
import { requireStaffPage } from "@/lib/admin/auth";
import { q } from "@/lib/db";
import { formatPrice } from "@/lib/i18n";
import { Badge, PageHeader } from "@/components/admin/ui";
import { ORDER_STATUSES, statusTone } from "@/components/admin/status";

export const metadata = { title: "Orders" };
const PER = 40;

export default async function OrdersAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  await requireStaffPage();
  const page = Math.max(1, Number(sp.page) || 1);
  const status = ORDER_STATUSES.includes(sp.status as never) ? sp.status! : null;
  const term = sp.q?.trim() || null;
  const data = await q<{ id: string; order_number: string; customer_name: string; phone: string; governorate_name: string; status: string;
    payment_method: string; payment_status: string; total: number; created_at: Date; full_count: number }>(
    `select id, order_number, customer_name, phone, governorate_name, status, payment_method, payment_status, total, created_at,
            count(*) over() as full_count
       from orders
      where ($1::text is null or status::text = $1)
        and ($2::text is null or order_number ilike '%' || $2 || '%' or phone ilike '%' || $2 || '%' or customer_name ilike '%' || $2 || '%')
      order by created_at desc offset $3 limit $4`, [status, term, (page - 1) * PER, PER]);
  const count = data[0]?.full_count ?? 0;
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER));
  const link = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    Object.entries(patch).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    return `/admin/orders?${p}`;
  };

  return (
    <>
      <PageHeader title="Orders" text="Confirm new orders by phone, then move them through preparing, shipping and delivery." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form className="min-w-60 flex-1" action="/admin/orders">
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          <input className="field" name="q" defaultValue={sp.q} placeholder="Search order number, phone or name" />
        </form>
        <nav className="flex flex-wrap gap-1" aria-label="Filter by status">
          <Link href={link({ status: null, page: null })} className={`h-9 rounded-full px-3 text-sm leading-9 ${!sp.status ? "bg-navy text-white" : "bg-white text-ink"}`}>All</Link>
          {ORDER_STATUSES.map((s) => (
            <Link key={s} href={link({ status: s, page: null })} className={`h-9 rounded-full px-3 text-sm capitalize leading-9 ${sp.status === s ? "bg-navy text-white" : "bg-white text-ink"}`}>{s}</Link>
          ))}
        </nav>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-cloud/60 text-left text-xs text-muted"><tr>
            <th className="px-4 py-3 font-medium">Order</th><th className="font-medium">Customer</th><th className="font-medium">Governorate</th><th className="font-medium">Status</th><th className="font-medium">Payment</th><th className="font-medium">Date</th><th className="pe-4 text-right font-medium">Total</th>
          </tr></thead>
          <tbody className="divide-y divide-line">
            {(data ?? []).map((o) => (
              <tr key={o.id} className="hover:bg-cloud/50">
                <td className="px-4 py-3"><Link href={`/admin/orders/${o.id}`} className="font-medium text-navy hover:underline">{o.order_number}</Link></td>
                <td>{o.customer_name}<span className="block text-xs text-muted">{o.phone}</span></td>
                <td>{o.governorate_name}</td>
                <td><Badge tone={statusTone(o.status)}>{o.status}</Badge></td>
                <td><span className="text-xs">{o.payment_method}</span> <Badge tone={statusTone(o.payment_status)}>{o.payment_status.replace("_", " ")}</Badge></td>
                <td className="text-muted">{new Date(o.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</td>
                <td className="pe-4 text-right tabular-nums">{formatPrice(o.total, "en")}</td>
              </tr>
            ))}
            {!data?.length && <tr><td colSpan={7} className="py-12 text-center text-muted">No orders found.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-muted">
        <span>{count ?? 0} orders</span>
        {pages > 1 && <div className="flex items-center gap-2">
          {page > 1 && <Link className="btn btn-ghost btn-sm" href={link({ page: String(page - 1) })}>Previous</Link>}
          <span>{page} / {pages}</span>
          {page < pages && <Link className="btn btn-ghost btn-sm" href={link({ page: String(page + 1) })}>Next</Link>}
        </div>}
      </div>
    </>
  );
}

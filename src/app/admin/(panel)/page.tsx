import Link from "next/link";
import { requireStaffPage } from "@/lib/admin/auth";
import { one, q } from "@/lib/db";
import { formatPrice } from "@/lib/i18n";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { SalesChart } from "@/components/admin/SalesChart";
import { statusTone } from "@/components/admin/status";

export const metadata = { title: "Overview" };

type Overview = {
  orders_total: number; orders_pending: number; revenue_total: number; revenue_30d: number;
  products_total: number; products_published: number; products_unassigned: number; low_stock: number;
  sales_by_day: { day: string; total: number; orders: number }[];
};

export default async function AdminOverview() {
  await requireStaffPage();
  const [ov, recent, lowList] = await Promise.all([
    one<{ o: Overview }>(`select public.admin_overview() as o`),
    q<{ id: string; order_number: string; customer_name: string; status: string; total: number; created_at: Date }>(
      `select id, order_number, customer_name, status, total, created_at from orders order by created_at desc limit 8`),
    q<{ id: string; name_en: string | null; name_ar: string | null; stock_qty: number }>(
      `select id, name_en, name_ar, stock_qty from products where is_low_stock order by stock_qty limit 8`),
  ]);
  const o = (ov?.o ?? {}) as Overview;
  const egp = (n: number) => formatPrice(Number(n ?? 0), "en");

  const kpis = [
    { label: "Revenue (30 days)", value: egp(o.revenue_30d), sub: `${egp(o.revenue_total)} all time`, href: "/admin/orders" },
    { label: "Orders", value: String(o.orders_total ?? 0), sub: `${o.orders_pending ?? 0} awaiting confirmation`, href: "/admin/orders?status=pending" },
    { label: "Products", value: String(o.products_total ?? 0), sub: `${o.products_published ?? 0} published`, href: "/admin/products" },
    { label: "Low stock", value: String(o.low_stock ?? 0), sub: "at or below threshold", href: "/admin/products?stock=low" },
  ];

  return (
    <>
      <PageHeader title="Overview" actions={<Link href="/admin/products/new" className="btn btn-primary btn-sm">Add product</Link>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="rounded-2xl border border-line bg-white p-5 transition-colors hover:border-navy">
            <p className="text-sm text-muted">{k.label}</p>
            <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-navy">{k.value}</p>
            <p className="mt-1 text-xs text-muted">{k.sub}</p>
          </Link>
        ))}
      </div>

      {(o.products_unassigned ?? 0) > 0 && (
        <Link href="/admin/products?audience=unassigned" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warn/30 bg-warn/5 p-5 hover:border-warn">
          <span>
            <span className="font-medium text-warn">{o.products_unassigned} products need classification</span>
            <span className="block text-sm text-muted">Their audience isn&apos;t set, so they don&apos;t appear on the Students or Dentists pages yet (they are still in Shop all).</span>
          </span>
          <span className="btn btn-ghost btn-sm">Review now</span>
        </Link>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card title="Sales — last 30 days">
          <SalesChart data={o.sales_by_day ?? []} />
        </Card>
        <Card title="Low stock" actions={<Link href="/admin/products?stock=low" className="text-sm text-teal-strong hover:underline">View all</Link>}>
          {lowList.length ? (
            <ul className="divide-y divide-line text-sm">
              {lowList.map((p) => (
                <li key={p.id}><Link href={`/admin/products/${p.id}`} className="flex justify-between gap-3 py-2.5 hover:text-navy">
                  <span className="truncate">{p.name_en || p.name_ar}</span>
                  <Badge tone={p.stock_qty <= 0 ? "danger" : "warn"}>{p.stock_qty} left</Badge>
                </Link></li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">No tracked products are running low.</p>}
        </Card>
      </div>

      <Card title="Recent orders" className="mt-6" actions={<Link href="/admin/orders" className="text-sm text-teal-strong hover:underline">All orders</Link>}>
        {recent?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted"><tr><th className="py-2 font-medium">Order</th><th className="font-medium">Customer</th><th className="font-medium">Status</th><th className="font-medium">Date</th><th className="text-right font-medium">Total</th></tr></thead>
              <tbody className="divide-y divide-line">
                {recent.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3"><Link href={`/admin/orders/${r.id}`} className="font-medium text-navy hover:underline">{r.order_number}</Link></td>
                    <td>{r.customer_name}</td>
                    <td><Badge tone={statusTone(r.status)}>{r.status}</Badge></td>
                    <td className="text-muted">{new Date(r.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="text-right tabular-nums">{egp(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-muted">No orders yet. They&apos;ll appear here as soon as customers check out.</p>}
      </Card>
    </>
  );
}

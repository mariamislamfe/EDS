import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { formatDate, formatPrice } from "@/lib/i18n";
import { getViewer, isStaffRole } from "@/lib/auth/session";
import { q } from "@/lib/db";
import { ProfileForm } from "@/components/auth/AuthForms";
import { signOut } from "../auth-actions";
import type { OrderStatus } from "@/lib/types";

export const metadata: Metadata = { robots: { index: false } };

export default async function AccountPage() {
  const { t, locale } = await getI18n();
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/account");
  // only this customer's orders
  const orders = await q<{ id: string; order_number: string; status: OrderStatus; total: number; created_at: Date }>(
    `select id, order_number, status, total, created_at from orders where user_id = $1 order by created_at desc limit 50`, [viewer.id]);

  return (
    <div className="container-x pb-10 pt-10">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(2rem,4.5vw,3.2rem)] font-bold leading-none tracking-[-0.03em] rtl:leading-tight rtl:tracking-normal">{t.account.title}</h1>
          <p className="mt-2 text-muted" dir="ltr">{viewer.email}</p>
        </div>
        <div className="flex gap-2">
          {isStaffRole(viewer.role) && <Link href="/admin" className="btn btn-primary btn-sm">{t.nav.admin}</Link>}
          <form action={signOut}><button className="btn btn-ghost btn-sm">{t.nav.logout}</button></form>
        </div>
      </div>
      <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <h2 className="mb-4 text-xl font-semibold">{t.account.orders}</h2>
          {orders.length ? (
            <ul className="divide-y divide-line border-y border-line">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/account/orders/${o.id}`} className="grid grid-cols-[1fr_auto] items-center gap-2 py-4 hover:bg-cloud/60 sm:grid-cols-4">
                    <span className="font-medium text-navy" dir="ltr">{o.order_number}</span>
                    <span className="text-sm text-muted">{formatDate(o.created_at, locale)}</span>
                    <span className="text-sm">{t.order.statuses[o.status]}</span>
                    <span className="tabular-nums sm:text-end">{formatPrice(o.total, locale)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl border border-dashed border-line p-10 text-center text-muted">
              {t.account.noOrders} <Link href="/shop" className="font-medium text-teal-strong hover:underline">{t.nav.shop}</Link>
            </div>
          )}
        </section>
        <section className="h-fit rounded-[1.75rem] bg-cloud p-6">
          <h2 className="mb-4 text-xl font-semibold">{t.account.profile}</h2>
          <ProfileForm fullName={viewer.name} phone={viewer.phone ?? ""} />
        </section>
      </div>
    </div>
  );
}

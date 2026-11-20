import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getSettings } from "@/lib/catalog";
import { getI18n } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n";
import { getViewer } from "@/lib/auth/session";
import { one } from "@/lib/db";
import { OrderDetail, type OrderData } from "@/components/checkout/OrderDetail";
import { Breadcrumbs } from "@/components/ui/Section";

export const metadata: Metadata = { robots: { index: false } };

export default async function AccountOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { t, locale }] = await Promise.all([params, getI18n()]);
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/account");
  if (!z.string().uuid().safeParse(id).success) notFound();
  // ownership check: the order must belong to the signed-in customer
  const row = await one<{ r: OrderData | null; payment_method: string }>(
    `select public.get_order_public(o.id, o.access_token) as r, o.payment_method from orders o where o.id = $1 and o.user_id = $2`,
    [id, viewer.id]);
  if (!row?.r) notFound();
  const settings = await getSettings();
  const pm = settings.paymentMethods.find((m) => m.id === row.payment_method);
  return (
    <div className="container-x pb-10 pt-8">
      <Breadcrumbs items={[{ label: t.account.title, href: "/account" }, { label: row.r.order.order_number }]} />
      <h1 className="mb-10 mt-4 text-3xl font-bold" dir="ltr">{row.r.order.order_number}</h1>
      <OrderDetail data={row.r} t={t} locale={locale} paymentLabel={pm ? pick(locale, pm.label_en, pm.label_ar) : row.payment_method} />
    </div>
  );
}

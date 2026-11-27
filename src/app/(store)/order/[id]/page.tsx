import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { getSettings } from "@/lib/catalog";
import { getI18n } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n";
import { one } from "@/lib/db";
import { OrderDetail, type OrderData } from "@/components/checkout/OrderDetail";
import { EmptyState } from "@/components/ui/Section";
import { getCustomer } from "@/lib/customer/auth";
import Link from "next/link";

export const metadata: Metadata = { robots: { index: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ token?: string }> };

export default async function OrderPage({ params, searchParams }: Props) {
  const [{ id }, { token }, { t, locale }] = await Promise.all([params, searchParams, getI18n()]);
  const ids = z.object({ id: z.string().uuid(), token: z.string().uuid() }).safeParse({ id, token });
  let data: OrderData | null = null;
  if (ids.success) {
    const row = await one<{ r: OrderData | null }>(`select public.get_order_public($1::uuid, $2::uuid) as r`, [ids.data.id, ids.data.token]);
    data = row?.r ?? null;
  }
  if (!data) {
    return <div className="container-x py-20"><EmptyState title={t.order.notFound} /></div>;
  }
  const [settings, me] = await Promise.all([getSettings(), getCustomer()]);
  const pm = settings.paymentMethods.find((m) => m.id === data!.order.payment_method);
  const instructions = pm ? pick(locale, pm.instructions_en, pm.instructions_ar) : "";

  return (
    <div className="container-x pb-10 pt-12">
      <div className="mb-10 flex flex-col gap-3">
        <CheckCircle2 className="size-12 text-teal" strokeWidth={1.5} />
        <h1 className="text-[clamp(2rem,4.5vw,3.2rem)] font-bold leading-none tracking-[-0.03em] rtl:leading-tight rtl:tracking-normal">{t.order.thanks}</h1>
        <p className="max-w-xl text-lg text-muted">{t.order.received}</p>
        {instructions && pm?.id !== "cod" && <p className="max-w-xl whitespace-pre-line rounded-2xl bg-mist p-4 text-navy">{instructions}</p>}
        {me ? (
          <p className="text-sm text-muted">This order is saved in <Link href="/account" className="text-teal-strong underline underline-offset-4">your account</Link>, with all your previous orders.</p>
        ) : <p className="text-sm text-muted">{t.order.trackHint}</p>}
      </div>
      <OrderDetail data={data} t={t} locale={locale} paymentLabel={pm ? pick(locale, pm.label_en, pm.label_ar) : data.order.payment_method} />
    </div>
  );
}

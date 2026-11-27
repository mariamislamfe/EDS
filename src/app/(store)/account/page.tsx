import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Package } from "lucide-react";
import { q } from "@/lib/db";
import { getGovernorates } from "@/lib/catalog";
import { getCustomer } from "@/lib/customer/auth";
import { getI18n } from "@/lib/i18n/server";
import { formatDate, formatPrice } from "@/lib/i18n";
import type { OrderStatus } from "@/lib/types";
import { logoutCustomer } from "@/app/account-actions";
import { AuthPanel, PasswordPanel, ProfilePanel } from "@/components/account/AccountForms";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My account", robots: { index: false } };
export const dynamic = "force-dynamic";

type OrderRow = {
  id: string; access_token: string; order_number: string; status: OrderStatus; total: number; created_at: string;
  item_count: number; images: string[] | null;
};

const TONE: Record<OrderStatus, string> = {
  pending: "bg-warn/10 text-warn", confirmed: "bg-aqua-2 text-navy", processing: "bg-aqua-2 text-navy", shipped: "bg-navy text-white",
  delivered: "bg-success/10 text-success", cancelled: "bg-danger/10 text-danger", refunded: "bg-cloud text-muted",
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ t, locale }, me, { next }] = await Promise.all([getI18n(), getCustomer(), searchParams]);
  const safeNext = next && /^\/[a-z0-9/_-]*$/i.test(next) ? next : null;

  if (!me) {
    return (
      <div className="container-x grid gap-12 pb-10 pt-12 lg:grid-cols-[1fr_28rem] lg:items-start lg:pt-20">
        <div className="max-w-xl">
          <p className="eyebrow mb-4">My account</p>
          <h1 className="display text-[clamp(2.4rem,6vw,4.4rem)] leading-[0.95]">
            Every order, <span className="font-serif font-normal italic text-teal-strong">in one place.</span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            Sign in with your mobile number to see your order history, follow each order&apos;s status and check out faster next time.
          </p>
          <p className="mt-6 text-sm text-muted">
            Ordered without an account? <Link href="/track" className="text-teal-strong underline underline-offset-4">Track it with your order number</Link>.
          </p>
        </div>
        <AuthPanel next={safeNext} />
      </div>
    );
  }

  const [orders, governorates] = await Promise.all([
    q<OrderRow>(
      `select o.id, o.access_token, o.order_number, o.status, o.total, o.created_at,
              (select coalesce(sum(quantity), 0) from order_items i where i.order_id = o.id) as item_count,
              array(select i.image_url from order_items i where i.order_id = o.id and i.image_url is not null limit 4) as images
         from orders o where o.customer_id = $1 order by o.created_at desc limit 100`, [me.id]),
    getGovernorates(),
  ]);
  const spent = orders.filter((o) => o.status !== "cancelled" && o.status !== "refunded").reduce((n, o) => n + Number(o.total), 0);

  return (
    <div className="container-x pb-10 pt-10 lg:pt-14">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8">
        <div>
          <p className="eyebrow mb-3">My account</p>
          <h1 className="display text-[clamp(2.2rem,5vw,3.8rem)] leading-[0.95]">
            Hello, <span className="font-serif font-normal italic text-teal-strong">{me.name.split(" ")[0]}.</span>
          </h1>
          <p className="mt-3 text-muted" dir="ltr">{me.phone}</p>
        </div>
        <div className="flex items-center gap-8">
          <dl className="flex gap-8 font-mono text-xs uppercase tracking-[0.12em] text-muted">
            <div><dt>Orders</dt><dd className="display mt-1 font-sans text-3xl normal-case tracking-[-0.04em]">{orders.length}</dd></div>
            <div><dt>Total</dt><dd className="display mt-1 font-sans text-3xl normal-case tracking-[-0.04em]">{formatPrice(spent, locale)}</dd></div>
          </dl>
          <form action={logoutCustomer}><button className="btn btn-ghost btn-sm">Sign out</button></form>
        </div>
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1.6fr_1fr]">
        <section aria-labelledby="orders-title">
          <h2 id="orders-title" className="mb-5 text-xl font-semibold">Order history</h2>
          {orders.length ? (
            <ul className="flex flex-col gap-3" data-stagger>
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/order/${o.id}?token=${o.access_token}`}
                    className="group flex flex-wrap items-center gap-4 rounded-[1.25rem] border border-line bg-white p-4 transition-[border-color,box-shadow] duration-300 hover:border-navy/30 hover:shadow-lg hover:shadow-navy/5 sm:flex-nowrap sm:p-5">
                    <span className="flex -space-x-3 rtl:space-x-reverse">
                      {(o.images?.length ? o.images.slice(0, 3) : [null]).map((src, i) => (
                        <span key={i} className="product-tile relative size-12 overflow-hidden rounded-xl ring-2 ring-white">
                          {src ? <Image src={src} alt="" fill sizes="48px" className="object-contain p-1" /> : <Package className="m-3 size-6 text-muted" />}
                        </span>
                      ))}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-sm font-medium text-navy" dir="ltr">{o.order_number}</span>
                      <span className="text-sm text-muted">{formatDate(o.created_at, locale)} · {o.item_count} {Number(o.item_count) === 1 ? "item" : "items"}</span>
                    </span>
                    <span className={cn("rounded-full px-3 py-1 text-xs font-medium", TONE[o.status])}>{t.order.statuses[o.status]}</span>
                    <span className="w-28 text-end font-display font-semibold tabular-nums text-navy">{formatPrice(o.total, locale)}</span>
                    <ArrowUpRight className="size-4 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-line px-6 py-14 text-center">
              <p className="font-display text-xl font-semibold text-navy">No orders yet</p>
              <p className="mt-2 text-muted">Orders you place while signed in appear here.</p>
              <Link href="/shop" className="btn btn-primary mt-6">Start shopping</Link>
            </div>
          )}
        </section>
        <div className="flex flex-col gap-6">
          <ProfilePanel customer={{ name: me.name, email: me.email ?? "", governorate_id: me.governorate_id ?? "", city: me.city ?? "", address: me.address ?? "" }}
            governorates={governorates.map((g) => ({ id: g.id, name: g.name_en }))} />
          <PasswordPanel />
        </div>
      </div>
    </div>
  );
}

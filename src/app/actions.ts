"use server";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { one } from "@/lib/db";
import { getProduct, getProductsByIds, searchSuggestions } from "@/lib/catalog";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n";
import { getCustomer, hashPassword, phoneKey, startSession } from "@/lib/customer/auth";

const cartItem = z.object({
  type: z.enum(["product", "bundle"]),
  id: z.string().uuid(),
  variant_id: z.string().uuid().nullable().optional(),
  qty: z.number().int().min(1).max(999),
});
const cartItems = z.array(cartItem).max(100);

export interface QuoteLine {
  type: "product" | "bundle";
  id: string;
  variant_id: string | null;
  qty: number;
  name_en?: string | null;
  name_ar?: string | null;
  slug?: string;
  variant_label?: string | null;
  image_url?: string | null;
  unit_price?: number;
  line_total?: number;
  available?: number | null;
  ok: boolean;
  error: string | null;
}
export interface Quote {
  lines: QuoteLine[];
  subtotal: number;
  discount: number;
  shipping: number;
  shipping_pending: boolean;
  total: number;
  coupon_valid: boolean;
  coupon_message: string | null;
}

export async function quoteCart(input: { items: unknown; coupon?: string | null; governorateId?: string | null }): Promise<Quote | { error: string }> {
  const items = cartItems.safeParse(input.items);
  if (!items.success) return { error: "invalid_cart" };
  const coupon = z.string().max(40).nullish().parse(input.coupon) ?? null;
  const gov = z.string().uuid().nullish().safeParse(input.governorateId);
  try {
    const row = await one<{ q: Quote }>(`select public.quote_cart($1::jsonb, $2, $3::uuid) as q`,
      [JSON.stringify(items.data), coupon, gov.success ? gov.data ?? null : null]);
    return row!.q;
  } catch (e) {
    console.error("[quoteCart]", e);
    return { error: "generic" };
  }
}

const checkoutSchema = z.object({
  items: cartItems.min(1),
  payment_method: z.string().min(1).max(40),
  coupon_code: z.string().max(40).nullish(),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().regex(/^\+?[0-9 ]{8,16}$/),
    email: z.union([z.literal(""), z.string().trim().email().max(160)]).optional(),
    governorate_id: z.string().uuid(),
    city: z.string().trim().min(2).max(120),
    address: z.string().trim().min(5).max(500),
    notes: z.string().trim().max(1000).optional(),
  }),
  /** guest checkout can create an account with this password, so the order shows up in "My account" */
  create_account_password: z.string().min(6).max(100).nullish(),
});

const KNOWN_ERRORS = ["invalid_name", "invalid_phone", "invalid_city", "invalid_address", "invalid_email", "invalid_governorate",
  "invalid_payment_method", "empty_cart", "cart_changed", "invalid_coupon"] as const;

// ---- per-IP limit on placing orders (per server instance; stops scripted floods) ----
const orderHits = new Map<string, number[]>();
function tooManyOrders(ip: string) {
  const now = Date.now();
  const list = (orderHits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  list.push(now);
  orderHits.set(ip, list);
  if (orderHits.size > 5000) orderHits.clear(); // bounded memory
  return list.length > 5;
}

export async function placeOrder(input: unknown): Promise<{ ok: true; id: string; token: string; number: string; account: boolean } | { ok: false; error: string; field?: string }> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = String(issue.path[issue.path.length - 1] ?? "");
    const map: Record<string, string> = { create_account_password: "invalid_password", name: "invalid_name", phone: "invalid_phone", city: "invalid_city", address: "invalid_address",
      email: "invalid_email", governorate_id: "invalid_governorate", payment_method: "invalid_payment_method", items: "empty_cart" };
    return { ok: false, error: map[field] ?? "generic", field };
  }
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
  if (tooManyOrders(ip)) return { ok: false, error: "rate_limited" };
  const { create_account_password: newPassword, ...order } = parsed.data;
  const me = await getCustomer();
  if (!me && newPassword) {
    const taken = await one(`select 1 from customers where phone_key = $1`, [phoneKey(order.customer.phone)]);
    if (taken) return { ok: false, error: "account_exists", field: "phone" };
  }
  try {
    const row = await one<{ o: { id: string; access_token: string; order_number: string } }>(
      `select public.place_order($1::jsonb, null) as o`, [JSON.stringify(order)]);
    const r = row!.o;
    let customerId = me?.id ?? null;
    if (!me && newPassword) {
      const c = order.customer;
      const created = await one<{ id: string; session_version: number }>(
        `insert into customers (name, phone, phone_key, email, password_hash, governorate_id, city, address)
         values ($1, $2, $3, nullif($4, ''), $5, $6, $7, $8) on conflict (phone_key) do nothing returning id, session_version`,
        [c.name, c.phone, phoneKey(c.phone), c.email ?? "", await hashPassword(newPassword), c.governorate_id, c.city, c.address]);
      if (created) { customerId = created.id; await startSession(created.id, created.session_version); }
    }
    if (customerId) {
      await one(`update orders set customer_id = $1 where id = $2`, [customerId, r.id]);
      // remember the latest delivery details on the account
      await one(`update customers set governorate_id = coalesce(governorate_id, $2), city = coalesce(city, $3), address = coalesce(address, $4) where id = $1`,
        [customerId, order.customer.governorate_id, order.customer.city, order.customer.address]);
    }
    return { ok: true, id: r.id, token: r.access_token, number: r.order_number, account: Boolean(customerId) };
  } catch (e) {
    const message = String((e as Error).message ?? "");
    const code = KNOWN_ERRORS.find((k) => message.includes(k));
    if (!code) console.error("[placeOrder]", e);
    return { ok: false, error: code ?? "generic" };
  }
}

export async function setLocale(locale: string) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}

export async function suggest(q: string) {
  const query = z.string().trim().max(80).parse(q);
  return searchSuggestions(query);
}

export async function quickView(slug: string) {
  return getProduct(z.string().min(1).max(200).parse(slug));
}

export async function productsByIds(ids: string[]) {
  const parsed = z.array(z.string().uuid()).max(60).safeParse(ids);
  if (!parsed.success) return [];
  return getProductsByIds(parsed.data);
}

/** Guest order lookup: order number + the phone it was placed with → the private order page. */
export async function trackOrder(input: { number: string; phone: string }): Promise<{ ok: true; href: string } | { ok: false }> {
  const p = z.object({ number: z.string().trim().min(3).max(40), phone: z.string().trim().min(6).max(20) }).safeParse(input);
  if (!p.success) return { ok: false };
  const digits = (v: string) => v.replace(/\D/g, "").slice(-10);
  const num = p.data.number.toUpperCase().replace(/^(EDS-?)?/, "EDS-");
  const row = await one<{ id: string; access_token: string; phone: string }>(
    `select id, access_token, phone from orders where order_number = $1`, [num]);
  if (!row || digits(row.phone) !== digits(p.data.phone)) return { ok: false };
  return { ok: true, href: `/order/${row.id}?token=${row.access_token}` };
}

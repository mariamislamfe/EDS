"use server";
import { cookies } from "next/headers";
import { z } from "zod";
import { one } from "@/lib/db";
import { getViewer } from "@/lib/auth/session";
import { getProduct, getProductsByIds, searchSuggestions } from "@/lib/catalog";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n";

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
});

const KNOWN_ERRORS = ["invalid_name", "invalid_phone", "invalid_city", "invalid_address", "invalid_email", "invalid_governorate",
  "invalid_payment_method", "empty_cart", "cart_changed", "invalid_coupon"] as const;

export async function placeOrder(input: unknown): Promise<{ ok: true; id: string; token: string; number: string } | { ok: false; error: string; field?: string }> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = String(issue.path[issue.path.length - 1] ?? "");
    const map: Record<string, string> = { name: "invalid_name", phone: "invalid_phone", city: "invalid_city", address: "invalid_address",
      email: "invalid_email", governorate_id: "invalid_governorate", payment_method: "invalid_payment_method", items: "empty_cart" };
    return { ok: false, error: map[field] ?? "generic", field };
  }
  const viewer = await getViewer();
  try {
    const row = await one<{ o: { id: string; access_token: string; order_number: string } }>(
      `select public.place_order($1::jsonb, $2) as o`, [JSON.stringify(parsed.data), viewer?.id ?? null]);
    const r = row!.o;
    return { ok: true, id: r.id, token: r.access_token, number: r.order_number };
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

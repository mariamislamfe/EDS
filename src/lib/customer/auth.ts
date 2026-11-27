import "server-only";
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { one, q } from "@/lib/db";

/**
 * Customer accounts: mobile number + password.
 * - The session cookie is `<id>.<version>.<exp>.<hmac>`; the signing secret lives in
 *   settings key "private_customer_secret" ("private_%" keys never reach the storefront).
 * - Bumping customers.session_version signs that customer out everywhere.
 */
const COOKIE = "eds_customer";
const SECRET_KEY = "private_customer_secret";
const SESSION_DAYS = 90;

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export type Customer = {
  id: string; name: string; phone: string; email: string | null;
  governorate_id: string | null; city: string | null; address: string | null; created_at: string;
};

/** Egyptian numbers are written many ways (+20, 0020, 01…); the last 10 digits identify the line. */
export const phoneKey = (phone: string) => phone.replace(/\D/g, "").slice(-10);

const getSecret = cache(async (): Promise<string> => {
  const row = await one<{ value: { secret: string } }>(`select value from settings where key = $1`, [SECRET_KEY]);
  if (row?.value?.secret) return row.value.secret;
  await q(`insert into settings (key, value) values ($1, $2::jsonb) on conflict (key) do nothing`,
    [SECRET_KEY, JSON.stringify({ secret: randomBytes(32).toString("hex") })]);
  return (await one<{ value: { secret: string } }>(`select value from settings where key = $1`, [SECRET_KEY]))!.value.secret;
});

export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${(await scrypt(pw, salt, 64)).toString("hex")}`;
}

const safeEqual = (a: Buffer, b: Buffer) => a.length === b.length && timingSafeEqual(a, b);

export async function verifyPassword(pw: string, stored: string) {
  const [, saltHex, hashHex] = stored.split("$");
  if (!saltHex || !hashHex) return false;
  return safeEqual(await scrypt(pw, Buffer.from(saltHex, "hex"), 64), Buffer.from(hashHex, "hex"));
}

const sign = (secret: string, payload: string) => createHmac("sha256", secret).update(`customer:${payload}`).digest("hex");

export async function startSession(id: string, version: number) {
  const exp = Date.now() + SESSION_DAYS * 86400_000;
  const payload = `${id}.${version}.${exp}`;
  (await cookies()).set(COOKIE, `${payload}.${sign(await getSecret(), payload)}`, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: new Date(exp),
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

/** The signed-in customer, or null. Cached per request. */
export const getCustomer = cache(async (): Promise<Customer | null> => {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 4) return null;
  const [id, ver, expStr, mac] = parts;
  if (!/^[0-9a-f-]{36}$/.test(id) || Number(expStr) < Date.now()) return null;
  try {
    const expected = sign(await getSecret(), `${id}.${ver}.${expStr}`);
    if (!safeEqual(Buffer.from(mac, "hex"), Buffer.from(expected, "hex"))) return null;
    return await one<Customer>(
      `select id, name, phone, email, governorate_id, city, address, created_at
         from customers where id = $1 and session_version = $2`, [id, Number(ver)]);
  } catch {
    return null;
  }
});

// ---- brute-force guard (per server instance) ----
const attempts = new Map<string, { n: number; until: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60_000;

async function clientKey() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
}

export async function isLocked() {
  const a = attempts.get(await clientKey());
  return Boolean(a && a.until > Date.now() && a.n >= MAX_ATTEMPTS);
}

export async function recordFailure() {
  const ip = await clientKey();
  const a = attempts.get(ip);
  const cur = a && a.until > Date.now() ? a : { n: 0, until: Date.now() + WINDOW_MS };
  attempts.set(ip, { n: cur.n + 1, until: cur.until });
}

export async function clearFailures() {
  attempts.delete(await clientKey());
}

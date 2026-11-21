import "server-only";
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { one, q } from "@/lib/db";

/**
 * Dashboard access is a single password (no user accounts).
 * - The default password is 123456 until it is changed in Store settings.
 * - The hash and the cookie-signing secret live in settings key "private_admin_auth"
 *   ("private_%" keys are never read by the storefront).
 * - Changing the password rotates the secret, which signs out every other device.
 */
export const DEFAULT_PASSWORD = "123456";
const KEY = "private_admin_auth";
const COOKIE = "eds_admin";
const SESSION_DAYS = 30;

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

type AuthRow = { hash: string | null; secret: string };

async function loadAuth(): Promise<AuthRow> {
  const row = await one<{ value: AuthRow }>(`select value from settings where key = $1`, [KEY]);
  if (row?.value?.secret) return row.value;
  const fresh: AuthRow = { hash: null, secret: randomBytes(32).toString("hex") };
  await q(`insert into settings (key, value) values ($1, $2::jsonb) on conflict (key) do nothing`, [KEY, JSON.stringify(fresh)]);
  return (await one<{ value: AuthRow }>(`select value from settings where key = $1`, [KEY]))!.value;
}

async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${(await scrypt(pw, salt, 64)).toString("hex")}`;
}

function safeEqual(a: Buffer, b: Buffer) {
  return a.length === b.length && timingSafeEqual(a, b);
}

async function checkPassword(pw: string, auth: AuthRow) {
  if (!auth.hash) return safeEqual(Buffer.from(pw), Buffer.from(DEFAULT_PASSWORD));
  const [, saltHex, hashHex] = auth.hash.split("$");
  return safeEqual(await scrypt(pw, Buffer.from(saltHex, "hex"), 64), Buffer.from(hashHex, "hex"));
}

const sign = (secret: string, exp: number) => createHmac("sha256", secret).update(`admin:${exp}`).digest("hex");

async function issueCookie(secret: string) {
  const exp = Date.now() + SESSION_DAYS * 86400_000;
  (await cookies()).set(COOKIE, `${exp}.${sign(secret, exp)}`, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: new Date(exp),
  });
}

/** True when the request carries a valid dashboard session. Cached per request. */
export const isAdmin = cache(async (): Promise<boolean> => {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return false;
  const [expStr, mac] = raw.split(".");
  const exp = Number(expStr);
  if (!exp || exp < Date.now() || !mac) return false;
  try {
    const { secret } = await loadAuth();
    return safeEqual(Buffer.from(mac, "hex"), Buffer.from(sign(secret, exp), "hex"));
  } catch {
    return false;
  }
});

/** For pages: send to the dashboard password screen when not signed in. */
export async function requireStaffPage() {
  if (!(await isAdmin())) redirect("/admin/login");
}

/**
 * For server actions. The database trusts the app server, so this check is
 * the authorization boundary: every admin action must call it first.
 */
export async function requireStaff() {
  if (!(await isAdmin())) throw new Error("forbidden");
}
export const requireAdmin = requireStaff;

// ---- brute-force guard (per server instance) ----
const attempts = new Map<string, { n: number; until: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60_000;

async function clientKey() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
}

export async function signInWithPassword(pw: string): Promise<"ok" | "invalid" | "locked"> {
  const ip = await clientKey();
  const a = attempts.get(ip);
  if (a && a.until > Date.now() && a.n >= MAX_ATTEMPTS) return "locked";
  const auth = await loadAuth();
  if (!(await checkPassword(pw, auth))) {
    const cur = a && a.until > Date.now() ? a : { n: 0, until: Date.now() + WINDOW_MS };
    attempts.set(ip, { n: cur.n + 1, until: cur.until });
    return "invalid";
  }
  attempts.delete(ip);
  await issueCookie(auth.secret);
  return "ok";
}

export async function signOutAdmin() {
  (await cookies()).delete(COOKIE);
}

export async function changeAdminPassword(current: string, next: string): Promise<"ok" | "wrong_current"> {
  await requireStaff();
  const auth = await loadAuth();
  if (!(await checkPassword(current, auth))) return "wrong_current";
  const fresh: AuthRow = { hash: await hashPassword(next), secret: randomBytes(32).toString("hex") };
  await q(`insert into settings (key, value, updated_at) values ($1, $2::jsonb, now())
           on conflict (key) do update set value = excluded.value, updated_at = now()`, [KEY, JSON.stringify(fresh)]);
  await issueCookie(fresh.secret); // keep this device signed in; others are signed out
  return "ok";
}

"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { one, q } from "@/lib/db";
import {
  clearFailures, endSession, getCustomer, hashPassword, isLocked, phoneKey, recordFailure, startSession, verifyPassword,
} from "@/lib/customer/auth";

export type AccountResult = { ok: true } | { ok: false; error: string };

const phone = z.string().trim().regex(/^\+?[0-9 ]{8,16}$/, "Enter a valid mobile number");
const password = z.string().min(6, "Password must be at least 6 characters").max(100);

const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(120),
  phone,
  password,
});

export async function registerCustomer(input: unknown): Promise<AccountResult> {
  const p = registerSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const key = phoneKey(p.data.phone);
  const exists = await one(`select 1 from customers where phone_key = $1`, [key]);
  if (exists) return { ok: false, error: "This mobile number already has an account — sign in instead." };
  const row = await one<{ id: string; session_version: number }>(
    `insert into customers (name, phone, phone_key, password_hash) values ($1, $2, $3, $4) returning id, session_version`,
    [p.data.name, p.data.phone, key, await hashPassword(p.data.password)]);
  await startSession(row!.id, row!.session_version);
  return { ok: true };
}

export async function loginCustomer(input: unknown): Promise<AccountResult> {
  const p = z.object({ phone, password: z.string().min(1).max(100) }).safeParse(input);
  if (!p.success) return { ok: false, error: "Enter your mobile number and password." };
  if (await isLocked()) return { ok: false, error: "Too many attempts. Try again in 15 minutes." };
  const row = await one<{ id: string; password_hash: string; session_version: number }>(
    `select id, password_hash, session_version from customers where phone_key = $1`, [phoneKey(p.data.phone)]);
  if (!row || !(await verifyPassword(p.data.password, row.password_hash))) {
    await recordFailure();
    return { ok: false, error: "Wrong mobile number or password." };
  }
  await clearFailures();
  await startSession(row.id, row.session_version);
  return { ok: true };
}

export async function logoutCustomer() {
  await endSession();
  redirect("/account");
}

export async function updateCustomerProfile(input: unknown): Promise<AccountResult> {
  const me = await getCustomer();
  if (!me) return { ok: false, error: "Please sign in again." };
  const p = z.object({
    name: z.string().trim().min(2).max(120),
    email: z.union([z.literal(""), z.string().trim().email().max(160)]),
    governorate_id: z.string().uuid().or(z.literal("")),
    city: z.string().trim().max(120),
    address: z.string().trim().max(500),
  }).safeParse(input);
  if (!p.success) return { ok: false, error: "Check the highlighted details." };
  const d = p.data;
  await q(`update customers set name = $2, email = nullif($3, ''), governorate_id = nullif($4, '')::uuid, city = nullif($5, ''), address = nullif($6, '') where id = $1`,
    [me.id, d.name, d.email, d.governorate_id, d.city, d.address]);
  return { ok: true };
}

export async function changeCustomerPassword(input: unknown): Promise<AccountResult> {
  const me = await getCustomer();
  if (!me) return { ok: false, error: "Please sign in again." };
  const p = z.object({ current: z.string().min(1), next: password }).safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const row = await one<{ password_hash: string }>(`select password_hash from customers where id = $1`, [me.id]);
  if (!row || !(await verifyPassword(p.data.current, row.password_hash))) return { ok: false, error: "Your current password is wrong." };
  const upd = await one<{ session_version: number }>(
    `update customers set password_hash = $2, session_version = session_version + 1 where id = $1 returning session_version`,
    [me.id, await hashPassword(p.data.next)]);
  await startSession(me.id, upd!.session_version); // other devices are signed out
  return { ok: true };
}

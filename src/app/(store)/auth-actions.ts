"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { getViewer } from "@/lib/auth/session";
import { q } from "@/lib/db";
import { SITE_URL } from "@/lib/env";

export type AuthState = { error?: string; message?: string } | undefined;

/** Only allow same-site relative redirects. */
function safeNext(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/account";
}

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : SITE_URL;
}

const phoneSchema = z.string().trim().regex(/^\+?[0-9 ]{8,16}$/).or(z.literal(""));

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse({
    email: form.get("email"), password: form.get("password"),
  });
  if (!parsed.success) return { error: "invalid" };
  const { error } = await auth.signIn.email({ email: parsed.data.email, password: parsed.data.password });
  if (error) return { error: "invalid" };
  redirect(safeNext(form.get("next")));
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = z.object({
    email: z.string().email(), password: z.string().min(8),
    full_name: z.string().trim().min(2).max(120), phone: phoneSchema,
  }).safeParse({ email: form.get("email"), password: form.get("password"), full_name: form.get("full_name"), phone: form.get("phone") ?? "" });
  if (!parsed.success) {
    const f = parsed.error.issues[0].path[0];
    return { error: f === "password" ? "weakPassword" : "invalid" };
  }
  const { data, error } = await auth.signUp.email({ email: parsed.data.email, password: parsed.data.password, name: parsed.data.full_name });
  if (error) return { error: error.message || "invalid" };
  const user = (data as { user?: { id: string } } | null)?.user;
  if (user?.id) {
    await q(
      `insert into profiles (id, email, full_name, phone) values ($1, lower($2), $3, nullif($4, ''))
       on conflict (id) do update set full_name = excluded.full_name, phone = excluded.phone`,
      [user.id, parsed.data.email, parsed.data.full_name, parsed.data.phone],
    );
  }
  // If the Neon Auth project requires email verification there is no session yet.
  const token = (data as { token?: string | null } | null)?.token;
  if (!token) return { message: "checkEmail" };
  redirect(safeNext(form.get("next")));
}

export async function signOut() {
  await auth.signOut();
  redirect("/");
}

export async function sendReset(_: AuthState, form: FormData): Promise<AuthState> {
  const email = z.string().email().safeParse(form.get("email"));
  if (email.success) {
    await auth.requestPasswordReset({ email: email.data, redirectTo: `${await origin()}/reset-password` }).catch(() => null);
  }
  // same response either way: never reveal whether an account exists
  return { message: "resetSent" };
}

export async function resetPassword(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = z.object({ password: z.string().min(8), token: z.string().min(10) }).safeParse({
    password: form.get("password"), token: form.get("token"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].path[0] === "password" ? "weakPassword" : "invalid" };
  const { error } = await auth.resetPassword({ newPassword: parsed.data.password, token: parsed.data.token });
  if (error) return { error: error.message || "invalid" };
  return { message: "passwordUpdated" };
}

export async function updateProfile(_: AuthState, form: FormData): Promise<AuthState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "invalid" };
  const parsed = z.object({ full_name: z.string().trim().min(2).max(120), phone: phoneSchema })
    .safeParse({ full_name: form.get("full_name"), phone: form.get("phone") ?? "" });
  if (!parsed.success) return { error: "invalid" };
  await q(`update profiles set full_name = $2, phone = nullif($3, '') where id = $1`, [viewer.id, parsed.data.full_name, parsed.data.phone]);
  return { message: "saved" };
}

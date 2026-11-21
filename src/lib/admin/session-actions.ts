"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { changeAdminPassword, signInWithPassword, signOutAdmin } from "./auth";

export type LoginState = { error?: string } | undefined;

export async function adminLogin(_: LoginState, form: FormData): Promise<LoginState> {
  const pw = z.string().min(1).max(200).safeParse(form.get("password"));
  if (!pw.success) return { error: "Enter the dashboard password." };
  const r = await signInWithPassword(pw.data);
  if (r === "locked") return { error: "Too many wrong attempts. Try again in 15 minutes." };
  if (r === "invalid") return { error: "Wrong password." };
  redirect("/admin");
}

export async function adminLogout() {
  await signOutAdmin();
  redirect("/admin/login");
}

export async function updateAdminPassword(input: { current: string; next: string; confirm: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const p = z.object({ current: z.string().min(1).max(200), next: z.string().min(6).max(200), confirm: z.string() }).safeParse(input);
  if (!p.success) {
    const f = p.error.issues[0].path[0];
    return { ok: false, error: f === "next" ? "The new password must be at least 6 characters." : "Fill in all fields." };
  }
  if (p.data.next !== p.data.confirm) return { ok: false, error: "The new passwords don't match." };
  try {
    const r = await changeAdminPassword(p.data.current, p.data.next);
    if (r === "wrong_current") return { ok: false, error: "The current password is wrong." };
    return { ok: true };
  } catch {
    return { ok: false, error: "Your session expired. Sign in again." };
  }
}

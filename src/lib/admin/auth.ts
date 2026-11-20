import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getViewer } from "@/lib/auth/session";

export type StaffContext = { id: string; role: "admin" | "staff"; name: string; email: string };

/** The signed-in staff member, or null. Cached per request. */
export const getStaff = cache(async (): Promise<StaffContext | null> => {
  const v = await getViewer();
  if (!v || (v.role !== "admin" && v.role !== "staff")) return null;
  return { id: v.id, role: v.role, name: v.name || v.email, email: v.email };
});

/** For pages: redirect away when not staff. */
export async function requireStaffPage() {
  const ctx = await getStaff();
  if (!ctx) redirect("/login?next=/admin");
  return ctx;
}

/**
 * For server actions. The database trusts the app server, so these checks are
 * the authorization boundary: every admin action must call one of them first.
 */
export async function requireStaff() {
  const ctx = await getStaff();
  if (!ctx) throw new Error("forbidden");
  return ctx;
}

export async function requireAdmin() {
  const ctx = await requireStaff();
  if (ctx.role !== "admin") throw new Error("forbidden");
  return ctx;
}

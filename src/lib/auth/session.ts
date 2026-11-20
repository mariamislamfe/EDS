import "server-only";
import { cache } from "react";
import { isConfigured } from "@/lib/env";
import { one } from "@/lib/db";
import { auth } from "./server";

export type Role = "customer" | "staff" | "admin";
export interface Viewer {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
}

/**
 * The signed-in user (from Neon Auth) joined with their store profile.
 * The profile row is created on first sight, so roles live in our own table.
 * Cached for the duration of a request.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!isConfigured) return null;
  let user: { id: string; email?: string | null; name?: string | null } | undefined;
  try {
    const { data } = await auth.getSession();
    user = data?.user ?? undefined;
  } catch {
    return null;
  }
  if (!user?.id) return null;
  const profile = await one<{ full_name: string | null; phone: string | null; role: Role; email: string | null }>(
    `insert into profiles (id, email, full_name)
     values ($1, lower($2), nullif($3, ''))
     on conflict (id) do update set email = coalesce(lower(excluded.email), profiles.email)
     returning full_name, phone, role, email`,
    [user.id, user.email ?? null, user.name ?? null],
  );
  return {
    id: user.id,
    email: profile?.email ?? user.email ?? "",
    name: profile?.full_name ?? user.name ?? "",
    phone: profile?.phone ?? null,
    role: profile?.role ?? "customer",
  };
});

export const isStaffRole = (r?: Role) => r === "staff" || r === "admin";

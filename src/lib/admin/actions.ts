"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { q, dbErrorMessage } from "@/lib/db";
import { requireAdmin, requireStaff } from "./auth";
import { ENTITIES, isEntityKey } from "./entities";
import { insertRow, updateRow } from "./sql";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

export async function refreshStorefront() {
  revalidateTag("catalog", "max");
  revalidatePath("/", "layout");
}

// ---------------- generic entities ----------------
export async function saveEntity(entity: string, id: string | null, values: unknown): Promise<ActionResult> {
  if (!isEntityKey(entity)) return { ok: false, error: "Unknown entity" };
  const def = ENTITIES[entity];
  if ("adminOnly" in def && def.adminOnly) await requireAdmin(); else await requireStaff();
  const parsed = def.schema.safeParse(values);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: `${String(i.path[0] ?? "")}: ${i.message}` };
  }
  const row = parsed.data as Record<string, unknown>;
  try {
    const rid = id ? await updateRow(null, def.table, z.string().uuid().parse(id), row) : await insertRow(null, def.table, row);
    await refreshStorefront();
    return { ok: true, id: rid };
  } catch (e) {
    return { ok: false, error: dbErrorMessage(e) };
  }
}

export async function deleteEntity(entity: string, id: string): Promise<ActionResult> {
  if (!isEntityKey(entity)) return { ok: false, error: "Unknown entity" };
  await requireStaff();
  try {
    await q(`delete from "${ENTITIES[entity].table}" where id = $1`, [z.string().uuid().parse(id)]);
  } catch (e) {
    return { ok: false, error: dbErrorMessage(e) };
  }
  await refreshStorefront();
  return { ok: true };
}

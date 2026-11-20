import "server-only";
import type pg from "pg";
import { one } from "@/lib/db";

/**
 * Insert/update helpers for admin writes. Table and column names come only
 * from server-side config / zod-validated keys (never raw user input), and
 * every value is a bound parameter.
 */
const IDENT = /^[a-z_][a-z0-9_]*$/;
const ident = (s: string) => {
  if (!IDENT.test(s)) throw new Error(`Invalid identifier: ${s}`);
  return `"${s}"`;
};

/** jsonb columns must be sent as JSON text; arrays stay native (uuid[] / text[]). */
const JSON_COLUMNS = new Set(["specifications", "option_names", "options", "value"]);
const toParam = (col: string, v: unknown) => (JSON_COLUMNS.has(col) && v !== null && typeof v === "object" ? JSON.stringify(v) : v);

type Runner = { query: pg.PoolClient["query"] } | null;

async function run<T extends pg.QueryResultRow>(c: Runner, text: string, params: unknown[]) {
  if (c) return (await c.query<T>(text, params)).rows[0] ?? null;
  return one<T>(text, params);
}

export async function insertRow(c: Runner, table: string, row: Record<string, unknown>) {
  const cols = Object.keys(row);
  const sql = `insert into ${ident(table)} (${cols.map(ident).join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")}) returning id`;
  return (await run<{ id: string }>(c, sql, cols.map((k) => toParam(k, row[k]))))!.id;
}

export async function updateRow(c: Runner, table: string, id: string, row: Record<string, unknown>) {
  const cols = Object.keys(row);
  const sql = `update ${ident(table)} set ${cols.map((k, i) => `${ident(k)} = $${i + 2}`).join(", ")} where id = $1 returning id`;
  const r = await run<{ id: string }>(c, sql, [id, ...cols.map((k) => toParam(k, row[k]))]);
  if (!r) throw new Error("Not found");
  return r.id;
}

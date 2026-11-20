import "server-only";
import pg from "pg";
import { DATABASE_URL } from "@/lib/env";

/**
 * Postgres access (Neon). Only server code imports this module; the browser
 * never talks to the database. Use the *pooled* Neon connection string.
 */
// numeric → number, bigint (count(*)) → number
pg.types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
pg.types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));

const g = globalThis as unknown as { __edsPool?: pg.Pool };

function pool() {
  if (!DATABASE_URL) throw new SetupError();
  if (!g.__edsPool) {
    g.__edsPool = new pg.Pool({ connectionString: DATABASE_URL, max: 5, idleTimeoutMillis: 20_000, connectionTimeoutMillis: 10_000 });
    g.__edsPool.on("error", (e) => console.error("[db] idle client error", e));
  }
  return g.__edsPool;
}

export type Row = pg.QueryResultRow;

/** Run a parameterized query and return all rows. */
export async function q<T extends Row = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await pool().query<T>(text, params)).rows;
}

/** First row or null. */
export async function one<T extends Row = Row>(text: string, params: unknown[] = []): Promise<T | null> {
  return (await pool().query<T>(text, params)).rows[0] ?? null;
}

/** Run several statements atomically. */
export async function tx<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("begin");
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export class SetupError extends Error {
  constructor() {
    super("Database is not configured. Copy .env.example to .env.local and set DATABASE_URL (see README).");
    this.name = "SetupError";
  }
}

/** Map Postgres error codes to messages an admin can act on. */
export function dbErrorMessage(e: unknown): string {
  const err = e as { code?: string; message?: string };
  if (err?.code === "23505") return "That value is already used (it must be unique).";
  if (err?.code === "23503") return "This item is still referenced elsewhere (e.g. in a bundle or order).";
  if (err?.code === "22P02") return "Invalid value.";
  return err?.message ?? "Unknown database error";
}

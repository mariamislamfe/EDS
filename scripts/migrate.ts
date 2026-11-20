/**
 * Applies db/migrations/*.sql to your Neon database, in order, recording what
 * has run in public._eds_migrations. Safe to re-run.
 *
 *   npm run db:migrate
 *
 * Uses DATABASE_URL_UNPOOLED if set (recommended for migrations), else DATABASE_URL.
 */
import { config } from "dotenv";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

config({ path: ".env.local" });
config();

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL (and ideally DATABASE_URL_UNPOOLED) in .env.local");
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  await client.query(`create table if not exists public._eds_migrations (name text primary key, applied_at timestamptz not null default now())`);
  const done = new Set((await client.query<{ name: string }>(`select name from public._eds_migrations`)).rows.map((r) => r.name));
  const dir = join(process.cwd(), "db", "migrations");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    if (done.has(f)) { console.log(`· ${f} (already applied)`); continue; }
    try {
      await client.query("begin");
      await client.query(readFileSync(join(dir, f), "utf8"));
      await client.query(`insert into public._eds_migrations (name) values ($1)`, [f]);
      await client.query("commit");
      console.log(`✓ ${f}`);
    } catch (e) {
      await client.query("rollback");
      console.error(`✗ ${f}\n`, e);
      process.exit(1);
    }
  }
  await client.end();
  console.log("Database is up to date.");
}

main().catch((e) => { console.error(e); process.exit(1); });

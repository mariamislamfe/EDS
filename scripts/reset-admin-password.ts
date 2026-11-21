/**
 * Resets the dashboard password back to the default (123456) and signs out
 * every device. Use it if the password is forgotten:
 *   npm run reset-admin-password
 */
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });
config();

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL in .env.local");
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  await client.query(`delete from settings where key = 'private_admin_auth'`);
  await client.end();
  console.log("✓ Dashboard password reset to 123456. Sign in at /admin and change it in Store settings.");
}

main().catch((e) => { console.error(e); process.exit(1); });

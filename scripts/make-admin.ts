/**
 * Grants dashboard access to an existing account.
 *   npm run make-admin -- someone@example.com          (admin)
 *   npm run make-admin -- someone@example.com staff    (staff)
 * The person must have created an account AND signed in once (that creates
 * their store profile).
 */
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });
config();

async function main() {
  const [email, role = "admin"] = process.argv.slice(2);
  if (!email || !["admin", "staff", "customer"].includes(role)) {
    console.error("Usage: npm run make-admin -- <email> [admin|staff|customer]");
    process.exit(1);
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL in .env.local");
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  const { rows } = await client.query(`update profiles set role = $2::user_role where lower(email) = lower($1) returning email, role`, [email.trim(), role]);
  await client.end();
  if (!rows.length) {
    console.error(`No profile for ${email}. Create an account on the site and sign in once, then run this again.`);
    process.exit(1);
  }
  console.log(`✓ ${rows[0].email} is now ${rows[0].role}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

// Starts the live app afresh: deletes every sign-up and everything people stored, and keeps the team (admin) accounts.
//
//   node scripts/fresh-start.mjs           shows what would be deleted and changes nothing
//   node scripts/fresh-start.mjs --yes     deletes it, all in one transaction
//
// DATABASE_URL must point at the database to clean. Read it from your own environment, for example
//   npx vercel env pull .env.production --environment=production
//   node --env-file=.env.production scripts/fresh-start.mjs
// then delete .env.production. The notification keys in `settings` are kept so phones that allowed alerts keep working.
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const apply = process.argv.includes("--yes");
const client = new pg.Client({ connectionString: url, ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false } });
await client.connect();

// Tables that only hold people's data, in an order that never breaks a link between them.
const WIPE = ["parcel_photos", "parcel_events", "runner_payouts", "push_subscriptions", "password_resets", "reset_requests", "login_attempts", "parcels", "points", "sessions"];

try {
  const admins = (await client.query("SELECT id, name, identifier FROM users WHERE role = 'admin' ORDER BY created_at")).rows;
  const others = (await client.query("SELECT role, count(*)::int AS n FROM users WHERE role <> 'admin' GROUP BY role ORDER BY role")).rows;
  console.log("Accounts that stay:");
  for (const a of admins) console.log(`  ${a.name} (${a.identifier})`);
  if (admins.length === 0) {
    console.error("There is no admin account, so nothing was changed.");
    process.exit(1);
  }
  console.log("Accounts to delete:", others.length ? others.map((o) => `${o.n} ${o.role}`).join(", ") : "none");
  for (const t of WIPE) {
    const n = (await client.query(`SELECT count(*)::int AS n FROM ${t}`)).rows[0].n;
    console.log(`  ${t}: ${n} rows`);
  }
  if (!apply) {
    console.log("\nNothing was changed. Run again with --yes to delete.");
  } else {
    await client.query("BEGIN");
    for (const t of WIPE) {
      // Keep the admin's own sign-in sessions so the team stays signed in.
      if (t === "sessions") await client.query("DELETE FROM sessions WHERE user_id NOT IN (SELECT id FROM users WHERE role = 'admin')");
      else await client.query(`DELETE FROM ${t}`);
    }
    await client.query("DELETE FROM users WHERE role <> 'admin'");
    await client.query("COMMIT");
    console.log("\nDone. Only the admin accounts are left.");
  }
} catch (e) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Failed, nothing was changed:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

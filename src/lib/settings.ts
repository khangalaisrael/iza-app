import { randomBytes } from "node:crypto";
import { db } from "./db";

// The team's alert channel on ntfy.sh. It is a long random name, so only people the team shows it to can read or send to it.
// It is made once, kept in the database, and shown on the team page for them to subscribe to.
export async function teamTopic(): Promise<string> {
  const d = await db();
  const [row] = await d.query<{ value: string }>("SELECT value FROM settings WHERE key = 'team_topic'");
  if (row) return row.value;
  const topic = "izza-team-" + randomBytes(12).toString("hex");
  // Two requests at the same moment cannot make two different channels: the first one wins.
  await d.query("INSERT INTO settings (key, value) VALUES ('team_topic', $1) ON CONFLICT (key) DO NOTHING", [topic]);
  const [saved] = await d.query<{ value: string }>("SELECT value FROM settings WHERE key = 'team_topic'");
  return saved.value;
}

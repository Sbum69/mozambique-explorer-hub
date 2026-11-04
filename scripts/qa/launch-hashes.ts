/**
 * Launch day: prints the SHA-256 of the three test account emails (from .env.test.local), for the
 * VALUES list in supabase/launch/launch-day.sql. Emails are never printed.
 * Usage: bun scripts/qa/launch-hashes.ts
 */
import { createHash } from "node:crypto";
import { join } from "node:path";

import { readEnv, REPO } from "./lib";

const env = readEnv(join(REPO, ".env.test.local"));
const keys = ["TEST_TOURIST_EMAIL", "TEST_BUSINESS_EMAIL", "TEST_ADMIN_EMAIL"];
const missing = keys.filter((k) => !env[k]);
if (missing.length) {
  console.log(`BLOCKED: missing ${missing.join(", ")} in .env.test.local`);
  process.exit(2);
}
const hashes = keys.map((k) => createHash("sha256").update(env[k].trim().toLowerCase()).digest("hex"));
console.log(hashes.map((h) => `  ('${h}')`).join(",\n"));

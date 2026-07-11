import fs from "node:fs";
import { execFileSync } from "node:child_process";

const raw = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of raw.split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i < 0) continue;
  const k = line.slice(0, i).trim();
  let v = line.slice(i + 1);
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  env[k] = v;
}

const bucket =
  env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  "nextgenmove-1744b.firebasestorage.app";

const map = {
  NEXT_PUBLIC_FIREBASE_API_KEY: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: bucket,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
    env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_APP_URL: "https://nextgenmove.myflynai.com",
  FIREBASE_PROJECT_ID:
    env.FIREBASE_PROJECT_ID || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: env.FIREBASE_PRIVATE_KEY,
  FIREBASE_ADMIN_PROJECT_ID:
    env.FIREBASE_PROJECT_ID || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  FIREBASE_ADMIN_CLIENT_EMAIL: env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_ADMIN_PRIVATE_KEY: env.FIREBASE_PRIVATE_KEY,
  SESSION_SECRET: env.SESSION_SECRET,
};

const missing = Object.entries(map)
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (missing.length) {
  console.error("Missing values:", missing.join(", "));
  process.exit(1);
}

const targets = ["production", "preview", "development"];
let failed = 0;

for (const [name, value] of Object.entries(map)) {
  for (const target of targets) {
    try {
      execFileSync(
        "npx",
        [
          "vercel",
          "env",
          "add",
          name,
          target,
          "--value",
          value,
          "--yes",
          "--force",
          "--scope",
          "pb3",
        ],
        {
          stdio: ["ignore", "pipe", "pipe"],
          encoding: "utf8",
          shell: true,
        },
      );
      console.log("OK", name, target);
    } catch (e) {
      const msg = String(e.stderr || e.stdout || e.message || "")
        .split("\n")
        .slice(0, 5)
        .join(" | ");
      console.error("FAIL", name, target, msg);
      failed += 1;
    }
  }
}

if (failed) process.exit(1);

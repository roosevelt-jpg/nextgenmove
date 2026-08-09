/**
 * Set site_settings/default.contactEmail to info@nextgenmove.agency
 * Usage: npx tsx scripts/patch-contact-email.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../src/lib/firebase-admin";
import { stripUndefined } from "../src/lib/stripUndefined";

const CONTACT_EMAIL = "info@nextgenmove.agency";

async function main() {
  const ref = adminDb.collection("site_settings").doc("default");
  await ref.set(
    stripUndefined({
      contactEmail: CONTACT_EMAIL,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );
  console.log(`site_settings/default.contactEmail → ${CONTACT_EMAIL}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

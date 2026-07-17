/**
 * Clear a mistaken API key from youtubePlaylistUrl and set friendly error hint.
 * Run: npx tsx scripts/patch-youtube-playlist-field.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { stripUndefined } from "../src/lib/stripUndefined";
import { looksLikeGoogleApiKey } from "../src/lib/media/youtube";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      }),
    });
  }

  const db = getFirestore();
  const ref = db.collection("site_settings").doc("default");
  const snap = await ref.get();
  const data = snap.data() ?? {};
  const current = String(data.youtubePlaylistUrl ?? "").trim();

  if (!looksLikeGoogleApiKey(current)) {
    console.log("youtubePlaylistUrl looks fine:", current || "(empty)");
    return;
  }

  await ref.set(
    stripUndefined({
      youtubePlaylistUrl: "",
      youtubeLastSyncError: "playlist_looks_like_api_key",
      youtubeLastSyncedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );
  console.log(
    "Cleared API key from playlist field. Put the key in Integrations → YouTube, then paste a playlist URL.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

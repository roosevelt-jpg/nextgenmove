/**
 * Ensure YouTube appears on Admin → Integrations and labels exist.
 * Run: npx tsx scripts/patch-youtube-integration.ts
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { stripUndefined } from "../src/lib/stripUndefined";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId:
          process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.FIREBASE_PROJECT_ID!,
        clientEmail:
          process.env.FIREBASE_ADMIN_CLIENT_EMAIL ??
          process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: (
          process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? process.env.FIREBASE_PRIVATE_KEY
        )!.replace(/\\n/g, "\n"),
      }),
    });
  }

  const db = getFirestore();

  const integrationRef = db.collection("integrations").doc("youtube");
  const existing = await integrationRef.get();
  if (!existing.exists) {
    await integrationRef.set(
      stripUndefined({
        id: "youtube",
        name: "YouTube",
        category: "Media",
        description:
          "YouTube Data API — sync a playlist into homepage Stories and paid portal video libraries.",
        iconUrl: "",
        status: "not_connected",
        connectedAt: null,
        config: { category: "Media" },
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );
    console.log("created integrations/youtube");
  } else {
    const data = existing.data() ?? {};
    await integrationRef.set(
      stripUndefined({
        name: "YouTube",
        category: "Media",
        description:
          "YouTube Data API — sync a playlist into homepage Stories and paid portal video libraries.",
        config: {
          ...((data.config as Record<string, string> | undefined) ?? {}),
          category: "Media",
        },
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );
    console.log("updated integrations/youtube metadata");
  }

  const settingsRef = db.collection("site_settings").doc("default");
  const settingsSnap = await settingsRef.get();
  const existingSettings = settingsSnap.data() ?? {};
  const adminPageLabels = {
    ...((existingSettings.adminPageLabels as Record<string, unknown>) || {}),
  };
  adminPageLabels.integrations = {
    ...((adminPageLabels.integrations as Record<string, string>) || {}),
    youtubeHint:
      "Connect a YouTube Data API key so Venturo can sync your playlist into homepage Stories and paid portal libraries.",
    youtubeApiKey: "YouTube Data API key",
    youtubeHelp:
      "Create a key in Google Cloud Console → APIs & Services → Credentials, enable YouTube Data API v3, then paste the key here. Playlist URL is set under Admin → Homepage Content.",
  };

  await settingsRef.set(
    stripUndefined({
      adminPageLabels,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true },
  );
  console.log("patched adminPageLabels.integrations YouTube labels");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

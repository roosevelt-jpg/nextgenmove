/**
 * Connect YouTube Data API + channel once, enable auto-sync, pull videos.
 *
 *   $env:YOUTUBE_API_KEY="AIza…"
 *   $env:YOUTUBE_CHANNEL_URL="https://www.youtube.com/@NextGenMove.official"
 *   npx tsx scripts/connect-youtube-channel.ts
 *
 * Do not commit API keys. Prefer rotating any key that was pasted in chat.
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { FieldValue } from "firebase-admin/firestore";
import { storeIntegrationSecret } from "../src/lib/admin/integration-secrets";
import { adminDb } from "../src/lib/firebase-admin";
import { syncYoutubePlaylistVideos } from "../src/lib/media/youtube-sync";
import { stripUndefined } from "../src/lib/stripUndefined";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

const CHANNEL =
  process.env.YOUTUBE_CHANNEL_URL?.trim() ||
  "https://www.youtube.com/@NextGenMove.official";
const API_KEY = process.env.YOUTUBE_API_KEY?.trim() || "";

async function main() {
  if (!API_KEY) {
    throw new Error("Set YOUTUBE_API_KEY in the environment (do not commit it).");
  }
  if (!CHANNEL.includes("youtube.com") && !CHANNEL.startsWith("@")) {
    throw new Error("YOUTUBE_CHANNEL_URL must be a youtube.com URL or @handle.");
  }

  await storeIntegrationSecret("youtube", { apiKey: API_KEY });

  await adminDb
    .collection("integrations")
    .doc("youtube")
    .set(
      stripUndefined({
        id: "youtube",
        name: "YouTube",
        category: "Media",
        description:
          "YouTube Data API — connect once with your API key and channel/@handle; Sync pulls videos into Stories and the portal library.",
        status: "connected",
        connectedAt: FieldValue.serverTimestamp(),
        config: {
          category: "Media",
          channelUrl: CHANNEL,
        },
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );

  await adminDb
    .collection("site_settings")
    .doc("default")
    .set(
      stripUndefined({
        youtubePlaylistUrl: CHANNEL,
        youtubeSyncEnabled: true,
        youtubeHomepageLimit: 12,
        youtubeLibraryLimit: 50,
        youtubeLastSyncError: null,
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );

  console.log("YouTube connected:", CHANNEL);
  console.log("Running sync…");
  const result = await syncYoutubePlaylistVideos();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

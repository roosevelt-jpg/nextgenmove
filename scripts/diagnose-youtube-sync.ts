/**
 * Diagnose YouTube channel resolution for site_settings.youtubePlaylistUrl.
 * Run: npx tsx scripts/diagnose-youtube-sync.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  getIntegrationSecrets,
  isIntegrationConnected,
} from "../src/lib/admin/integration-secrets";
import { resolveYoutubeChannel } from "../src/lib/media/youtube";

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
  const settings = (await db.collection("site_settings").doc("default").get()).data() ?? {};
  const raw = String(settings.youtubePlaylistUrl ?? "").trim();
  console.log("youtubePlaylistUrl=", raw || "(empty)");
  console.log("youtubeSyncEnabled=", settings.youtubeSyncEnabled !== false);
  console.log("lastError=", settings.youtubeLastSyncError ?? null);

  const connected = await isIntegrationConnected("youtube");
  const secrets = await getIntegrationSecrets("youtube");
  const apiKey = secrets.apiKey?.trim() || process.env.YOUTUBE_API_KEY?.trim() || "";
  console.log("youtubeConnected=", connected);
  console.log("apiKeyPresent=", Boolean(apiKey), "len=", apiKey.length);

  if (!apiKey || !raw) {
    console.log("Cannot probe further without API key + channel.");
    return;
  }

  const resolved = await resolveYoutubeChannel(apiKey, raw);
  console.log("resolved=", resolved);

  if (!resolved?.channelId) {
    console.log("Channel not resolved.");
    return;
  }

  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("channelId", resolved.channelId);
  searchUrl.searchParams.set("order", "date");
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("maxResults", "10");
  searchUrl.searchParams.set("key", apiKey);
  const searchRes = await fetch(searchUrl);
  const searchBody = await searchRes.text();
  console.log("searchStatus=", searchRes.status);
  console.log("searchBody=", searchBody.slice(0, 1200));

  if (resolved.uploadsPlaylistId) {
    const plUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    plUrl.searchParams.set("part", "snippet,status");
    plUrl.searchParams.set("playlistId", resolved.uploadsPlaylistId);
    plUrl.searchParams.set("maxResults", "10");
    plUrl.searchParams.set("key", apiKey);
    const plRes = await fetch(plUrl);
    const plBody = await plRes.text();
    console.log("playlistStatus=", plRes.status);
    console.log("playlistBody=", plBody.slice(0, 800));
  }

  const cards = await db.collection("video_cards").limit(20).get();
  console.log(
    "video_cards=",
    cards.docs.map((d) => ({
      id: d.id,
      title: d.data().title,
      status: d.data().status,
      source: d.data().source,
    })),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

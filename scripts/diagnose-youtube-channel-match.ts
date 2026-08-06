/**
 * Find which channel owns yt_k5vl0Ilrej0 and list NextGenMove channel matches.
 * Run: npx tsx scripts/diagnose-youtube-channel-match.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getIntegrationSecrets } from "../src/lib/admin/integration-secrets";

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

  const secrets = await getIntegrationSecrets("youtube");
  const key = secrets.apiKey?.trim();
  if (!key) throw new Error("missing_youtube_api_key");

  const videoId = "k5vl0Ilrej0";
  const videoRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=${videoId}&key=${encodeURIComponent(key)}`,
  );
  const videoJson = (await videoRes.json()) as {
    items?: Array<{
      snippet?: {
        channelId?: string;
        channelTitle?: string;
        title?: string;
      };
      status?: { privacyStatus?: string };
    }>;
    error?: unknown;
  };
  console.log("videoStatus", videoRes.status);
  console.log(
    "video",
    JSON.stringify(
      {
        title: videoJson.items?.[0]?.snippet?.title,
        channelId: videoJson.items?.[0]?.snippet?.channelId,
        channelTitle: videoJson.items?.[0]?.snippet?.channelTitle,
        privacy: videoJson.items?.[0]?.status?.privacyStatus,
        error: videoJson.error ?? null,
      },
      null,
      2,
    ),
  );

  const channelId = videoJson.items?.[0]?.snippet?.channelId;
  if (channelId) {
    const chRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${encodeURIComponent(key)}`,
    );
    const chJson = (await chRes.json()) as {
      items?: Array<{
        id?: string;
        snippet?: { title?: string; customUrl?: string };
        statistics?: { videoCount?: string };
        contentDetails?: { relatedPlaylists?: { uploads?: string } };
      }>;
    };
    const ch = chJson.items?.[0];
    console.log(
      "ownerChannel",
      JSON.stringify(
        {
          id: ch?.id,
          title: ch?.snippet?.title,
          customUrl: ch?.snippet?.customUrl,
          videoCount: ch?.statistics?.videoCount,
          uploads: ch?.contentDetails?.relatedPlaylists?.uploads,
        },
        null,
        2,
      ),
    );

    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=10&key=${encodeURIComponent(key)}`,
    );
    const searchJson = (await searchRes.json()) as {
      pageInfo?: { totalResults?: number };
      items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string } }>;
    };
    console.log("ownerSearchTotal", searchJson.pageInfo?.totalResults ?? 0);
    console.log(
      "ownerVideos",
      (searchJson.items ?? []).map((i) => ({
        id: i.id?.videoId,
        title: i.snippet?.title,
      })),
    );
  }

  for (const q of ["NextGenMove", "@NextGenMove.official", "NextGen Move"]) {
    const sRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(q)}&maxResults=6&key=${encodeURIComponent(key)}`,
    );
    const sJson = (await sRes.json()) as {
      items?: Array<{
        id?: { channelId?: string };
        snippet?: { title?: string; customUrl?: string };
      }>;
    };
    console.log(
      "channelSearch",
      q,
      (sJson.items ?? []).map((i) => ({
        id: i.id?.channelId,
        title: i.snippet?.title,
        customUrl: i.snippet?.customUrl,
      })),
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

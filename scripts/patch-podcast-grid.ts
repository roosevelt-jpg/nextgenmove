/**
 * Ensure 6 live podcast episodes for the homepage 2×3 grid.
 * Run: npx tsx scripts/patch-podcast-grid.ts
 *
 * Upserts episodes only; admin can edit/replace titles anytime.
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { stripUndefined } from "../src/lib/stripUndefined";

config({ path: resolve(process.cwd(), ".env.local") });

const EPISODES = [
  {
    id: "demo_pod_12",
    episodeNumber: 12,
    title: "Negotiating your first Dubai offer",
    guestName: "Piotr Nowak",
    duration: "34 min",
  },
  {
    id: "demo_pod_11",
    episodeNumber: 11,
    title: "The paperwork nobody tells you about",
    guestName: "Amira Youssef",
    duration: "41 min",
  },
  {
    id: "demo_pod_10",
    episodeNumber: 10,
    title: "Why we built Track A and Track B",
    guestName: "Nextgenmove",
    duration: "28 min",
  },
  {
    id: "demo_pod_09",
    episodeNumber: 9,
    title: "Visa timelines that actually hold",
    guestName: "Nadia Rahman",
    duration: "32 min",
  },
  {
    id: "demo_pod_08",
    episodeNumber: 8,
    title: "What employers look for in the pool",
    guestName: "Omar Haddad",
    duration: "36 min",
  },
  {
    id: "demo_pod_07",
    episodeNumber: 7,
    title: "Credits, coaching, and your first ninety days",
    guestName: "Sofia Mendes",
    duration: "29 min",
  },
];

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
  for (const episode of EPISODES) {
    await db
      .collection("podcast_episodes")
      .doc(episode.id)
      .set(
        stripUndefined({
          ...episode,
          audioUrl: "https://example.com/demo-episode.mp3",
          description:
            "Homepage podcast episode — edit in Admin → Content → Podcast.",
          status: "live",
          updatedAt: FieldValue.serverTimestamp(),
        }),
        { merge: true },
      );
  }
  console.log(`upserted ${EPISODES.length} live podcast episodes`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

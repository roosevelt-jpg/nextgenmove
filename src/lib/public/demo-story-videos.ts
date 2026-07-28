import type { VideoCardDocument } from "@/types/cms";

/**
 * Homepage-only placeholders when `video_cards` has no live items.
 * Never written to Firestore — replaced automatically once real videos are live.
 */
export const FALLBACK_DEMO_STORY_VIDEOS: VideoCardDocument[] = [
  {
    id: "demo-story-1",
    title: "Sample candidate story",
    subtitle: "Demo · Sync YouTube to replace",
    videoUrl: "https://www.youtube.com/watch?v=LXb3EKWsInQ",
    youtubeVideoId: "LXb3EKWsInQ",
    thumbnailUrl: "https://i.ytimg.com/vi/LXb3EKWsInQ/hqdefault.jpg",
    duration: "0:45",
    position: 1,
    status: "live",
    source: "demo",
  },
  {
    id: "demo-story-2",
    title: "Sample coach check-in",
    subtitle: "Demo · Sync YouTube to replace",
    videoUrl: "https://www.youtube.com/watch?v=C0DPdy98e4c",
    youtubeVideoId: "C0DPdy98e4c",
    thumbnailUrl: "https://i.ytimg.com/vi/C0DPdy98e4c/hqdefault.jpg",
    duration: "0:32",
    position: 2,
    status: "live",
    source: "demo",
  },
  {
    id: "demo-story-3",
    title: "Sample arrival day",
    subtitle: "Demo · Sync YouTube to replace",
    videoUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
    youtubeVideoId: "aqz-KE-bpKQ",
    thumbnailUrl: "https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg",
    duration: "0:58",
    position: 3,
    status: "live",
    source: "demo",
  },
  {
    id: "demo-story-4",
    title: "Sample visa-ready path",
    subtitle: "Demo · Sync YouTube to replace",
    videoUrl: "https://www.youtube.com/watch?v=ScMzIvxBSi4",
    youtubeVideoId: "ScMzIvxBSi4",
    thumbnailUrl: "https://i.ytimg.com/vi/ScMzIvxBSi4/hqdefault.jpg",
    duration: "0:41",
    position: 4,
    status: "live",
    source: "demo",
  },
  {
    id: "demo-story-5",
    title: "Sample employer intro",
    subtitle: "Demo · Sync YouTube to replace",
    videoUrl: "https://www.youtube.com/watch?v=hY7m5jjJ9mM",
    youtubeVideoId: "hY7m5jjJ9mM",
    thumbnailUrl: "https://i.ytimg.com/vi/hY7m5jjJ9mM/hqdefault.jpg",
    duration: "0:36",
    position: 5,
    status: "live",
    source: "demo",
  },
];

export function resolveHomeStoryCards(
  liveCards: VideoCardDocument[],
): VideoCardDocument[] {
  if (liveCards.length > 0) return liveCards;
  return FALLBACK_DEMO_STORY_VIDEOS;
}

export function isDemoStoryCards(cards: VideoCardDocument[]): boolean {
  return cards.length > 0 && cards.every((card) => card.source === "demo");
}

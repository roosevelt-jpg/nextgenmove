import { describe, expect, it } from "vitest";
import { hasActivePaidPlan } from "@/lib/access/paid-plan";
import { selectRotatingHomepageWindow } from "@/lib/media/homepage-video-rotation";
import {
  formatYoutubeDuration,
  parseYoutubePlaylistId,
  parseYoutubeVideoId,
  youtubeEmbedUrl,
} from "@/lib/media/youtube";

describe("parseYoutubeVideoId", () => {
  it("parses watch, short, and embed URLs", () => {
    expect(parseYoutubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
    expect(parseYoutubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseYoutubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
    expect(parseYoutubeVideoId("https://youtube.com/shorts/k5vI0llrej0")).toBe(
      "k5vI0llrej0",
    );
    expect(parseYoutubeVideoId("https://www.youtube.com/shorts/k5vI0llrej0")).toBe(
      "k5vI0llrej0",
    );
  });

  it("returns null for non-youtube urls", () => {
    expect(parseYoutubeVideoId("https://example.com/video")).toBeNull();
  });
});

describe("parseYoutubePlaylistId", () => {
  it("parses playlist URLs and raw ids", () => {
    expect(
      parseYoutubePlaylistId(
        "https://www.youtube.com/playlist?list=PLrAXtmRdnEQy6nuLMOVuF4bT1W1n6Q0p",
      ),
    ).toBe("PLrAXtmRdnEQy6nuLMOVuF4bT1W1n6Q0p");
    expect(parseYoutubePlaylistId("PLrAXtmRdnEQy6nuLMOVuF4bT1W1n6Q0p")).toBe(
      "PLrAXtmRdnEQy6nuLMOVuF4bT1W1n6Q0p",
    );
  });

  it("rejects Google API keys pasted as playlist ids", () => {
    expect(
      parseYoutubePlaylistId("AIzaSyDWUXIlmNDEXARng1xYovwCP4XcbVp5kxU"),
    ).toBeNull();
    expect(
      parseYoutubePlaylistId("AlzaSyDWUXIlmNDEXARng1xYovwCP4XcbVp5kxU"),
    ).toBeNull();
  });

  it("returns null for invalid input", () => {
    expect(parseYoutubePlaylistId("")).toBeNull();
    expect(parseYoutubePlaylistId("https://example.com")).toBeNull();
  });
});

describe("formatYoutubeDuration", () => {
  it("formats ISO durations", () => {
    expect(formatYoutubeDuration("PT1H2M3S")).toBe("1:02:03");
    expect(formatYoutubeDuration("PT15M4S")).toBe("15:04");
    expect(formatYoutubeDuration("PT45S")).toBe("0:45");
  });
});

describe("youtubeEmbedUrl", () => {
  it("builds embed url", () => {
    expect(youtubeEmbedUrl("dQw4w9WgXcQ")).toContain("embed/dQw4w9WgXcQ");
  });
});

describe("selectRotatingHomepageWindow", () => {
  const items = Array.from({ length: 30 }, (_, i) => i);
  const day0 = 0;
  const day1 = 24 * 60 * 60 * 1000;

  it("returns all items when library fits the window", () => {
    expect(selectRotatingHomepageWindow([1, 2, 3], 12, day0)).toEqual([1, 2, 3]);
  });

  it("advances the window once per UTC day", () => {
    expect(selectRotatingHomepageWindow(items, 12, day0)).toEqual(
      items.slice(0, 12),
    );
    expect(selectRotatingHomepageWindow(items, 12, day1)).toEqual(
      items.slice(12, 24),
    );
  });

  it("wraps when the day window crosses the end of the library", () => {
    const day2 = 2 * 24 * 60 * 60 * 1000;
    expect(selectRotatingHomepageWindow(items, 12, day2)).toEqual([
      24, 25, 26, 27, 28, 29, 0, 1, 2, 3, 4, 5,
    ]);
  });
});

describe("hasActivePaidPlan", () => {
  it("requires active status and track plan", () => {
    expect(
      hasActivePaidPlan({ plan: "track_a", subscriptionStatus: "active" }),
    ).toBe(true);
    expect(
      hasActivePaidPlan({ plan: "track_b", subscriptionStatus: "active" }),
    ).toBe(true);
    expect(
      hasActivePaidPlan({ plan: "track_a", subscriptionStatus: "pending" }),
    ).toBe(false);
    expect(
      hasActivePaidPlan({ plan: null, subscriptionStatus: "active" }),
    ).toBe(false);
  });
});

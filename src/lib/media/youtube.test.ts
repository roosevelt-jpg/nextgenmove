import { describe, expect, it } from "vitest";
import { hasActivePaidPlan } from "@/lib/access/paid-plan";
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

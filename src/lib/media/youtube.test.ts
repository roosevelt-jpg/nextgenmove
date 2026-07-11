import { describe, expect, it } from "vitest";
import { parseYoutubeVideoId, youtubeEmbedUrl } from "@/lib/media/youtube";

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

describe("youtubeEmbedUrl", () => {
  it("builds embed url", () => {
    expect(youtubeEmbedUrl("dQw4w9WgXcQ")).toContain("embed/dQw4w9WgXcQ");
  });
});

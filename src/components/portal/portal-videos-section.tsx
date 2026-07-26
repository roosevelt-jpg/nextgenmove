"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/ui";
import { YoutubeEmbed } from "@/components/media/youtube-embed";
import { cn } from "@/lib/utils";

export interface PortalVideoItem {
  id: string;
  title: string;
  subtitle: string;
  videoUrl: string;
  duration: string;
  thumbnailUrl: string;
}

interface PortalVideosSectionProps {
  apiPath: "/api/student/videos" | "/api/employer/videos";
  labels: Record<string, string>;
  /** Where the locked-state upgrade CTA should navigate. */
  upgradeHref?: string;
}

export function PortalVideosSection({
  apiPath,
  labels,
  upgradeHref,
}: PortalVideosSectionProps) {
  const [access, setAccess] = useState<
    "loading" | "locked" | "granted" | "error"
  >("loading");
  const [videos, setVideos] = useState<PortalVideoItem[]>([]);
  const [active, setActive] = useState<PortalVideoItem | null>(null);

  const load = useCallback(async () => {
    setAccess("loading");
    try {
      const res = await fetch(apiPath);
      if (res.status === 401 || res.status === 403) {
        setAccess("locked");
        setVideos([]);
        return;
      }
      if (!res.ok) {
        setAccess("error");
        setVideos([]);
        return;
      }
      const payload = (await res.json()) as {
        access: "locked" | "granted";
        videos: PortalVideoItem[];
      };
      setAccess(payload.access === "granted" ? "granted" : "locked");
      setVideos(payload.videos ?? []);
    } catch {
      setAccess("error");
      setVideos([]);
    }
  }, [apiPath]);

  useEffect(() => {
    void load();
  }, [load]);

  if (access === "loading") {
    return null;
  }

  const upgradeLabel =
    labels.videosUpgradeCta ||
    (upgradeHref ? "Upgrade plan →" : "");

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        {labels.videosTitle ? (
          <h2 className="font-serif text-xl text-text-primary">
            {labels.videosTitle}
          </h2>
        ) : null}
        {labels.videosSubtitle ? (
          <p className="text-sm text-text-secondary">{labels.videosSubtitle}</p>
        ) : null}
      </div>

      {access === "error" ? (
        <div className="rounded-radius border border-border bg-grad-card px-4 py-5">
          <p className="text-sm text-text-warning" role="alert">
            {labels.videosLoadError || "Could not load videos."}
          </p>
          <button
            type="button"
            className="mt-2 text-sm font-semibold text-fill-accent"
            onClick={() => void load()}
          >
            {labels.retry || "Retry"}
          </button>
        </div>
      ) : access === "locked" ? (
        <div className="rounded-radius border border-border bg-grad-card px-4 py-5">
          <p className="text-sm text-text-secondary">
            {labels.videosLocked ??
              "Private video materials unlock with an active Track A or Track B subscription."}
          </p>
          {upgradeHref && upgradeLabel ? (
            <Link
              href={upgradeHref}
              className="mt-2 inline-block text-sm font-medium text-text-accent hover:underline"
            >
              {upgradeLabel}
            </Link>
          ) : upgradeLabel ? (
            <p className="mt-2 text-sm font-medium text-text-accent">
              {upgradeLabel}
            </p>
          ) : null}
        </div>
      ) : videos.length === 0 ? (
        <p className="text-sm text-text-muted">
          {labels.videosEmpty ?? "No videos yet."}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video, index) => (
            <button
              key={video.id}
              type="button"
              onClick={() => setActive(video)}
              className="overflow-hidden rounded-radius border border-border bg-grad-card text-left transition-opacity hover:opacity-95"
            >
              <div
                className={cn(
                  "relative aspect-[16/10]",
                  !video.thumbnailUrl && "bg-fill-accent",
                )}
                style={
                  video.thumbnailUrl
                    ? {
                        backgroundImage: `url(${video.thumbnailUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : {
                        background:
                          index % 3 === 1
                            ? "linear-gradient(135deg, #27500A, #9A6A3C)"
                            : index % 3 === 2
                              ? "linear-gradient(135deg, #8B3A3A, #4B3F9C)"
                              : "linear-gradient(135deg, #4B3F9C, #C97A2E)",
                      }
                }
              >
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-1 text-sm text-fill-accent shadow-sm">
                    ▶
                  </span>
                </span>
                {video.duration ? (
                  <span className="absolute bottom-2 right-2 rounded bg-fill-primary/70 px-1.5 py-0.5 font-mono text-[10px] text-on-primary">
                    {video.duration}
                  </span>
                ) : null}
              </div>
              <div className="space-y-0.5 px-3 py-2.5">
                {video.title ? (
                  <p className="text-sm font-semibold text-text-primary">
                    {video.title}
                  </p>
                ) : null}
                {video.subtitle ? (
                  <p className="text-xs text-text-secondary">{video.subtitle}</p>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(active)}
        onClose={() => setActive(null)}
        title={active?.title}
      >
        {active ? (
          <div className="space-y-3">
            <YoutubeEmbed
              url={active.videoUrl}
              title={active.title}
              watchLabel={labels.videosWatch ?? active.title}
            />
            {active.subtitle ? (
              <p className="text-sm text-text-secondary">{active.subtitle}</p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </section>
  );
}

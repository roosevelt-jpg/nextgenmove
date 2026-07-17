"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminEntityModal } from "@/components/admin/admin-entity-modal";
import type { AdminEntitySchema } from "@/lib/admin/entity-schemas";
import type { TaxonomiesDocument } from "@/types/cms";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  looksLikeGoogleApiKey,
  parseYoutubePlaylistId,
} from "@/lib/media/youtube";

function formatSyncTimestamp(value: string): string {
  if (!value || value === "[object Object]") return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function mapYoutubeSyncError(
  error: string | undefined,
  labels: Record<string, string>,
): string {
  if (!error) return labels.youtubeSyncFailed ?? "Sync failed";
  const key = error.split(":")[0] ?? error;
  const mapped =
    labels[`youtube_error_${key}`] ||
    labels[key] ||
    (key === "playlist_looks_like_api_key"
      ? labels.playlist_looks_like_api_key
      : key === "missing_or_invalid_playlist"
        ? labels.missing_or_invalid_playlist
        : key === "missing_youtube_api_key"
          ? labels.missing_youtube_api_key
          : null);
  if (mapped) return mapped;
  if (error.startsWith("youtube_api_400")) {
    return (
      labels.youtube_error_invalid_playlist ||
      "Invalid playlist. Use a playlist URL (youtube.com/playlist?list=PL…) — put the API key under Integrations → YouTube."
    );
  }
  return error;
}

interface MediaRow {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  thumbLabel: string;
  thumbClass: string;
}

interface YoutubeSyncState {
  youtubePlaylistUrl: string;
  youtubeSyncEnabled: boolean;
  youtubeHomepageLimit: number;
  youtubeLibraryLimit: number;
  youtubeLastSyncedAt: string;
  youtubeLastSyncError: string;
}

interface AdminHomepageMediaViewProps {
  labels: Record<string, string>;
  formLabels: Record<string, string>;
  taxonomies: TaxonomiesDocument;
  videoSchema: AdminEntitySchema;
  podcastSchema: AdminEntitySchema;
  initialYoutube?: Partial<YoutubeSyncState>;
}

const emptyYoutube: YoutubeSyncState = {
  youtubePlaylistUrl: "",
  youtubeSyncEnabled: true,
  youtubeHomepageLimit: 3,
  youtubeLibraryLimit: 12,
  youtubeLastSyncedAt: "",
  youtubeLastSyncError: "",
};

export function AdminHomepageMediaView({
  labels,
  formLabels,
  taxonomies,
  videoSchema,
  podcastSchema,
  initialYoutube,
}: AdminHomepageMediaViewProps) {
  const [videos, setVideos] = useState<MediaRow[]>([]);
  const [podcasts, setPodcasts] = useState<MediaRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [schema, setSchema] = useState<AdminEntitySchema>(videoSchema);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [youtube, setYoutube] = useState<YoutubeSyncState>({
    ...emptyYoutube,
    ...initialYoutube,
  });
  const [syncBusy, setSyncBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [vRes, pRes, sRes] = await Promise.all([
      fetch(`/api/admin/data/${videoSchema.collection}`),
      fetch(`/api/admin/data/${podcastSchema.collection}`),
      fetch("/api/admin/data/site_settings/default"),
    ]);
    if (vRes.ok) {
      const payload = (await vRes.json()) as { items: Record<string, unknown>[] };
      setVideos(
        (payload.items ?? []).map((item, index) => ({
          id: String(item.id),
          title: String(item.title ?? ""),
          subtitle: [
            item.source === "youtube_playlist"
              ? labels.youtubeSourceBadge ?? "YouTube"
              : null,
            item.attribution ?? item.subtitle,
            item.duration,
            item.position != null ? `Position ${item.position}` : null,
          ]
            .filter(Boolean)
            .join(" · "),
          status: String(item.status ?? "draft"),
          thumbLabel: "▶",
          thumbClass:
            index % 3 === 0
              ? "from-[#4B3F9C] to-[#C97A2E]"
              : index % 3 === 1
                ? "from-[#27500A] to-[#9A6A3C]"
                : "from-[#8B3A3A] to-[#4B3F9C]",
        })),
      );
    }
    if (pRes.ok) {
      const payload = (await pRes.json()) as { items: Record<string, unknown>[] };
      setPodcasts(
        (payload.items ?? []).map((item) => ({
          id: String(item.id),
          title: String(item.title ?? ""),
          subtitle: [
            item.guestName ? `with ${item.guestName}` : null,
            item.duration,
          ]
            .filter(Boolean)
            .join(" · "),
          status: String(item.status ?? "draft"),
          thumbLabel: item.episodeNumber
            ? `EP${item.episodeNumber}`
            : "EP",
          thumbClass: "from-[#3C3489] to-[#C97A2E]",
        })),
      );
    }
    if (sRes.ok) {
      const payload = (await sRes.json()) as { item: Record<string, unknown> };
      const item = payload.item ?? {};
      setYoutube({
        youtubePlaylistUrl: String(item.youtubePlaylistUrl ?? ""),
        youtubeSyncEnabled: item.youtubeSyncEnabled !== false,
        youtubeHomepageLimit: Number(item.youtubeHomepageLimit ?? 3) || 3,
        youtubeLibraryLimit: Number(item.youtubeLibraryLimit ?? 12) || 12,
        youtubeLastSyncedAt: formatSyncTimestamp(
          String(item.youtubeLastSyncedAt ?? ""),
        ),
        youtubeLastSyncError: String(item.youtubeLastSyncError ?? ""),
      });
    }
  }, [
    labels.youtubeSourceBadge,
    podcastSchema.collection,
    videoSchema.collection,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = (next: AdminEntitySchema) => {
    setSchema(next);
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = async (next: AdminEntitySchema, id: string) => {
    const res = await fetch(`/api/admin/data/${next.collection}/${id}`);
    if (!res.ok) return;
    const payload = (await res.json()) as { item: Record<string, unknown> };
    setSchema(next);
    setEditing(payload.item);
    setModalOpen(true);
  };

  const saveYoutubeSettings = async (): Promise<boolean> => {
    setSaveBusy(true);
    setSyncMessage(null);
    try {
      const playlist = youtube.youtubePlaylistUrl.trim();
      if (looksLikeGoogleApiKey(playlist)) {
        setSyncMessage(
          labels.playlist_looks_like_api_key ||
            "That looks like a Google API key. Put the API key in Integrations → YouTube, and paste a playlist URL or PL… id here.",
        );
        return false;
      }
      if (playlist && !parseYoutubePlaylistId(playlist)) {
        setSyncMessage(
          labels.missing_or_invalid_playlist ||
            "Enter a YouTube playlist URL or id (starts with PL…).",
        );
        return false;
      }
      const res = await fetch("/api/admin/data/site_settings/default", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtubePlaylistUrl: playlist,
          youtubeSyncEnabled: youtube.youtubeSyncEnabled,
          youtubeHomepageLimit: youtube.youtubeHomepageLimit,
          youtubeLibraryLimit: youtube.youtubeLibraryLimit,
        }),
      });
      if (!res.ok) {
        setSyncMessage(labels.youtubeSaveFailed ?? "Could not save settings.");
        return false;
      }
      setSyncMessage(labels.youtubeSaveOk ?? "Playlist settings saved.");
      await load();
      return true;
    } finally {
      setSaveBusy(false);
    }
  };

  const runSyncNow = async () => {
    setSyncBusy(true);
    setSyncMessage(null);
    try {
      const saved = await saveYoutubeSettings();
      if (!saved) return;
      const res = await fetch("/api/admin/youtube/sync", { method: "POST" });
      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        upserted?: number;
        archived?: number;
        error?: string;
        skipped?: boolean;
        reason?: string;
      };
      if (!res.ok || payload.ok === false) {
        setSyncMessage(mapYoutubeSyncError(payload.error, labels));
      } else if (payload.skipped) {
        setSyncMessage(
          `${labels.youtubeSyncSkipped ?? "Sync skipped"} (${payload.reason ?? ""})`,
        );
      } else {
        setSyncMessage(
          (labels.youtubeSyncOk ?? "Synced {count} videos").replace(
            "{count}",
            String(payload.upserted ?? 0),
          ),
        );
      }
      await load();
    } finally {
      setSyncBusy(false);
    }
  };

  const liveVideos = videos.filter((v) => v.status === "live").length;
  const livePodcasts = podcasts.filter((p) => p.status === "live").length;

  const deleteItem = async (
    schema: AdminEntitySchema,
    id: string,
  ): Promise<boolean> => {
    const confirmed = window.confirm(
      labels.deleteConfirm ?? "Delete this item? This cannot be undone.",
    );
    if (!confirmed) return false;
    const response = await fetch(`/api/admin/data/${schema.collection}/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setSyncMessage(labels.deleteError ?? "Could not delete.");
      return false;
    }
    await load();
    return true;
  };

  return (
    <div className="space-y-5">
      <p className="text-[13px] text-text-secondary">
        {labels.videosTab ?? "Video cards"} ({liveVideos} {labels.liveCount ?? "live"})
        {" · "}
        {labels.podcastTab ?? "Podcast episodes"} ({livePodcasts}{" "}
        {labels.liveCount ?? "live"})
      </p>

      <section className="rounded-radius border border-border bg-grad-card p-4 space-y-3">
        <h2 className="text-[14.5px] font-bold text-text-primary">
          {labels.youtubeSyncTitle ?? "YouTube playlist sync"}
        </h2>
        <p className="text-[12.5px] text-text-secondary">
          {labels.youtubeSyncBody ??
            "Paste a playlist URL (youtube.com/playlist?list=PL…). Connect the YouTube Data API key under Integrations → YouTube, then Sync now."}
        </p>
        <label className="block space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-text-label">
            {labels.youtubePlaylistUrl ?? "Playlist URL or ID"}
          </span>
          <input
            type="text"
            placeholder={
              labels.youtubePlaylistPlaceholder ||
              "https://www.youtube.com/playlist?list=PL…"
            }
            value={youtube.youtubePlaylistUrl}
            onChange={(e) =>
              setYoutube((prev) => ({
                ...prev,
                youtubePlaylistUrl: e.target.value,
              }))
            }
            className="w-full rounded-radius-sm border border-border bg-surface-1 px-3 py-2 text-sm text-text-primary"
          />
        </label>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={youtube.youtubeSyncEnabled}
              onChange={(e) =>
                setYoutube((prev) => ({
                  ...prev,
                  youtubeSyncEnabled: e.target.checked,
                }))
              }
            />
            {labels.youtubeSyncEnabled ?? "Sync enabled"}
          </label>
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <span className="text-text-secondary">
              {labels.youtubeHomepageLimit ?? "Homepage cards"}
            </span>
            <input
              type="number"
              min={1}
              max={12}
              value={youtube.youtubeHomepageLimit}
              onChange={(e) =>
                setYoutube((prev) => ({
                  ...prev,
                  youtubeHomepageLimit: Number(e.target.value) || 3,
                }))
              }
              className="w-16 rounded-radius-sm border border-border bg-surface-1 px-2 py-1 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <span className="text-text-secondary">
              {labels.youtubeLibraryLimit ?? "Library size"}
            </span>
            <input
              type="number"
              min={1}
              max={50}
              value={youtube.youtubeLibraryLimit}
              onChange={(e) =>
                setYoutube((prev) => ({
                  ...prev,
                  youtubeLibraryLimit: Number(e.target.value) || 12,
                }))
              }
              className="w-16 rounded-radius-sm border border-border bg-surface-1 px-2 py-1 text-sm"
            />
          </label>
        </div>
        {(formatSyncTimestamp(youtube.youtubeLastSyncedAt) ||
          youtube.youtubeLastSyncError) && (
          <p className="text-[11.5px] text-text-muted">
            {formatSyncTimestamp(youtube.youtubeLastSyncedAt)
              ? `${labels.youtubeLastSynced ?? "Last synced"}: ${formatSyncTimestamp(youtube.youtubeLastSyncedAt)}`
              : null}
            {youtube.youtubeLastSyncError
              ? ` · ${labels.youtubeLastError ?? "Error"}: ${mapYoutubeSyncError(youtube.youtubeLastSyncError, labels)}`
              : null}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={saveBusy} onClick={() => void saveYoutubeSettings()}>
            {saveBusy
              ? labels.youtubeSaving ?? "Saving…"
              : labels.youtubeSave ?? "Save playlist settings"}
          </Button>
          <Button size="sm" disabled={syncBusy} onClick={() => void runSyncNow()}>
            {syncBusy
              ? labels.youtubeSyncing ?? "Syncing…"
              : labels.youtubeSyncNow ?? "Sync now"}
          </Button>
        </div>
        {syncMessage ? (
          <p className="text-[12.5px] text-text-secondary">{syncMessage}</p>
        ) : null}
      </section>

      <section className="rounded-radius border border-border bg-grad-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[14.5px] font-bold text-text-primary">
            {labels.videosTitle ?? "Video cards"}
          </h2>
          <Button size="sm" onClick={() => openCreate(videoSchema)}>
            {labels.addVideo ?? "+ Add video card"}
          </Button>
        </div>
        <ul className="space-y-2">
          {videos.map((item) => (
            <li
              key={item.id}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-radius border border-border bg-grad-card px-3 py-2.5",
                item.status !== "live" && "opacity-60",
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-14 shrink-0 items-center justify-center rounded-md bg-gradient-to-br text-white text-sm",
                  item.thumbClass,
                )}
              >
                {item.thumbLabel}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-text-primary">{item.title}</p>
                <p className="text-[11.5px] text-text-secondary">{item.subtitle}</p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold",
                  item.status === "live"
                    ? "bg-bg-success text-text-success"
                    : "bg-surface-2 text-text-secondary",
                )}
              >
                {item.status === "live"
                  ? labels.status_live ?? "Live"
                  : labels.status_draft ?? "Draft"}
              </span>
              <Button
                size="xs"
                variant="outline"
                onClick={() => void openEdit(videoSchema, item.id)}
              >
                {labels.edit ?? "Edit"}
              </Button>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => void deleteItem(videoSchema, item.id)}
              >
                {labels.delete ?? "Delete"}
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-radius border border-border bg-grad-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[14.5px] font-bold text-text-primary">
            {labels.podcastTitle ?? "Podcast episodes"}
          </h2>
          <Button size="sm" onClick={() => openCreate(podcastSchema)}>
            {labels.addEpisode ?? "+ Add episode"}
          </Button>
        </div>
        <ul className="space-y-2">
          {podcasts.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-3 rounded-radius border border-border bg-grad-card px-3 py-2.5"
            >
              <div
                className={cn(
                  "flex h-9 w-14 shrink-0 items-center justify-center rounded-md bg-gradient-to-br font-mono text-[10px] font-bold text-white",
                  item.thumbClass,
                )}
              >
                {item.thumbLabel}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-text-primary">{item.title}</p>
                <p className="text-[11.5px] text-text-secondary">{item.subtitle}</p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold",
                  item.status === "live"
                    ? "bg-bg-success text-text-success"
                    : "bg-surface-2 text-text-secondary",
                )}
              >
                {item.status === "live"
                  ? labels.status_live ?? "Live"
                  : labels.status_draft ?? "Draft"}
              </span>
              <Button
                size="xs"
                variant="outline"
                onClick={() => void openEdit(podcastSchema, item.id)}
              >
                {labels.edit ?? "Edit"}
              </Button>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => void deleteItem(podcastSchema, item.id)}
              >
                {labels.delete ?? "Delete"}
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-radius border border-border bg-grad-card p-4">
        <h2 className="mb-2 text-[14px] font-bold text-text-primary">
          {labels.connectTitle ?? "How this connects to the public site"}
        </h2>
        <p className="text-[12.5px] leading-relaxed text-text-secondary">
          {labels.connectBody ??
            "The homepage Stories and The Move Podcast sections query video_cards and podcast_episodes filtered to status = live, ordered by position / episode_number. Toggling an item to Draft removes it from the live site immediately."}
        </p>
      </section>

      <AdminEntityModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        schema={schema}
        entityId={editing ? String(editing.id) : null}
        initialValues={editing ?? {}}
        labels={{
          ...formLabels,
          ...labels,
          cancel: labels.cancel || formLabels.cancel || "Cancel",
          save: labels.save || formLabels.save || "Save",
          createTitle: labels.createTitle || formLabels.createTitle || "Create",
          editTitle: labels.editTitle || formLabels.editTitle || "Edit",
        }}
        taxonomies={taxonomies}
        onSaved={load}
      />
    </div>
  );
}

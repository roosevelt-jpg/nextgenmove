"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminEntityModal } from "@/components/admin/admin-entity-modal";
import type { AdminEntitySchema } from "@/lib/admin/entity-schemas";
import type { TaxonomiesDocument } from "@/types/cms";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface MediaRow {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  thumbLabel: string;
  thumbClass: string;
}

interface AdminHomepageMediaViewProps {
  labels: Record<string, string>;
  formLabels: Record<string, string>;
  taxonomies: TaxonomiesDocument;
  videoSchema: AdminEntitySchema;
  podcastSchema: AdminEntitySchema;
}

export function AdminHomepageMediaView({
  labels,
  formLabels,
  taxonomies,
  videoSchema,
  podcastSchema,
}: AdminHomepageMediaViewProps) {
  const [videos, setVideos] = useState<MediaRow[]>([]);
  const [podcasts, setPodcasts] = useState<MediaRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [schema, setSchema] = useState<AdminEntitySchema>(videoSchema);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    const [vRes, pRes] = await Promise.all([
      fetch(`/api/admin/data/${videoSchema.collection}`),
      fetch(`/api/admin/data/${podcastSchema.collection}`),
    ]);
    if (vRes.ok) {
      const payload = (await vRes.json()) as { items: Record<string, unknown>[] };
      setVideos(
        (payload.items ?? []).map((item, index) => ({
          id: String(item.id),
          title: String(item.title ?? ""),
          subtitle: [
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
  }, [podcastSchema.collection, videoSchema.collection]);

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

  const liveVideos = videos.filter((v) => v.status === "live").length;
  const livePodcasts = podcasts.filter((p) => p.status === "live").length;

  return (
    <div className="space-y-5">
      <p className="text-[13px] text-text-secondary">
        {labels.videosTab ?? "Video cards"} ({liveVideos} {labels.liveCount ?? "live"})
        {" · "}
        {labels.podcastTab ?? "Podcast episodes"} ({livePodcasts}{" "}
        {labels.liveCount ?? "live"})
      </p>

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
        labels={formLabels}
        taxonomies={taxonomies}
        onSaved={load}
      />
    </div>
  );
}

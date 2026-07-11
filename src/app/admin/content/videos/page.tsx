import { AdminHomepageMediaView } from "@/components/admin/admin-homepage-media-view";
import { ENTITY_SCHEMAS } from "@/lib/admin/entity-schemas";
import { getSiteSettings } from "@/lib/collections/site-settings";
import { getTaxonomies } from "@/lib/collections/taxonomies";

export default async function AdminHomepageVideosPage() {
  const [settings, taxonomies] = await Promise.all([
    getSiteSettings(),
    getTaxonomies(),
  ]);
  const labels = settings.adminPageLabels?.content ?? settings.formLabels ?? {};

  return (
    <AdminHomepageMediaView
      labels={labels}
      formLabels={settings.formLabels ?? {}}
      taxonomies={taxonomies}
      videoSchema={ENTITY_SCHEMAS.video_cards!}
      podcastSchema={ENTITY_SCHEMAS.podcast_episodes!}
    />
  );
}

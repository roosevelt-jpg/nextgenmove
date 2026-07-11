import { revalidatePath } from "next/cache";
import { ENTITY_SCHEMAS, isAdminCollection } from "@/lib/admin/entity-schemas";

const COLLECTION_REVALIDATE_PATHS: Record<string, string[]> = {
  program_levers: ["/pricing", "/tracks", "/credits", "/employer/profile"],
  page_home: ["/"],
  video_cards: ["/"],
  podcast_episodes: ["/"],
  page_about: ["/about"],
  page_how_it_works: ["/how-it-works"],
  page_pricing: ["/pricing"],
  page_tracks: ["/tracks"],
  job_postings: ["/careers"],
  articles: ["/journal"],
  content_items: ["/credits", "/student/store"],
  public_roles: ["/careers-talent"],
  companies: ["/employer/profile"],
  site_settings: [
    "/",
    "/about",
    "/pricing",
    "/how-it-works",
    "/credits",
    "/request-talent",
    "/careers-talent",
    "/journal",
    "/careers",
    "/tracks",
    "/sign-in",
    "/sign-up",
  ],
  cms_pages: ["/pages"],
  cms_forms: ["/forms"],
};

export function revalidateAdminCollection(collection: string) {
  const paths = COLLECTION_REVALIDATE_PATHS[collection] ?? [];

  for (const path of paths) {
    revalidatePath(path);
  }
}

export function getEntitySchema(collection: string) {
  if (!isAdminCollection(collection)) {
    return null;
  }

  return ENTITY_SCHEMAS[collection] ?? null;
}

export function isSingletonCollection(collection: string) {
  return Boolean(getEntitySchema(collection)?.singletonId);
}

export function getSingletonDocId(collection: string) {
  return getEntitySchema(collection)?.singletonId ?? "default";
}

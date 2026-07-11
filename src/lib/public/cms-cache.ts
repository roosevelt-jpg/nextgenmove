import { unstable_cache } from "next/cache";

const PUBLIC_REVALIDATE_SECONDS = 120;

/**
 * Cache successful CMS reads only. Empty/error results throw so Next keeps any
 * previous good entry instead of poisoning the Data Cache with blanks (which
 * emptied the public homepage during Firestore quota outages).
 */
export async function cachedPublicCms<T>({
  key,
  tags,
  load,
  isValid,
  fallback,
  revalidate = PUBLIC_REVALIDATE_SECONDS,
}: {
  key: string[];
  tags: string[];
  load: () => Promise<T>;
  isValid: (value: T) => boolean;
  fallback: T;
  revalidate?: number;
}): Promise<T> {
  const cached = unstable_cache(
    async () => {
      const value = await load();
      if (!isValid(value)) {
        throw new Error(`cms_invalid:${key.join("/")}`);
      }
      return value;
    },
    // v4: full homepage shell merge (stories / podcast / CTAs / testimonial).
    [...key, "v4"],
    { revalidate, tags },
  );

  try {
    return await cached();
  } catch {
    try {
      const live = await load();
      if (isValid(live)) return live;
    } catch {
      // Firestore still unavailable
    }
    return fallback;
  }
}

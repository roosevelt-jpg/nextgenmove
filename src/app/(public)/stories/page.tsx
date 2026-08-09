import { HomeTalentStoriesSection } from "@/components/public/home-talent-stories-section";
import { getPublishedTalentStories } from "@/lib/collections/talent-stories";
import { getPageHome } from "@/lib/collections/pages";

export const revalidate = 60;

export default async function StoriesPage() {
  const [page, stories] = await Promise.all([
    getPageHome(),
    getPublishedTalentStories(48),
  ]);

  return (
    <div className="pb-10">
      <HomeTalentStoriesSection page={page} items={stories} />
    </div>
  );
}

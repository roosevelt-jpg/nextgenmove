import Image from "next/image";
import { RichText } from "@/components/public/rich-text";
import { StatBlocksSection } from "@/components/public/stat-blocks-section";
import { getPageAbout } from "@/lib/collections/pages";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function AboutPage() {
  const [page, settings] = await Promise.all([getPageAbout(), getSiteSettings()]);
  const pageLabels = settings.pageLabels ?? {};

  return (
    <div className="space-y-16">
      {(page?.heroHeadline || page?.heroSubtext) && (
        <section className="space-y-4">
          {page?.heroHeadline ? (
            <h1 className="font-serif text-4xl text-text-primary">{page.heroHeadline}</h1>
          ) : null}
          {page?.heroSubtext ? (
            <p className="max-w-2xl text-lg text-text-secondary">{page.heroSubtext}</p>
          ) : null}
        </section>
      )}

      {page?.missionBody ? (
        <section>
          {pageLabels.missionTitle ? (
            <h2 className="mb-4 font-serif text-2xl text-text-primary">
              {pageLabels.missionTitle}
            </h2>
          ) : null}
          <RichText html={page.missionBody} />
        </section>
      ) : null}

      <StatBlocksSection statBlocks={page?.statBlocks} />

      {page?.teamMembers?.length ? (
        <section className="space-y-6">
          {pageLabels.teamTitle ? (
            <h2 className="font-serif text-2xl text-text-primary">{pageLabels.teamTitle}</h2>
          ) : null}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {page.teamMembers.map((member) => (
              <article
                key={`${member.name}-${member.role}`}
                className="rounded-radius border border-border bg-surface-1 p-5"
              >
                {member.photo ? (
                  <Image
                    src={member.photo}
                    alt={member.name}
                    width={320}
                    height={320}
                    className="mb-4 aspect-square w-full rounded-radius object-cover"
                  />
                ) : null}
                <h3 className="font-serif text-xl text-text-primary">{member.name}</h3>
                {member.role ? (
                  <p className="mt-1 text-sm text-text-muted">{member.role}</p>
                ) : null}
                {member.bio ? (
                  <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                    {member.bio}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {page?.foundingStory ? (
        <section>
          {pageLabels.foundingStoryTitle ? (
            <h2 className="mb-4 font-serif text-2xl text-text-primary">
              {pageLabels.foundingStoryTitle}
            </h2>
          ) : null}
          <RichText html={page.foundingStory} />
        </section>
      ) : null}
    </div>
  );
}

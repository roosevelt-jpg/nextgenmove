import Image from "next/image";
import { RichText } from "@/components/public/rich-text";
import { StatBlocksSection } from "@/components/public/stat-blocks-section";
import { SectionEyebrow } from "@/components/ui";
import { getPageAbout } from "@/lib/collections/pages";
import { getSiteSettings } from "@/lib/collections/site-settings";

export default async function AboutPage() {
  const [page, settings] = await Promise.all([getPageAbout(), getSiteSettings()]);
  const pageLabels = settings.pageLabels ?? {};

  return (
    <div className="page-section space-y-10">
      {(page?.heroHeadline || page?.heroSubtext) && (
        <section className="max-w-3xl space-y-3">
          {pageLabels.aboutEyebrow ? (
            <SectionEyebrow>{pageLabels.aboutEyebrow}</SectionEyebrow>
          ) : null}
          {page?.heroHeadline ? (
            <h1 className="font-serif text-3xl text-text-primary md:text-4xl">
              {page.heroHeadline}
            </h1>
          ) : null}
          {page?.heroSubtext ? (
            <p className="text-sm leading-relaxed text-text-secondary sm:text-base">
              {page.heroSubtext}
            </p>
          ) : null}
        </section>
      )}

      {page?.missionBody ? (
        <section className="max-w-3xl">
          {pageLabels.missionTitle ? (
            <SectionEyebrow className="mb-4">{pageLabels.missionTitle}</SectionEyebrow>
          ) : null}
          <RichText html={page.missionBody} />
        </section>
      ) : null}

      <StatBlocksSection statBlocks={page?.statBlocks} valueTone />

      {page?.teamMembers?.length ? (
        <section className="space-y-8">
          {pageLabels.teamTitle ? (
            <SectionEyebrow>{pageLabels.teamTitle}</SectionEyebrow>
          ) : null}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {page.teamMembers.map((member) => (
              <article key={`${member.name}-${member.role}`} className="space-y-4">
                {member.photo ? (
                  <Image
                    src={member.photo}
                    alt={member.name}
                    width={420}
                    height={480}
                    className="aspect-[4/5] w-full rounded-radius object-cover"
                  />
                ) : (
                  <div className="aspect-[4/5] w-full rounded-radius bg-gradient-to-br from-brand-indigo-1 to-brand-amber-2" />
                )}
                {member.role ? (
                  <p className="font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
                    {member.role}
                  </p>
                ) : null}
                <h3 className="font-serif text-xl text-text-primary">{member.name}</h3>
                {member.bio ? (
                  <p className="text-sm leading-relaxed text-text-secondary">
                    {member.bio}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {page?.foundingStory ? (
        <section className="max-w-3xl">
          {pageLabels.foundingStoryTitle ? (
            <SectionEyebrow className="mb-4">
              {pageLabels.foundingStoryTitle}
            </SectionEyebrow>
          ) : null}
          <RichText html={page.foundingStory} />
        </section>
      ) : null}
    </div>
  );
}

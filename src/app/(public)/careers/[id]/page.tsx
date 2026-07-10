import { notFound } from "next/navigation";
import { CareersApplicationForm } from "@/components/public/careers-application-form";
import { RichText } from "@/components/public/rich-text";
import { getJobPosting } from "@/lib/collections/pages";
import { getSiteSettings } from "@/lib/collections/site-settings";
import { getTaxonomies, getTaxonomyLabel } from "@/lib/collections/taxonomies";

export default async function CareerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [job, settings, taxonomies] = await Promise.all([
    getJobPosting(id),
    getSiteSettings(),
    getTaxonomies(),
  ]);

  if (!job) {
    notFound();
  }

  const formLabels = settings.formLabels ?? {};

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <h1 className="font-serif text-4xl text-text-primary">{job.title}</h1>
        <p className="text-sm text-text-muted">
          {getTaxonomyLabel(taxonomies, "department", job.department)}
          {job.location ? ` · ${job.location}` : null}
          {job.employmentType
            ? ` · ${getTaxonomyLabel(taxonomies, "employmentType", job.employmentType)}`
            : null}
        </p>
      </header>

      {job.description ? <RichText html={job.description} /> : null}

      <section>
        {formLabels.applicationSectionTitle ? (
          <h2 className="mb-4 font-serif text-2xl text-text-primary">
            {formLabels.applicationSectionTitle}
          </h2>
        ) : null}
        <CareersApplicationForm job={job} labels={formLabels} />
      </section>
    </div>
  );
}

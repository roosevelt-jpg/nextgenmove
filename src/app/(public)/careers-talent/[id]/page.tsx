import { notFound } from "next/navigation";
import { RoleInterestForm } from "@/components/public/role-interest-form";
import { RichText } from "@/components/public/rich-text";
import { Badge } from "@/components/ui";
import { getPublicRole } from "@/lib/collections/pages";
import { getSiteSettings } from "@/lib/collections/site-settings";
import { getTaxonomies, getTaxonomyLabel } from "@/lib/collections/taxonomies";

export default async function PublicRoleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [role, settings, taxonomies] = await Promise.all([
    getPublicRole(id),
    getSiteSettings(),
    getTaxonomies(),
  ]);

  if (!role) {
    notFound();
  }

  const formLabels = settings.formLabels ?? {};

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="font-serif text-4xl text-text-primary">{role.title}</h1>
          {role.relocationSupport && formLabels.relocationBadge ? (
            <Badge variant="accent">{formLabels.relocationBadge}</Badge>
          ) : null}
        </div>
        <p className="text-sm text-text-muted">{role.employerLabel}</p>
        <p className="text-sm text-text-secondary">
          {role.location}
          {role.sector
            ? ` · ${getTaxonomyLabel(taxonomies, "sector", role.sector)}`
            : null}
          {role.seniority
            ? ` · ${getTaxonomyLabel(taxonomies, "seniority", role.seniority)}`
            : null}
        </p>
      </header>

      {role.description ? <RichText html={role.description} /> : null}

      <section>
        {formLabels.interestSectionTitle ? (
          <h2 className="mb-4 font-serif text-2xl text-text-primary">
            {formLabels.interestSectionTitle}
          </h2>
        ) : null}
        <RoleInterestForm role={role} labels={formLabels} />
      </section>
    </div>
  );
}

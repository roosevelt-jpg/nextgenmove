import Link from "next/link";
import { AdminSingletonEditor } from "@/components/admin/admin-singleton-editor";
import { ENTITY_SCHEMAS } from "@/lib/admin/entity-schemas";
import { getSiteSettings } from "@/lib/collections/site-settings";
import { getTaxonomies } from "@/lib/collections/taxonomies";

export default async function AdminSiteSettingsPage() {
  const [settings, taxonomies] = await Promise.all([getSiteSettings(), getTaxonomies()]);
  const contentLabels = settings.adminPageLabels?.content ?? {};
  const settingsLabels = settings.adminPageLabels?.settings ?? {};
  const labels = {
    ...(settings.formLabels ?? {}),
    ...contentLabels,
    ...settingsLabels,
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        {labels.workspaceEyebrow ? (
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-text-accent">
            {labels.workspaceEyebrow}
          </p>
        ) : null}
        {labels.settingsTitle ? (
          <h1 className="font-serif text-3xl text-text-primary">{labels.settingsTitle}</h1>
        ) : null}
        {labels.workspaceSubtitle ? (
          <p className="text-sm text-text-secondary">{labels.workspaceSubtitle}</p>
        ) : null}
      </header>

      <section className="rounded-radius border border-border bg-surface-1 p-4">
        {labels.teamMembersTitle ? (
          <h2 className="mb-2 font-medium text-text-primary">{labels.teamMembersTitle}</h2>
        ) : null}
        {labels.teamMembersBody ? (
          <p className="mb-3 text-sm text-text-secondary">{labels.teamMembersBody}</p>
        ) : null}
        <Link
          href="/admin/users"
          className="text-sm font-medium text-text-accent hover:underline"
        >
          {labels.manageTeam ?? labels.users}
        </Link>
      </section>

      <section className="rounded-radius border border-border bg-surface-1 p-4">
        {labels.securityTitle ? (
          <h2 className="mb-2 font-medium text-text-primary">{labels.securityTitle}</h2>
        ) : null}
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4 border-b border-border py-2">
            <dt>
              <p className="font-medium text-text-primary">{labels.require2fa}</p>
              <p className="text-xs text-text-muted">{labels.require2faHelp}</p>
            </dt>
            <dd className="font-medium text-text-secondary">
              {settings.require2fa ? labels.toggleOn : labels.toggleOff}
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-2">
            <dt>
              <p className="font-medium text-text-primary">{labels.sessionExpireDays}</p>
              <p className="text-xs text-text-muted">{labels.sessionExpireHelp}</p>
            </dt>
            <dd className="font-medium text-text-secondary">
              {settings.sessionExpireDays ?? 5}
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-text-muted">{labels.securityEditHint}</p>
      </section>

      <section className="rounded-radius border border-border bg-surface-1 p-4">
        {labels.billingTitle ? (
          <h2 className="mb-2 font-medium text-text-primary">{labels.billingTitle}</h2>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium text-text-primary">
              {settings.operatorPlanLabel ?? labels.operatorPlanLabel}
            </p>
            <p className="text-xs text-text-muted">
              {settings.operatorPlanDetail ?? labels.operatorPlanDetail}
            </p>
          </div>
          {settings.billingManageUrl ? (
            <a
              href={settings.billingManageUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-radius-sm border border-fill-primary px-3 py-1.5 text-sm font-medium text-text-primary"
            >
              {labels.manageBilling}
            </a>
          ) : null}
        </div>
      </section>

      <AdminSingletonEditor
        labels={labels}
        formLabels={labels}
        taxonomies={taxonomies}
        schema={ENTITY_SCHEMAS.site_settings!}
        title={labels.editWorkspace ?? labels.edit}
      />
    </div>
  );
}

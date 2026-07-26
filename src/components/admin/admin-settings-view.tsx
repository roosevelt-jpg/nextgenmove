"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { AdminSecurityControls } from "@/components/admin/admin-security-controls";
import {
  AdminSettingsFieldsForm,
  type SettingsFieldDef,
} from "@/components/admin/admin-settings-fields-form";
import { AdminSocialLinksEditor } from "@/components/admin/admin-social-links-editor";
import { labelOr } from "@/lib/portal/nav-label-defaults";
import { cn } from "@/lib/utils";
import type { SocialLink } from "@/types/cms";

type SettingsSection =
  | "brand"
  | "contact"
  | "social"
  | "security"
  | "media"
  | "billing"
  | "team";

const SECTION_FALLBACKS: Record<SettingsSection, string> = {
  brand: "Brand",
  contact: "Contact",
  social: "Social",
  security: "Security",
  media: "Media",
  billing: "Billing",
  team: "Team",
};

interface AdminSettingsViewProps {
  labels: Record<string, string>;
  settings: {
    siteName?: string;
    tagline?: string;
    siteDescription?: string;
    brandMark?: string;
    logoUrl?: string;
    faviconUrl?: string;
    defaultMetaTitle?: string;
    defaultMetaDescription?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactAddress?: string;
    timezone?: string;
    defaultCurrency?: string;
    require2fa?: boolean;
    googleSignInEnabled?: boolean;
    sessionExpireDays?: number;
    operatorPlanLabel?: string;
    operatorPlanDetail?: string;
    billingManageUrl?: string;
    youtubePlaylistUrl?: string;
    youtubeSyncEnabled?: boolean;
    youtubeHomepageLimit?: number;
    youtubeLibraryLimit?: number;
    youtubeLastSyncedAt?: string | null;
    youtubeLastSyncError?: string | null;
    socialLinks?: SocialLink[];
  };
}

type WorkspaceSettings = AdminSettingsViewProps["settings"];

const BRAND_FIELDS: SettingsFieldDef[] = [
  { key: "siteName", kind: "text", labelKey: "siteName" },
  { key: "brandMark", kind: "text", labelKey: "brandMark" },
  { key: "tagline", kind: "text", labelKey: "tagline" },
  { key: "timezone", kind: "text", labelKey: "timezone" },
  { key: "defaultCurrency", kind: "text", labelKey: "defaultCurrency" },
  {
    key: "siteDescription",
    kind: "textarea",
    labelKey: "siteDescription",
  },
  { key: "logoUrl", kind: "image", labelKey: "logoUrl" },
  { key: "faviconUrl", kind: "image", labelKey: "faviconUrl" },
  { key: "defaultMetaTitle", kind: "text", labelKey: "defaultMetaTitle" },
  {
    key: "defaultMetaDescription",
    kind: "textarea",
    labelKey: "defaultMetaDescription",
  },
];

const CONTACT_FIELDS: SettingsFieldDef[] = [
  { key: "contactEmail", kind: "text", labelKey: "contactEmail" },
  { key: "contactPhone", kind: "text", labelKey: "contactPhone" },
  { key: "contactAddress", kind: "textarea", labelKey: "contactAddress" },
];

const MEDIA_FIELDS: SettingsFieldDef[] = [
  {
    key: "youtubePlaylistUrl",
    kind: "url",
    labelKey: "youtubePlaylistUrl",
  },
  {
    key: "youtubeSyncEnabled",
    kind: "boolean",
    labelKey: "youtubeSyncEnabled",
  },
  {
    key: "youtubeHomepageLimit",
    kind: "number",
    labelKey: "youtubeHomepageLimit",
  },
  {
    key: "youtubeLibraryLimit",
    kind: "number",
    labelKey: "youtubeLibraryLimit",
  },
  {
    key: "youtubeLastSyncedAt",
    kind: "text",
    labelKey: "youtubeLastSyncedAt",
    readOnly: true,
  },
  {
    key: "youtubeLastSyncError",
    kind: "text",
    labelKey: "youtubeLastSyncError",
    readOnly: true,
  },
];

const BILLING_FIELDS: SettingsFieldDef[] = [
  { key: "operatorPlanLabel", kind: "text", labelKey: "operatorPlanLabel" },
  { key: "operatorPlanDetail", kind: "text", labelKey: "operatorPlanDetail" },
  { key: "billingManageUrl", kind: "url", labelKey: "billingManageUrl" },
];

export function AdminSettingsView({ labels, settings }: AdminSettingsViewProps) {
  const [section, setSection] = useState<SettingsSection>("brand");
  const [workspace, setWorkspace] = useState<WorkspaceSettings>(settings);

  const mergeWorkspace = useCallback(
    (patch: Record<string, string | number | boolean | null | SocialLink[]>) => {
      setWorkspace((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  const nav = useMemo(
    () =>
      [
        {
          id: "brand" as const,
          label: labelOr(labels.settingsNavBrand, SECTION_FALLBACKS.brand),
        },
        {
          id: "contact" as const,
          label: labelOr(labels.settingsNavContact, SECTION_FALLBACKS.contact),
        },
        {
          id: "social" as const,
          label: labelOr(labels.settingsNavSocial, SECTION_FALLBACKS.social),
        },
        {
          id: "security" as const,
          label: labelOr(labels.settingsNavSecurity, SECTION_FALLBACKS.security),
        },
        {
          id: "media" as const,
          label: labelOr(labels.settingsNavMedia, SECTION_FALLBACKS.media),
        },
        {
          id: "billing" as const,
          label: labelOr(labels.settingsNavBilling, SECTION_FALLBACKS.billing),
        },
        {
          id: "team" as const,
          label: labelOr(labels.settingsNavTeam, SECTION_FALLBACKS.team),
        },
      ] as const,
    [labels],
  );

  const activeMeta = nav.find((item) => item.id === section);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        {labels.workspaceEyebrow ? (
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-text-label">
            {labels.workspaceEyebrow}
          </p>
        ) : null}
        {labels.settingsTitle ? (
          <h1 className="font-serif text-3xl text-text-primary md:text-4xl">
            {labels.settingsTitle}
          </h1>
        ) : null}
        {labels.workspaceSubtitle ? (
          <p className="max-w-xl text-sm text-text-secondary">
            {labels.workspaceSubtitle}
          </p>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
        <nav
          aria-label={labels.settingsNavAria}
          className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible"
        >
          {nav.map((item) => {
            const active = item.id === section;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={cn(
                  "shrink-0 rounded-radius-sm px-3 py-2 text-left text-sm font-medium transition-colors",
                  active
                    ? "bg-grad-rouse text-on-gradient shadow-sm"
                    : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 space-y-4">
          {activeMeta?.label ? (
            <div className="border-b border-border pb-3">
              <h2 className="font-serif text-xl text-text-primary">
                {activeMeta.label}
              </h2>
              {section === "brand" && labels.settingsBrandHelp ? (
                <p className="mt-1 text-sm text-text-secondary">
                  {labels.settingsBrandHelp}
                </p>
              ) : null}
              {section === "contact" && labels.settingsContactHelp ? (
                <p className="mt-1 text-sm text-text-secondary">
                  {labels.settingsContactHelp}
                </p>
              ) : null}
              {section === "social" && labels.socialLinksHelp ? (
                <p className="mt-1 text-sm text-text-secondary">
                  {labels.socialLinksHelp}
                </p>
              ) : null}
              {section === "media" && labels.settingsMediaHelp ? (
                <p className="mt-1 text-sm text-text-secondary">
                  {labels.settingsMediaHelp}
                </p>
              ) : null}
            </div>
          ) : null}

          <section className="rounded-radius border border-border bg-grad-card p-4 sm:p-5">
            {/* Keep panels mounted so tab switches do not wipe drafts or stale RSC props. */}
            <div className={section === "brand" ? "block" : "hidden"}>
              <AdminSettingsFieldsForm
                labels={labels}
                fields={BRAND_FIELDS}
                onSaved={mergeWorkspace}
                initialValues={{
                  siteName: workspace.siteName,
                  brandMark: workspace.brandMark,
                  tagline: workspace.tagline,
                  timezone: workspace.timezone,
                  defaultCurrency: workspace.defaultCurrency,
                  siteDescription: workspace.siteDescription,
                  logoUrl: workspace.logoUrl,
                  faviconUrl: workspace.faviconUrl,
                  defaultMetaTitle: workspace.defaultMetaTitle,
                  defaultMetaDescription: workspace.defaultMetaDescription,
                }}
              />
            </div>

            <div className={section === "contact" ? "block" : "hidden"}>
              <AdminSettingsFieldsForm
                labels={labels}
                fields={CONTACT_FIELDS}
                onSaved={mergeWorkspace}
                initialValues={{
                  contactEmail: workspace.contactEmail,
                  contactPhone: workspace.contactPhone,
                  contactAddress: workspace.contactAddress,
                }}
              />
            </div>

            <div className={section === "social" ? "block" : "hidden"}>
              <AdminSocialLinksEditor
                labels={labels}
                initialLinks={workspace.socialLinks ?? []}
                onSaved={(socialLinks) => mergeWorkspace({ socialLinks })}
              />
            </div>

            <div className={section === "security" ? "block" : "hidden"}>
              <div className="space-y-6">
                <AdminSecurityControls
                  labels={labels}
                  initialRequire2fa={Boolean(workspace.require2fa)}
                  initialSessionExpireDays={Number(
                    workspace.sessionExpireDays ?? 5,
                  )}
                  onSaved={mergeWorkspace}
                />
                <AdminSettingsFieldsForm
                  labels={labels}
                  fields={[
                    {
                      key: "googleSignInEnabled",
                      kind: "boolean",
                      labelKey: "googleSignInEnabled",
                      helpKey: "googleSignInEnabledHelp",
                    },
                  ]}
                  onSaved={mergeWorkspace}
                  initialValues={{
                    googleSignInEnabled: workspace.googleSignInEnabled,
                  }}
                />
              </div>
            </div>

            <div className={section === "media" ? "block" : "hidden"}>
              <AdminSettingsFieldsForm
                labels={labels}
                fields={MEDIA_FIELDS}
                onSaved={mergeWorkspace}
                initialValues={{
                  youtubePlaylistUrl: workspace.youtubePlaylistUrl,
                  youtubeSyncEnabled: workspace.youtubeSyncEnabled,
                  youtubeHomepageLimit: workspace.youtubeHomepageLimit,
                  youtubeLibraryLimit: workspace.youtubeLibraryLimit,
                  youtubeLastSyncedAt: workspace.youtubeLastSyncedAt,
                  youtubeLastSyncError: workspace.youtubeLastSyncError,
                }}
              />
            </div>

            <div className={section === "billing" ? "block" : "hidden"}>
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-radius-sm border border-border bg-surface-1/50 px-3 py-3">
                  <div>
                    <p className="font-medium text-text-primary">
                      {workspace.operatorPlanLabel ?? labels.operatorPlanLabel}
                    </p>
                    <p className="text-xs text-text-muted">
                      {workspace.operatorPlanDetail ?? labels.operatorPlanDetail}
                    </p>
                  </div>
                  {workspace.billingManageUrl ? (
                    <a
                      href={workspace.billingManageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-radius-sm bg-grad-rouse px-2.5 py-1 text-xs font-medium text-on-gradient hover:opacity-90"
                    >
                      {labels.manageBilling}
                    </a>
                  ) : null}
                </div>
                <AdminSettingsFieldsForm
                  labels={labels}
                  fields={BILLING_FIELDS}
                  onSaved={mergeWorkspace}
                  initialValues={{
                    operatorPlanLabel: workspace.operatorPlanLabel,
                    operatorPlanDetail: workspace.operatorPlanDetail,
                    billingManageUrl: workspace.billingManageUrl,
                  }}
                />
              </div>
            </div>

            <div className={section === "team" ? "block" : "hidden"}>
              <div className="space-y-3">
                {labels.teamMembersBody ? (
                  <p className="text-sm text-text-secondary">
                    {labels.teamMembersBody}
                  </p>
                ) : null}
                <Link
                  href="/admin/users"
                  className="inline-flex rounded-radius-sm bg-grad-rouse px-3 py-1.5 text-sm font-medium text-on-gradient hover:opacity-90"
                >
                  {labels.manageTeam ?? labels.users}
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminSecurityControls } from "@/components/admin/admin-security-controls";
import {
  AdminSettingsFieldsForm,
  type SettingsFieldDef,
} from "@/components/admin/admin-settings-fields-form";
import { AdminSocialLinksEditor } from "@/components/admin/admin-social-links-editor";
import type { SocialLink } from "@/types/cms";
import { cn } from "@/lib/utils";

export type SettingsTabId =
  | "brand"
  | "contact"
  | "social"
  | "security"
  | "billing"
  | "media"
  | "team";

interface AdminSettingsViewProps {
  labels: Record<string, string>;
  settings: Record<string, unknown>;
  socialLinks: SocialLink[];
}

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

const BILLING_FIELDS: SettingsFieldDef[] = [
  { key: "operatorPlanLabel", kind: "text", labelKey: "operatorPlanLabel" },
  { key: "operatorPlanDetail", kind: "text", labelKey: "operatorPlanDetail" },
  { key: "billingManageUrl", kind: "url", labelKey: "billingManageUrl" },
];

const MEDIA_FIELDS: SettingsFieldDef[] = [
  { key: "youtubePlaylistUrl", kind: "url", labelKey: "youtubePlaylistUrl" },
  {
    key: "youtubeSyncEnabled",
    kind: "boolean",
    labelKey: "youtubeSyncEnabled",
    helpKey: "youtubeSyncEnabledHelp",
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
    kind: "textarea",
    labelKey: "youtubeLastSyncError",
    readOnly: true,
  },
];

const SECURITY_EXTRA_FIELDS: SettingsFieldDef[] = [
  {
    key: "googleSignInEnabled",
    kind: "boolean",
    labelKey: "googleSignInEnabled",
    helpKey: "googleSignInEnabledHelp",
  },
];

function pickValues(
  settings: Record<string, unknown>,
  fields: SettingsFieldDef[],
) {
  const next: Record<string, string | number | boolean | null | undefined> = {};
  for (const field of fields) {
    next[field.key] = settings[field.key] as
      | string
      | number
      | boolean
      | null
      | undefined;
  }
  return next;
}

export function AdminSettingsView({
  labels,
  settings,
  socialLinks,
}: AdminSettingsViewProps) {
  const tabs = useMemo(
    () => [
      { id: "brand" as const, label: labels.tabBrand || "Brand" },
      { id: "contact" as const, label: labels.tabContact || "Contact" },
      { id: "social" as const, label: labels.tabSocial || "Social" },
      { id: "security" as const, label: labels.tabSecurity || "Security" },
      { id: "billing" as const, label: labels.tabBilling || "Billing" },
      { id: "media" as const, label: labels.tabMedia || "Media" },
      { id: "team" as const, label: labels.tabTeam || "Team" },
    ],
    [labels],
  );

  const [tab, setTab] = useState<SettingsTabId>("brand");

  const active = tabs.some((item) => item.id === tab) ? tab : tabs[0]?.id ?? "brand";

  const sectionCopy: Record<
    SettingsTabId,
    { title?: string; body?: string }
  > = {
    brand: { title: labels.brandSectionTitle, body: labels.brandSectionBody },
    contact: {
      title: labels.contactSectionTitle,
      body: labels.contactSectionBody,
    },
    social: {
      title: labels.socialMediaTitle,
      body: labels.socialLinksHelp,
    },
    security: {
      title: labels.securityTitle,
      body: labels.securitySectionBody,
    },
    billing: {
      title: labels.billingTitle,
      body: labels.billingSectionBody,
    },
    media: {
      title: labels.mediaSectionTitle,
      body: labels.mediaSectionBody,
    },
    team: {
      title: labels.teamMembersTitle,
      body: labels.teamMembersBody,
    },
  };

  const copy = sectionCopy[active];

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        {labels.workspaceEyebrow ? (
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-text-label">
            {labels.workspaceEyebrow}
          </p>
        ) : null}
        {labels.settingsTitle ? (
          <h1 className="font-serif text-3xl text-text-primary">
            {labels.settingsTitle}
          </h1>
        ) : null}
        {labels.workspaceSubtitle ? (
          <p className="max-w-2xl text-sm text-text-secondary">
            {labels.workspaceSubtitle}
          </p>
        ) : null}
      </header>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
        <nav
          aria-label={labels.settingsNavAria}
          className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
        >
          {tabs.map((item) => {
            const selected = item.id === active;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "shrink-0 rounded-radius px-3 py-2 text-left text-sm font-medium transition-colors",
                  selected
                    ? "bg-grad-rouse text-on-gradient shadow-sm"
                    : "text-text-secondary hover:bg-surface-1 hover:text-text-primary",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <section className="min-w-0 rounded-radius border border-border bg-grad-card p-5 sm:p-6">
          <div className="mb-6 space-y-1 border-b border-border pb-4">
            {copy.title ? (
              <h2 className="font-serif text-xl text-text-primary">{copy.title}</h2>
            ) : null}
            {copy.body ? (
              <p className="text-sm text-text-secondary">{copy.body}</p>
            ) : null}
          </div>

          {active === "brand" ? (
            <AdminSettingsFieldsForm
              labels={labels}
              fields={BRAND_FIELDS}
              initialValues={pickValues(settings, BRAND_FIELDS)}
            />
          ) : null}

          {active === "contact" ? (
            <AdminSettingsFieldsForm
              labels={labels}
              fields={CONTACT_FIELDS}
              initialValues={pickValues(settings, CONTACT_FIELDS)}
            />
          ) : null}

          {active === "social" ? (
            <AdminSocialLinksEditor
              labels={labels}
              initialLinks={socialLinks}
            />
          ) : null}

          {active === "security" ? (
            <div className="space-y-6">
              <AdminSecurityControls
                labels={labels}
                initialRequire2fa={Boolean(settings.require2fa)}
                initialSessionExpireDays={Number(settings.sessionExpireDays ?? 5)}
              />
              <AdminSettingsFieldsForm
                labels={labels}
                fields={SECURITY_EXTRA_FIELDS}
                initialValues={pickValues(settings, SECURITY_EXTRA_FIELDS)}
              />
            </div>
          ) : null}

          {active === "billing" ? (
            <AdminSettingsFieldsForm
              labels={labels}
              fields={BILLING_FIELDS}
              initialValues={pickValues(settings, BILLING_FIELDS)}
            />
          ) : null}

          {active === "media" ? (
            <AdminSettingsFieldsForm
              labels={labels}
              fields={MEDIA_FIELDS}
              initialValues={pickValues(settings, MEDIA_FIELDS)}
            />
          ) : null}

          {active === "team" ? (
            <div className="space-y-4">
              <Link
                href="/admin/users"
                className="inline-flex rounded-radius-sm bg-grad-rouse px-3 py-1.5 text-sm font-medium text-on-gradient hover:opacity-90"
              >
                {labels.manageTeam ?? labels.users}
              </Link>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

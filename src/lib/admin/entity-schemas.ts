import type { TaxonomiesDocument } from "@/types/cms";

export type AdminFieldType =
  | "text"
  | "textarea"
  | "richtext"
  | "select"
  | "multiselect"
  | "boolean"
  | "number"
  | "date"
  | "image"
  | "file"
  | "object"
  | "repeatable"
  | "keyvalue";

export interface AdminFieldSchema {
  key: string;
  type: AdminFieldType;
  labelKey: string;
  taxonomyKey?: keyof TaxonomiesDocument;
  required?: boolean;
  fields?: AdminFieldSchema[];
}

export interface AdminEntitySchema {
  collection: string;
  singletonId?: string;
  fields: AdminFieldSchema[];
}

export const ADMIN_COLLECTIONS = [
  "companies",
  "students",
  "job_postings",
  "articles",
  "public_roles",
  "content_items",
  "pipeline_stages",
  "integrations",
  "users",
  "page_home",
  "page_about",
  "page_how_it_works",
  "page_pricing",
  "page_tracks",
  "site_settings",
  "cms_pages",
  "cms_forms",
  "email_templates",
  "video_cards",
  "podcast_episodes",
] as const;

export type AdminCollection = (typeof ADMIN_COLLECTIONS)[number];

export function isAdminCollection(value: string): value is AdminCollection {
  return ADMIN_COLLECTIONS.includes(value as AdminCollection);
}

export const ENTITY_SCHEMAS: Record<string, AdminEntitySchema> = {
  companies: {
    collection: "companies",
    fields: [
      { key: "name", type: "text", labelKey: "name", required: true },
      { key: "contactName", type: "text", labelKey: "contactName" },
      { key: "contactEmail", type: "text", labelKey: "contactEmail", required: true },
      { key: "contactPhone", type: "text", labelKey: "contactPhone" },
      {
        key: "nationality",
        type: "select",
        labelKey: "nationality",
        taxonomyKey: "nationality",
      },
      { key: "industry", type: "text", labelKey: "industry" },
      { key: "website", type: "text", labelKey: "website" },
      { key: "logoUrl", type: "image", labelKey: "logoUrl" },
      { key: "hiringNeeds", type: "textarea", labelKey: "hiringNeeds" },
      {
        key: "plan",
        type: "select",
        labelKey: "plan",
        taxonomyKey: "preferredTrack",
      },
      {
        key: "subscriptionStatus",
        type: "select",
        labelKey: "subscriptionStatus",
      },
    ],
  },
  students: {
    collection: "students",
    fields: [
      { key: "fullName", type: "text", labelKey: "fullName", required: true },
      { key: "email", type: "text", labelKey: "email", required: true },
      { key: "phone", type: "text", labelKey: "phone" },
      {
        key: "nationality",
        type: "select",
        labelKey: "nationality",
        taxonomyKey: "nationality",
      },
      { key: "workExperience", type: "textarea", labelKey: "workExperience" },
      { key: "sector", type: "select", labelKey: "sector", taxonomyKey: "sector" },
      { key: "seniority", type: "select", labelKey: "seniority", taxonomyKey: "seniority" },
      { key: "currentCity", type: "text", labelKey: "currentCity" },
      { key: "bio", type: "textarea", labelKey: "bio" },
      { key: "skills", type: "multiselect", labelKey: "skills" },
      { key: "availability", type: "text", labelKey: "availability" },
      { key: "credits", type: "number", labelKey: "credits" },
      { key: "cvUrl", type: "file", labelKey: "cvUrl" },
      { key: "photoUrl", type: "image", labelKey: "photoUrl" },
      { key: "linkedinUrl", type: "text", labelKey: "linkedinUrl" },
      { key: "portfolioUrl", type: "text", labelKey: "portfolioUrl" },
      {
        key: "status",
        type: "select",
        labelKey: "status",
      },
    ],
  },
  job_postings: {
    collection: "job_postings",
    fields: [
      { key: "title", type: "text", labelKey: "title", required: true },
      { key: "department", type: "select", labelKey: "department", taxonomyKey: "department" },
      { key: "location", type: "text", labelKey: "location" },
      { key: "employmentType", type: "select", labelKey: "employmentType", taxonomyKey: "employmentType" },
      { key: "description", type: "richtext", labelKey: "description" },
      { key: "status", type: "select", labelKey: "status" },
    ],
  },
  articles: {
    collection: "articles",
    fields: [
      { key: "title", type: "text", labelKey: "title", required: true },
      { key: "slug", type: "text", labelKey: "slug" },
      { key: "coverImageUrl", type: "image", labelKey: "coverImageUrl" },
      { key: "excerpt", type: "textarea", labelKey: "excerpt" },
      { key: "body", type: "richtext", labelKey: "body" },
      { key: "author", type: "text", labelKey: "author" },
      { key: "category", type: "select", labelKey: "category", taxonomyKey: "category" },
      { key: "publishedDate", type: "date", labelKey: "publishedDate" },
      { key: "tags", type: "multiselect", labelKey: "tags" },
      { key: "status", type: "select", labelKey: "status" },
    ],
  },
  public_roles: {
    collection: "public_roles",
    fields: [
      { key: "title", type: "text", labelKey: "title", required: true },
      { key: "employerLabel", type: "text", labelKey: "employerLabel" },
      { key: "sector", type: "select", labelKey: "sector", taxonomyKey: "sector" },
      { key: "location", type: "text", labelKey: "location" },
      { key: "seniority", type: "select", labelKey: "seniority", taxonomyKey: "seniority" },
      { key: "relocationSupport", type: "boolean", labelKey: "relocationSupport" },
      { key: "description", type: "richtext", labelKey: "description" },
      { key: "status", type: "select", labelKey: "status" },
    ],
  },
  content_items: {
    collection: "content_items",
    fields: [
      { key: "title", type: "text", labelKey: "title", required: true },
      { key: "type", type: "select", labelKey: "type" },
      { key: "description", type: "textarea", labelKey: "description" },
      { key: "emojiIcon", type: "text", labelKey: "emojiIcon" },
      { key: "thumbnailUrl", type: "image", labelKey: "thumbnailUrl" },
      { key: "fileUrl", type: "file", labelKey: "fileUrl" },
      { key: "linkUrl", type: "text", labelKey: "linkUrl" },
      { key: "costCredits", type: "number", labelKey: "costCredits" },
      { key: "priceEur", type: "number", labelKey: "priceEur" },
      { key: "category", type: "select", labelKey: "category", taxonomyKey: "category" },
      { key: "status", type: "select", labelKey: "status" },
    ],
  },
  page_home: {
    collection: "page_home",
    singletonId: "default",
    fields: [
      { key: "eyebrowText", type: "text", labelKey: "eyebrowText" },
      { key: "headline", type: "text", labelKey: "headline" },
      { key: "headlineEmphasis", type: "text", labelKey: "headlineEmphasis" },
      { key: "subtext", type: "textarea", labelKey: "subtext" },
      { key: "ctaPrimaryLabel", type: "text", labelKey: "ctaPrimaryLabel" },
      { key: "ctaPrimaryHref", type: "text", labelKey: "ctaPrimaryHref" },
      { key: "ctaSecondaryLabel", type: "text", labelKey: "ctaSecondaryLabel" },
      { key: "ctaSecondaryHref", type: "text", labelKey: "ctaSecondaryHref" },
      { key: "hubLabel", type: "text", labelKey: "hubLabel" },
      { key: "currentRoutesLabel", type: "text", labelKey: "currentRoutesLabel" },
      {
        key: "currentRoutesItems",
        type: "repeatable",
        labelKey: "currentRoutesItems",
        fields: [
          { key: "code", type: "text", labelKey: "routeCode" },
          { key: "label", type: "text", labelKey: "routeLabel" },
        ],
      },
      {
        key: "routesMarquee",
        type: "object",
        labelKey: "routesMarquee",
        fields: [
          { key: "enabled", type: "boolean", labelKey: "marqueeEnabled" },
          { key: "speedSec", type: "number", labelKey: "marqueeSpeedSec" },
          { key: "direction", type: "select", labelKey: "marqueeDirection" },
          { key: "easing", type: "select", labelKey: "marqueeEasing" },
          { key: "pauseOnHover", type: "boolean", labelKey: "marqueePauseOnHover" },
          { key: "separator", type: "text", labelKey: "marqueeSeparator" },
        ],
      },
      { key: "globalReachEyebrow", type: "text", labelKey: "globalReachEyebrow" },
      { key: "globalReachHeadline", type: "text", labelKey: "globalReachHeadline" },
      { key: "globalReachBody", type: "textarea", labelKey: "globalReachBody" },
      {
        key: "corridorChips",
        type: "repeatable",
        labelKey: "corridorChips",
        fields: [{ key: "chip", type: "text", labelKey: "chip" }],
      },
      {
        key: "corridorChipsMarquee",
        type: "object",
        labelKey: "corridorChipsMarquee",
        fields: [
          { key: "enabled", type: "boolean", labelKey: "marqueeEnabled" },
          { key: "speedSec", type: "number", labelKey: "marqueeSpeedSec" },
          { key: "direction", type: "select", labelKey: "marqueeDirection" },
          { key: "easing", type: "select", labelKey: "marqueeEasing" },
          { key: "pauseOnHover", type: "boolean", labelKey: "marqueePauseOnHover" },
        ],
      },
      {
        key: "boardingPass",
        type: "object",
        labelKey: "boardingPass",
        fields: [
          { key: "routeLabel", type: "text", labelKey: "routeLabel" },
          { key: "passengerLabel", type: "text", labelKey: "passengerLabel" },
          { key: "passengerValue", type: "text", labelKey: "passengerValue" },
          { key: "coachLabel", type: "text", labelKey: "coachLabel" },
          { key: "coachValue", type: "text", labelKey: "coachValue" },
          { key: "statusLabel", type: "text", labelKey: "statusLabel" },
          { key: "statusValue", type: "text", labelKey: "statusValue" },
          { key: "classLabel", type: "text", labelKey: "classLabel" },
          { key: "classValue", type: "text", labelKey: "classValue" },
          { key: "refLabel", type: "text", labelKey: "refLabel" },
          { key: "refValue", type: "text", labelKey: "refValue" },
        ],
      },
      {
        key: "originCities",
        type: "repeatable",
        labelKey: "originCities",
        fields: [
          { key: "code", type: "text", labelKey: "code" },
          { key: "label", type: "text", labelKey: "label" },
          { key: "initials", type: "text", labelKey: "initials" },
          { key: "x", type: "number", labelKey: "x" },
          { key: "y", type: "number", labelKey: "y" },
          { key: "avatarX", type: "number", labelKey: "avatarX" },
          { key: "avatarY", type: "number", labelKey: "avatarY" },
        ],
      },
      { key: "itineraryEyebrow", type: "text", labelKey: "itineraryEyebrow" },
      { key: "itineraryHeadline", type: "text", labelKey: "itineraryHeadline" },
      { key: "storiesEyebrow", type: "text", labelKey: "storiesEyebrow" },
      { key: "storiesHeadline", type: "text", labelKey: "storiesHeadline" },
      { key: "storiesManagedLabel", type: "text", labelKey: "storiesManagedLabel" },
      { key: "podcastEyebrow", type: "text", labelKey: "podcastEyebrow" },
      { key: "podcastHeadline", type: "text", labelKey: "podcastHeadline" },
      { key: "podcastManagedLabel", type: "text", labelKey: "podcastManagedLabel" },
      {
        key: "steps",
        type: "repeatable",
        labelKey: "steps",
        fields: [
          { key: "legNumber", type: "number", labelKey: "legNumber" },
          { key: "phaseLabel", type: "text", labelKey: "phaseLabel" },
          { key: "title", type: "text", labelKey: "title" },
          { key: "description", type: "textarea", labelKey: "description" },
        ],
      },
      {
        key: "statBlocks",
        type: "repeatable",
        labelKey: "statBlocks",
        fields: [
          { key: "label", type: "text", labelKey: "label" },
          { key: "value", type: "text", labelKey: "value" },
          {
            key: "metric",
            type: "text",
            labelKey: "metric",
          },
          { key: "suffix", type: "text", labelKey: "suffix" },
        ],
      },
      { key: "testimonialQuote", type: "textarea", labelKey: "testimonialQuote" },
      {
        key: "testimonialAttribution",
        type: "text",
        labelKey: "testimonialAttribution",
      },
      { key: "testimonialBadge", type: "text", labelKey: "testimonialBadge" },
      {
        key: "talentCta",
        type: "object",
        labelKey: "talentCta",
        fields: [
          { key: "eyebrow", type: "text", labelKey: "eyebrow" },
          { key: "title", type: "text", labelKey: "title" },
          { key: "body", type: "textarea", labelKey: "body" },
          { key: "ctaLabel", type: "text", labelKey: "ctaLabel" },
          { key: "ctaHref", type: "text", labelKey: "ctaHref" },
        ],
      },
      {
        key: "companyCta",
        type: "object",
        labelKey: "companyCta",
        fields: [
          { key: "eyebrow", type: "text", labelKey: "eyebrow" },
          { key: "title", type: "text", labelKey: "title" },
          { key: "body", type: "textarea", labelKey: "body" },
          { key: "ctaLabel", type: "text", labelKey: "ctaLabel" },
          { key: "ctaHref", type: "text", labelKey: "ctaHref" },
        ],
      },
      {
        key: "rolesCta",
        type: "object",
        labelKey: "rolesCta",
        fields: [
          { key: "eyebrow", type: "text", labelKey: "eyebrow" },
          { key: "title", type: "text", labelKey: "title" },
          { key: "body", type: "textarea", labelKey: "body" },
          { key: "ctaLabel", type: "text", labelKey: "ctaLabel" },
          { key: "ctaHref", type: "text", labelKey: "ctaHref" },
        ],
      },
    ],
  },
  page_about: {
    collection: "page_about",
    singletonId: "default",
    fields: [
      { key: "heroHeadline", type: "text", labelKey: "heroHeadline" },
      { key: "heroSubtext", type: "text", labelKey: "heroSubtext" },
      { key: "missionBody", type: "richtext", labelKey: "missionBody" },
      {
        key: "statBlocks",
        type: "repeatable",
        labelKey: "statBlocks",
        fields: [
          { key: "label", type: "text", labelKey: "label" },
          { key: "value", type: "text", labelKey: "value" },
        ],
      },
      {
        key: "teamMembers",
        type: "repeatable",
        labelKey: "teamMembers",
        fields: [
          { key: "name", type: "text", labelKey: "name" },
          { key: "role", type: "text", labelKey: "role" },
          { key: "photo", type: "image", labelKey: "photo" },
          { key: "bio", type: "textarea", labelKey: "bio" },
        ],
      },
      { key: "foundingStory", type: "richtext", labelKey: "foundingStory" },
    ],
  },
  page_how_it_works: {
    collection: "page_how_it_works",
    singletonId: "default",
    fields: [
      {
        key: "steps",
        type: "repeatable",
        labelKey: "steps",
        fields: [
          { key: "legNumber", type: "number", labelKey: "legNumber" },
          { key: "phaseLabel", type: "text", labelKey: "phaseLabel" },
          { key: "title", type: "text", labelKey: "title" },
          { key: "description", type: "textarea", labelKey: "description" },
        ],
      },
      {
        key: "faqItems",
        type: "repeatable",
        labelKey: "faqItems",
        fields: [
          { key: "question", type: "text", labelKey: "question" },
          { key: "answer", type: "textarea", labelKey: "answer" },
        ],
      },
    ],
  },
  page_pricing: {
    collection: "page_pricing",
    singletonId: "default",
    fields: [
      { key: "trackAHeadline", type: "text", labelKey: "trackAHeadline" },
      { key: "trackAFeatures", type: "multiselect", labelKey: "trackAFeatures" },
      { key: "trackBHeadline", type: "text", labelKey: "trackBHeadline" },
      { key: "trackBFeatures", type: "multiselect", labelKey: "trackBFeatures" },
      {
        key: "faqItems",
        type: "repeatable",
        labelKey: "faqItems",
        fields: [
          { key: "question", type: "text", labelKey: "question" },
          { key: "answer", type: "textarea", labelKey: "answer" },
        ],
      },
      { key: "ctaLabel", type: "text", labelKey: "ctaLabel" },
    ],
  },
  page_tracks: {
    collection: "page_tracks",
    singletonId: "default",
    fields: [
      { key: "trackABody", type: "richtext", labelKey: "trackABody" },
      { key: "trackBBody", type: "richtext", labelKey: "trackBBody" },
      {
        key: "statBlocks",
        type: "repeatable",
        labelKey: "statBlocks",
        fields: [
          { key: "label", type: "text", labelKey: "label" },
          { key: "value", type: "text", labelKey: "value" },
          { key: "metric", type: "text", labelKey: "metric" },
          { key: "suffix", type: "text", labelKey: "suffix" },
        ],
      },
      {
        key: "comparisonRows",
        type: "repeatable",
        labelKey: "comparisonRows",
        fields: [
          { key: "feature", type: "text", labelKey: "feature" },
          { key: "trackAValue", type: "text", labelKey: "trackAValue" },
          { key: "trackBValue", type: "text", labelKey: "trackBValue" },
        ],
      },
      {
        key: "caseStudyQuote",
        type: "object",
        labelKey: "caseStudyQuote",
        fields: [
          { key: "quote", type: "textarea", labelKey: "caseStudyQuoteText" },
          { key: "companyName", type: "text", labelKey: "caseStudyCompany" },
          { key: "resultStat", type: "text", labelKey: "caseStudyStat" },
        ],
      },
      { key: "ctaLabel", type: "text", labelKey: "ctaLabel" },
      { key: "ctaHref", type: "text", labelKey: "ctaHref" },
    ],
  },
  site_settings: {
    collection: "site_settings",
    singletonId: "default",
    fields: [
      { key: "siteName", type: "text", labelKey: "siteName" },
      { key: "tagline", type: "text", labelKey: "tagline" },
      { key: "siteDescription", type: "textarea", labelKey: "siteDescription" },
      { key: "logoUrl", type: "image", labelKey: "logoUrl" },
      { key: "faviconUrl", type: "image", labelKey: "faviconUrl" },
      { key: "defaultMetaTitle", type: "text", labelKey: "defaultMetaTitle" },
      { key: "defaultMetaDescription", type: "textarea", labelKey: "defaultMetaDescription" },
      { key: "brandMark", type: "text", labelKey: "brandMark" },
      { key: "contactEmail", type: "text", labelKey: "contactEmail" },
      { key: "footerCopyright", type: "text", labelKey: "footerCopyright" },
      {
        key: "footerAttributionPrefix",
        type: "text",
        labelKey: "footerAttributionPrefix",
      },
      {
        key: "footerAttributionName",
        type: "text",
        labelKey: "footerAttributionName",
      },
      {
        key: "footerAttributionUrl",
        type: "text",
        labelKey: "footerAttributionUrl",
      },
      { key: "timezone", type: "text", labelKey: "timezone" },
      { key: "defaultCurrency", type: "text", labelKey: "defaultCurrency" },
      { key: "require2fa", type: "boolean", labelKey: "require2fa" },
      { key: "sessionExpireDays", type: "number", labelKey: "sessionExpireDays" },
      { key: "operatorPlanLabel", type: "text", labelKey: "operatorPlanLabel" },
      { key: "operatorPlanDetail", type: "text", labelKey: "operatorPlanDetail" },
      { key: "billingManageUrl", type: "text", labelKey: "billingManageUrl" },
      {
        key: "navLabels",
        type: "object",
        labelKey: "navLabels",
        fields: [
          { key: "siteName", type: "text", labelKey: "siteName" },
          { key: "howItWorks", type: "text", labelKey: "howItWorks" },
          { key: "forCompanies", type: "text", labelKey: "forCompanies" },
          { key: "pricing", type: "text", labelKey: "pricing" },
          { key: "signIn", type: "text", labelKey: "signIn" },
          { key: "headerCta", type: "text", labelKey: "headerCta" },
          { key: "headerCtaHref", type: "text", labelKey: "headerCtaHref" },
          { key: "about", type: "text", labelKey: "about" },
          { key: "careers", type: "text", labelKey: "careers" },
          { key: "journal", type: "text", labelKey: "journal" },
          { key: "browseRoles", type: "text", labelKey: "browseRoles" },
          { key: "credits", type: "text", labelKey: "credits" },
          { key: "tracks", type: "text", labelKey: "tracks" },
          { key: "requestTalent", type: "text", labelKey: "requestTalent" },
          { key: "companySection", type: "text", labelKey: "companySection" },
          { key: "talentSection", type: "text", labelKey: "talentSection" },
          { key: "employersSection", type: "text", labelKey: "employersSection" },
        ],
      },
      {
        key: "footerLinks",
        type: "repeatable",
        labelKey: "footerLinks",
        fields: [
          { key: "key", type: "text", labelKey: "footerGroupKey" },
          { key: "label", type: "text", labelKey: "footerGroupLabel" },
          {
            key: "links",
            type: "repeatable",
            labelKey: "footerGroupLinks",
            fields: [
              { key: "key", type: "text", labelKey: "footerLinkKey" },
              { key: "href", type: "text", labelKey: "footerLinkHref" },
              { key: "label", type: "text", labelKey: "footerLinkLabel" },
            ],
          },
        ],
      },
      { key: "pageLabels", type: "keyvalue", labelKey: "pageLabels" },
      { key: "formLabels", type: "keyvalue", labelKey: "formLabels" },
      { key: "authLabels", type: "keyvalue", labelKey: "authLabels" },
    ],
  },
  cms_pages: {
    collection: "cms_pages",
    fields: [
      { key: "title", type: "text", labelKey: "title", required: true },
      { key: "slug", type: "text", labelKey: "slug", required: true },
      { key: "eyebrow", type: "text", labelKey: "eyebrow" },
      { key: "headline", type: "text", labelKey: "headline" },
      { key: "body", type: "richtext", labelKey: "body" },
      { key: "metaTitle", type: "text", labelKey: "metaTitle" },
      { key: "metaDescription", type: "textarea", labelKey: "metaDescription" },
      { key: "navLabel", type: "text", labelKey: "navLabel" },
      { key: "showInHeader", type: "boolean", labelKey: "showInHeader" },
      { key: "footerGroup", type: "select", labelKey: "footerGroup" },
      { key: "status", type: "select", labelKey: "status" },
    ],
  },
  cms_forms: {
    collection: "cms_forms",
    fields: [
      { key: "title", type: "text", labelKey: "title", required: true },
      { key: "slug", type: "text", labelKey: "slug", required: true },
      { key: "description", type: "textarea", labelKey: "description" },
      { key: "submitLabel", type: "text", labelKey: "submitLabel" },
      { key: "successMessage", type: "text", labelKey: "successMessage" },
      {
        key: "fields",
        type: "repeatable",
        labelKey: "formFields",
        fields: [
          { key: "key", type: "text", labelKey: "fieldKey", required: true },
          { key: "label", type: "text", labelKey: "fieldLabel", required: true },
          { key: "type", type: "select", labelKey: "fieldType" },
          { key: "required", type: "boolean", labelKey: "fieldRequired" },
          { key: "placeholder", type: "text", labelKey: "fieldPlaceholder" },
          { key: "options", type: "text", labelKey: "fieldOptions" },
        ],
      },
      { key: "status", type: "select", labelKey: "status" },
    ],
  },
  email_templates: {
    collection: "email_templates",
    fields: [
      { key: "name", type: "text", labelKey: "name", required: true },
      { key: "description", type: "textarea", labelKey: "description" },
      { key: "subject", type: "text", labelKey: "subject", required: true },
      { key: "htmlBody", type: "textarea", labelKey: "htmlBody", required: true },
      { key: "textBody", type: "textarea", labelKey: "textBody", required: true },
      { key: "preferenceKey", type: "text", labelKey: "preferenceKey" },
      { key: "category", type: "text", labelKey: "category" },
      { key: "enabled", type: "boolean", labelKey: "enabled" },
    ],
  },
  video_cards: {
    collection: "video_cards",
    fields: [
      { key: "title", type: "text", labelKey: "title", required: true },
      { key: "subtitle", type: "text", labelKey: "subtitle" },
      { key: "videoUrl", type: "text", labelKey: "videoUrl", required: true },
      { key: "duration", type: "text", labelKey: "duration" },
      { key: "thumbnailUrl", type: "image", labelKey: "thumbnailUrl" },
      { key: "position", type: "number", labelKey: "position" },
      { key: "status", type: "select", labelKey: "status" },
    ],
  },
  podcast_episodes: {
    collection: "podcast_episodes",
    fields: [
      { key: "episodeNumber", type: "number", labelKey: "episodeNumber", required: true },
      { key: "title", type: "text", labelKey: "title", required: true },
      { key: "guestName", type: "text", labelKey: "guestName" },
      { key: "duration", type: "text", labelKey: "duration" },
      { key: "audioUrl", type: "text", labelKey: "audioUrl", required: true },
      { key: "description", type: "textarea", labelKey: "description" },
      { key: "status", type: "select", labelKey: "status" },
    ],
  },
};

export const COLLECTION_FIELD_STATIC_OPTIONS: Record<
  string,
  Record<string, string>
> = {
  companies: { subscriptionStatus: "subscriptionStatus" },
  students: { status: "status_students" },
  job_postings: { status: "status_job" },
  articles: { status: "status_article" },
  public_roles: { status: "status_role" },
  content_items: { status: "status_content", type: "type_content" },
  cms_pages: { status: "status_cms", footerGroup: "footerGroup" },
  cms_forms: { status: "status_cms" },
  video_cards: { status: "status_content" },
  podcast_episodes: { status: "status_content" },
  page_home: {
    direction: "marqueeDirection",
    easing: "marqueeEasing",
  },
};

export const STATIC_SELECT_OPTIONS: Record<string, { value: string; label: string }[]> = {
  subscriptionStatus: [
    { value: "active", label: "active" },
    { value: "inactive", label: "inactive" },
    { value: "pending", label: "pending" },
  ],
  status_students: [
    { value: "active", label: "active" },
    { value: "placed", label: "placed" },
    { value: "inactive", label: "inactive" },
  ],
  status_job: [
    { value: "open", label: "open" },
    { value: "closed", label: "closed" },
  ],
  status_article: [
    { value: "draft", label: "draft" },
    { value: "published", label: "published" },
  ],
  status_role: [
    { value: "open", label: "open" },
    { value: "filled", label: "filled" },
  ],
  status_content: [
    { value: "draft", label: "draft" },
    { value: "live", label: "live" },
    { value: "archived", label: "archived" },
  ],
  status_cms: [
    { value: "draft", label: "draft" },
    { value: "published", label: "published" },
  ],
  fieldType: [
    { value: "text", label: "text" },
    { value: "email", label: "email" },
    { value: "textarea", label: "textarea" },
    { value: "select", label: "select" },
  ],
  type_content: [
    { value: "video", label: "video" },
    { value: "pdf", label: "pdf" },
    { value: "course", label: "course" },
    { value: "download", label: "download" },
    { value: "coaching", label: "coaching" },
    { value: "webinar", label: "webinar" },
    { value: "premium", label: "premium" },
  ],
  role_users: [
    { value: "admin", label: "admin" },
    { value: "company", label: "company" },
    { value: "student", label: "student" },
  ],
  status_users: [
    { value: "active", label: "active" },
    { value: "suspended", label: "suspended" },
  ],
  marqueeDirection: [
    { value: "ltr", label: "Left → right" },
    { value: "rtl", label: "Right → left" },
  ],
  marqueeEasing: [
    { value: "linear", label: "Linear" },
    { value: "ease", label: "Ease" },
    { value: "ease-in-out", label: "Ease in-out" },
  ],
  footerGroup: [
    { value: "none", label: "footerGroupNone" },
    { value: "company", label: "footerGroupCompany" },
    { value: "talent", label: "footerGroupTalent" },
    { value: "employers", label: "footerGroupEmployers" },
  ],
};

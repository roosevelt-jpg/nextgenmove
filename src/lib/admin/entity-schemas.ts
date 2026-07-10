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
  | "repeatable";

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
      { key: "contactEmail", type: "text", labelKey: "contactEmail", required: true },
      { key: "industry", type: "text", labelKey: "industry" },
      { key: "website", type: "text", labelKey: "website" },
      { key: "logoUrl", type: "image", labelKey: "logoUrl" },
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
      { key: "thumbnailUrl", type: "image", labelKey: "thumbnailUrl" },
      { key: "fileUrl", type: "file", labelKey: "fileUrl" },
      { key: "costCredits", type: "number", labelKey: "costCredits" },
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
        key: "originCities",
        type: "repeatable",
        labelKey: "originCities",
        fields: [
          { key: "code", type: "text", labelKey: "code" },
          { key: "label", type: "text", labelKey: "label" },
          { key: "x", type: "number", labelKey: "x" },
          { key: "y", type: "number", labelKey: "y" },
        ],
      },
      { key: "itineraryEyebrow", type: "text", labelKey: "itineraryEyebrow" },
      { key: "itineraryHeadline", type: "text", labelKey: "itineraryHeadline" },
      {
        key: "steps",
        type: "repeatable",
        labelKey: "steps",
        fields: [
          { key: "legNumber", type: "number", labelKey: "legNumber" },
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
        ],
      },
      { key: "testimonialQuote", type: "textarea", labelKey: "testimonialQuote" },
      {
        key: "testimonialAttribution",
        type: "text",
        labelKey: "testimonialAttribution",
      },
      { key: "testimonialBadge", type: "text", labelKey: "testimonialBadge" },
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
        key: "comparisonRows",
        type: "repeatable",
        labelKey: "comparisonRows",
        fields: [
          { key: "feature", type: "text", labelKey: "feature" },
          { key: "trackAValue", type: "text", labelKey: "trackAValue" },
          { key: "trackBValue", type: "text", labelKey: "trackBValue" },
        ],
      },
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
  ],
  type_content: [
    { value: "video", label: "video" },
    { value: "pdf", label: "pdf" },
    { value: "course", label: "course" },
    { value: "download", label: "download" },
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
};

# Firestore Schema — Nextgenmove

Reference document for all Firestore collections. Collections are **not** created by this phase — this schema is the contract for later phases.

Security rules are defined in Phase 8 — see `firestore.rules` and `docs/security-model.md`.

---

## `users`

| Field | Type | Notes |
|---|---|---|
| `uid` | string | Document ID matches Firebase Auth UID |
| `email` | string | |
| `role` | enum | `'admin'` \| `'company'` \| `'student'` |
| `displayName` | string | |
| `photoUrl` | string \| null | Storage download URL |
| `createdAt` | timestamp | |
| `lastLoginAt` | timestamp \| null | |
| `status` | enum | `'active'` \| `'suspended'` |

---

## `companies`

| Field | Type | Notes |
|---|---|---|
| `id` | string | Document ID |
| `userId` | string | → `users` |
| `name` | string | |
| `contactEmail` | string | |
| `logoUrl` | string \| null | Storage download URL |
| `industry` | string | |
| `website` | string \| null | |
| `plan` | enum \| null | `'track_a'` \| `'track_b'` \| null |
| `subscriptionStatus` | enum | `'active'` \| `'inactive'` \| `'pending'` |
| `requirements` | array | `{ id, title, fileUrl, uploadedAt }[]` |
| `createdAt` | timestamp | |

---

## `students`

| Field | Type | Notes |
|---|---|---|
| `id` | string | Document ID |
| `userId` | string | → `users` |
| `fullName` | string | |
| `email` | string | |
| `photoUrl` | string \| null | Storage download URL |
| `sector` | string | Taxonomy value |
| `seniority` | string | Taxonomy value |
| `currentCity` | string | |
| `targetCities` | array | string[] |
| `cvUrl` | string \| null | Storage download URL |
| `linkedinUrl` | string \| null | |
| `portfolioUrl` | string \| null | |
| `bio` | string | |
| `skills` | array | string[] |
| `availability` | string | |
| `credits` | number | |
| `status` | enum | `'active'` \| `'placed'` \| `'inactive'` |
| `notificationPreferences` | object | Optional notification toggles for settings |
| `createdAt` | timestamp | |

---

## `matches`

Pipeline + Shortlist live here.

| Field | Type | Notes |
|---|---|---|
| `id` | string | Document ID |
| `companyId` | string | → `companies` |
| `studentId` | string | → `students` |
| `stageId` | string | → `pipeline_stages` |
| `shortlisted` | boolean | |
| `source` | enum | `'admin_curated'` \| `'company_browsed'` \| `'role_interest_promoted'` |
| `notes` | array | `{ authorId, text, createdAt }[]` |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

---

## `pipeline_stages`

CMS-managed — powers the Pipeline kanban columns (not hardcoded).

| Field | Type | Notes |
|---|---|---|
| `id` | string | Document ID |
| `name` | string | Column label |
| `order` | number | Sort order |
| `color` | string | Design-token-compatible color value |
| `isTerminal` | boolean | Terminal stage (e.g. placed, rejected) |

---

## `requests`

Generic inbound requests table — sourcing requests, plan change requests, etc.

| Field | Type | Notes |
|---|---|---|
| `id` | string | Document ID |
| `type` | enum | `'sourcing_request'` \| `'plan_request'` \| `'other'` |
| `companyId` | string \| null | → `companies` when applicable |
| `payload` | object | Form fields (shape varies by `type`) |
| `status` | enum | `'pending'` \| `'reviewed'` \| `'actioned'` \| `'dismissed'` |
| `createdAt` | timestamp | |

**`sourcing_request` payload** (from Request talent form): `companyName`, `contactName`, `workEmail`, `phone`, `roleTitleNeeded`, `sector`, `location`, `numberOfHires`, `preferredTrack`, `timeline`, `additionalRequirements`, `jobDescriptionFileUrl` (optional).

---

## `job_postings`

Internal Nextgenmove Careers page.

| Field | Type | Notes |
|---|---|---|
| `id` | string | Document ID |
| `title` | string | |
| `department` | string | Taxonomy value |
| `location` | string | |
| `employmentType` | string | Taxonomy value |
| `description` | string | Rich text |
| `status` | enum | `'open'` \| `'closed'` |
| `createdAt` | timestamp | |

---

## `job_applications`

| Field | Type | Notes |
|---|---|---|
| `id` | string | Document ID |
| `jobPostingId` | string | → `job_postings` |
| `fullName` | string | |
| `email` | string | |
| `linkedinUrl` | string \| null | |
| `cvUrl` | string | Storage download URL |
| `coverNote` | string | Max 500 chars |
| `status` | enum | `'new'` \| `'reviewed'` \| `'rejected'` \| `'hired'` |
| `createdAt` | timestamp | |

---

## `articles`

| Field | Type | Notes |
|---|---|---|
| `id` | string | Document ID |
| `title` | string | |
| `slug` | string | Auto-generated, editable |
| `coverImageUrl` | string | Storage download URL |
| `excerpt` | string | Shown on index card |
| `body` | string | Rich text |
| `author` | string | |
| `category` | string | Taxonomy value |
| `publishedDate` | timestamp | |
| `tags` | array | string[] |
| `status` | enum | `'draft'` \| `'published'` |
| `createdAt` | timestamp | |

---

## `newsletter_subscribers`

| Field | Type | Notes |
|---|---|---|
| `id` | string | Document ID |
| `email` | string | |
| `subscribedAt` | timestamp | |

---

## `public_roles`

Public job board, separate from private company matches.

| Field | Type | Notes |
|---|---|---|
| `id` | string | Document ID |
| `title` | string | |
| `employerLabel` | string | e.g. "Confidential scale-up" |
| `sector` | string | Mirrors student `sector` taxonomy |
| `location` | string | |
| `seniority` | string | Taxonomy value |
| `relocationSupport` | boolean | Shows badge on card |
| `description` | string | Rich text |
| `status` | enum | `'open'` \| `'filled'` |
| `createdAt` | timestamp | |

---

## `role_interest_submissions`

| Field | Type | Notes |
|---|---|---|
| `id` | string | Document ID |
| `publicRoleId` | string | → `public_roles` |
| `fullName` | string | |
| `email` | string | |
| `currentCity` | string | |
| `cvUrl` | string | Storage download URL |
| `whyThisRole` | string | |
| `status` | enum | `'new'` \| `'promoted'` \| `'dismissed'` |
| `createdAt` | timestamp | |

---

## `content_purchases`

Student Content Store purchase records.

| Field | Type | Notes |
|---|---|---|
| `id` | string | Document ID |
| `studentId` | string | → `students` |
| `contentItemId` | string | → `content_items` |
| `creditsCost` | number | Credits deducted at purchase time |
| `purchasedAt` | timestamp | |

---

## `content_items`

Student Content Store.

| Field | Type | Notes |
|---|---|---|
| `id` | string | Document ID |
| `title` | string | |
| `type` | enum | `'video'` \| `'pdf'` \| `'course'` \| `'download'` |
| `description` | string | |
| `thumbnailUrl` | string | Storage download URL |
| `fileUrl` | string | Storage download URL |
| `costCredits` | number | |
| `category` | string | |
| `status` | enum | `'draft'` \| `'live'` |
| `createdAt` | timestamp | |

---

## `program_levers`

Single source of truth for pricing/config. Drives Pricing, Track pages, and Credits page.

| Field | Type | Notes |
|---|---|---|
| `id` | string | Always `'default'` (singleton) |
| `trackAMonthly` | number | |
| `trackAMatchFee` | number | |
| `trackBMonthly` | number | |
| `waysToEarn` | array | `{ id, action, credits, description }[]` |
| `updatedAt` | timestamp | |

---

## `page_home`

Singleton content doc. Document ID: `'default'`. Powers the homepage hero and teaser sections.

| Field | Type | Notes |
|---|---|---|
| `eyebrowText` | string | Mono eyebrow above headline |
| `headline` | string | Primary serif headline |
| `headlineEmphasis` | string | Italic emphasis line |
| `subtext` | string | Supporting copy |
| `ctaPrimaryLabel` | string | |
| `ctaPrimaryHref` | string | |
| `ctaSecondaryLabel` | string | |
| `ctaSecondaryHref` | string | |
| `hubLabel` | string | Globe hub city code label |
| `originCities` | array | `{ code, label, x, y }[]` — drives animated globe routes |
| `statBlocks` | array | `{ label, value }[]` |
| `steps` | array | `{ legNumber, title, description }[]` — homepage teaser |

---

## `page_about`

Singleton content doc. Document ID: `'default'`.

| Field | Type | Notes |
|---|---|---|
| `heroHeadline` | string | e.g. "We engineer the move." |
| `heroSubtext` | string | |
| `missionBody` | string | Rich text |
| `statBlocks` | array | `{ label, value }[]` — reuses homepage stat-card component |
| `teamMembers` | array | `{ name, role, photo, bio }[]` |
| `foundingStory` | string \| null | Rich text, optional long-form section |

---

## `page_how_it_works`

Singleton content doc. Document ID: `'default'`.

| Field | Type | Notes |
|---|---|---|
| `steps` | array | `{ legNumber, title, description }[]` — same 3-leg component as homepage |
| `faqItems` | array | `{ question, answer }[]` — accordion |

---

## `page_pricing`

Singleton content doc. Document ID: `'default'`. Pricing **numbers** come from `program_levers`; this page owns descriptive copy only.

| Field | Type | Notes |
|---|---|---|
| `trackAHeadline` | string | |
| `trackAFeatures` | array | string[] |
| `trackBHeadline` | string | |
| `trackBFeatures` | array | string[] |
| `faqItems` | array | `{ question, answer }[]` |

---

## `page_tracks`

Singleton content doc. Document ID: `'default'`.

| Field | Type | Notes |
|---|---|---|
| `trackABody` | string | Rich text — expanded explanation, use cases |
| `trackBBody` | string | Rich text |
| `comparisonRows` | array | `{ feature, trackAValue, trackBValue }[]` — comparison table |
| `caseStudyQuote` | object \| null | `{ quote, companyName, resultStat }` — optional social proof |

---

## `site_settings`

Singleton. Document ID: `'default'`.

| Field | Type | Notes |
|---|---|---|
| `siteName` | string | |
| `tagline` | string | |
| `logoUrl` | string | Storage download URL |
| `contactEmail` | string | Public contact email |
| `contactPhone` | string | Public contact phone |
| `contactAddress` | string | Public mailing / office address |
| `socialLinks` | array | `{ key, url, label? }[]` — footer + contact page |
| `navLabels` | object | Nav key → label map |
| `footerLinks` | array | Footer link objects |
| `formLabels` | object | Public form field labels keyed by identifier |
| `pageLabels` | object | Public page section titles and template strings |

---

## `contact_submissions`

Public contact form inbox. Written only via Admin SDK (`POST /api/contact/submit`). Client SDK denied.

| Field | Type | Notes |
|---|---|---|
| `id` | string | Document ID |
| `name` | string | |
| `email` | string | |
| `phone` | string \| null | |
| `subject` | string | |
| `message` | string | |
| `status` | enum | `'new'` \| `'read'` \| `'replied'` \| `'archived'` |
| `replyNotes` | string | Internal admin notes |
| `lastReplyAt` | timestamp \| null | |
| `lastReplySubject` | string \| null | |
| `lastReplyPreview` | string \| null | |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

---

## `taxonomies`

Singleton. Document ID: `'default'`. Shared select options across public forms and filters.

| Field | Type | Notes |
|---|---|---|
| `sector` | array | `{ value, label }[]` |
| `department` | array | `{ value, label }[]` |
| `employmentType` | array | `{ value, label }[]` |
| `seniority` | array | `{ value, label }[]` |
| `timeline` | array | `{ value, label }[]` |
| `category` | array | `{ value, label }[]` — article categories |
| `preferredTrack` | array | `{ value, label }[]` — request talent radio options |
| `articleTag` | array | `{ value, label }[]` |

---

## `integrations`

| Field | Type | Notes |
|---|---|---|
| `id` | string | Document ID |
| `name` | string | |
| `description` | string | |
| `iconUrl` | string | Storage download URL |
| `status` | enum | `'connected'` \| `'not_connected'` |
| `connectedAt` | timestamp \| null | |
| `config` | object | Non-sensitive config only — never store raw secrets in Firestore |

---

## `activity_log`

| Field | Type | Notes |
|---|---|---|
| `id` | string | Document ID |
| `actorId` | string | → `users` |
| `actorRole` | string | |
| `action` | string | |
| `targetType` | string | |
| `targetId` | string | |
| `metadata` | object | |
| `createdAt` | timestamp | |

---

## Storage metadata convention

All file references in Firestore store metadata only (never binary data):

```ts
{
  url: string;       // download URL
  path: string;      // Storage path
  filename: string;
  size: number;      // bytes
  mimeType: string;
  uploadedAt: timestamp;
}
```

Some fields above use a plain URL string for brevity; implementations may adopt the full metadata object where uploads are involved.

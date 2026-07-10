# NextGen Move — Firestore Schema

## Collections Overview

### users
- `uid` (string) — Firebase Auth UID
- `email` (string) — User email
- `role` (string) — 'admin' | 'company' | 'student'
- `displayName` (string) — Display name
- `photoUrl` (string) — Profile photo URL from Storage
- `createdAt` (Timestamp)
- `lastLoginAt` (Timestamp)
- `status` (string) — 'active' | 'suspended'

### companies
- `id` (string) — Document ID
- `userId` (string) → Reference to `users` collection
- `name` (string)
- `contactEmail` (string)
- `logoUrl` (string) — URL from Firebase Storage
- `industry` (string)
- `website` (string)
- `plan` (string) — 'track_a' | 'track_b' | null
- `subscriptionStatus` (string) — 'active' | 'inactive' | 'pending'
- `requirements` (array) — [{id, title, fileUrl, uploadedAt}]
- `createdAt` (Timestamp)

### students
- `id` (string) — Document ID
- `userId` (string) → Reference to `users` collection
- `fullName` (string)
- `email` (string)
- `photoUrl` (string) — URL from Firebase Storage
- `sector` (string) — Sector taxonomy reference
- `seniority` (string) — Experience level
- `currentCity` (string)
- `targetCities` (array) — List of target cities
- `cvUrl` (string) — URL from Firebase Storage
- `linkedinUrl` (string)
- `portfolioUrl` (string)
- `bio` (string)
- `skills` (array) — List of skills
- `availability` (string) — Availability status
- `credits` (number) — Content store credits
- `status` (string) — 'active' | 'placed' | 'inactive'
- `createdAt` (Timestamp)

### matches (Pipeline + Shortlist)
- `id` (string) — Document ID
- `companyId` (string) → Reference to `companies`
- `studentId` (string) → Reference to `students`
- `stageId` (string) → Reference to `pipeline_stages`
- `shortlisted` (boolean)
- `source` (string) — 'admin_curated' | 'company_browsed' | 'role_interest_promoted'
- `notes` (array) — [{authorId, text, createdAt}]
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)

### pipeline_stages (CMS-managed)
- `id` (string) — Document ID
- `name` (string) — Stage name
- `order` (number) — Display order
- `color` (string) — Hex color code
- `isTerminal` (boolean) — Whether this is a terminal state

### requests
- `id` (string) — Document ID
- `type` (string) — 'sourcing_request' | 'plan_request' | 'other'
- `companyId` (string) — Nullable, reference to `companies`
- `payload` (object) — Form field data
- `status` (string) — 'pending' | 'reviewed' | 'actioned' | 'dismissed'
- `createdAt` (Timestamp)

### job_postings (Internal Careers Page)
- `id` (string) — Document ID
- `title` (string)
- `department` (string)
- `location` (string)
- `employmentType` (string)
- `description` (string)
- `status` (string) — 'open' | 'closed'
- `createdAt` (Timestamp)

### job_applications
- `id` (string) — Document ID
- `jobPostingId` (string) → Reference to `job_postings`
- `fullName` (string)
- `email` (string)
- `linkedinUrl` (string)
- `cvUrl` (string) — URL from Firebase Storage
- `coverNote` (string)
- `status` (string) — 'new' | 'reviewed' | 'rejected' | 'hired'
- `createdAt` (Timestamp)

### articles
- `id` (string) — Document ID
- `title` (string)
- `slug` (string) — URL-friendly slug
- `coverImageUrl` (string) — URL from Firebase Storage
- `excerpt` (string)
- `body` (string) — Rich text body
- `author` (string)
- `category` (string)
- `publishedDate` (Timestamp)
- `tags` (array) — Array of tag strings
- `status` (string) — 'draft' | 'published'
- `createdAt` (Timestamp)

### newsletter_subscribers
- `id` (string) — Document ID
- `email` (string)
- `subscribedAt` (Timestamp)

### public_roles (Public Job Board)
- `id` (string) — Document ID
- `title` (string)
- `employerLabel` (string)
- `sector` (string)
- `location` (string)
- `seniority` (string)
- `relocationSupport` (boolean)
- `description` (string)
- `status` (string) — 'open' | 'filled'
- `createdAt` (Timestamp)

### role_interest_submissions
- `id` (string) — Document ID
- `publicRoleId` (string) → Reference to `public_roles`
- `fullName` (string)
- `email` (string)
- `currentCity` (string)
- `cvUrl` (string) — URL from Firebase Storage
- `whyThisRole` (string)
- `status` (string) — 'new' | 'promoted' | 'dismissed'
- `createdAt` (Timestamp)

### content_items (Student Content Store)
- `id` (string) — Document ID
- `title` (string)
- `type` (string) — 'video' | 'pdf' | 'course' | 'download'
- `description` (string)
- `thumbnailUrl` (string) — URL from Firebase Storage
- `fileUrl` (string) — URL from Firebase Storage
- `costCredits` (number)
- `category` (string)
- `status` (string) — 'draft' | 'live'
- `createdAt` (Timestamp)

### program_levers (Single Source of Truth for Pricing/Config)
- `id` (string) — Always 'default'
- `trackAMonthly` (number)
- `trackAMatchFee` (number)
- `trackBMonthly` (number)
- `waysToEarn` (array) — [{id, action, credits, description}]
- `updatedAt` (Timestamp)

### page_home (Singleton)
- `id` (string) — Always 'default'
- `headline` (string)
- `headline_emphasis` (string) — Emphasized text
- `subtext` (string)
- `cta_primary_label` (string)
- `cta_primary_href` (string)
- `cta_secondary_label` (string)
- `cta_secondary_href` (string)
- `origin_cities` (array) — [{code, label, x, y}]

### page_about (Singleton)
- `id` (string) — Always 'default'
- `hero_headline` (string)
- `hero_subtext` (string)
- `mission_body` (string) — Rich text
- `stat_blocks` (array) — [{label, value}]
- `team_members` (array) — [{name, role, photoUrl}]
- `founding_story` (string) — Rich text

### page_how_it_works (Singleton)
- `id` (string) — Always 'default'
- `steps` (array) — [{leg_number, title, description}]
- `faq_items` (array) — [{question, answer}]

### page_pricing (Singleton)
- `id` (string) — Always 'default'
- `track_a_headline` (string)
- `track_a_features` (array) — List of feature strings
- `track_b_headline` (string)
- `track_b_features` (array) — List of feature strings
- `faq_items` (array) — [{question, answer}]

### page_tracks (Singleton)
- `id` (string) — Always 'default'
- `track_a_body` (string) — Rich text
- `track_b_body` (string) — Rich text
- `comparison_rows` (array) — [{label, track_a_value, track_b_value}]
- `case_study_quote` (string) — Optional quote

### site_settings (Singleton)
- `id` (string) — Always 'default'
- `siteName` (string)
- `tagline` (string)
- `logoUrl` (string) — URL from Firebase Storage
- `contactEmail` (string)
- `socialLinks` (object) — {platform: url}
- `navLabels` (object) — {section: label}
- `footerLinks` (array) — [{section, links: [{label, href}]}]

### integrations
- `id` (string) — Document ID
- `name` (string)
- `description` (string)
- `iconUrl` (string) — URL from Firebase Storage
- `status` (string) — 'connected' | 'not_connected'
- `connectedAt` (Timestamp) — Optional
- `config` (object) — Non-sensitive config only (real credentials via API/secret manager)

### activity_log
- `id` (string) — Document ID
- `actorId` (string) → Reference to `users`
- `actorRole` (string) — User role at time of action
- `action` (string) — Action name
- `targetType` (string) — Type of resource (e.g., 'student', 'match')
- `targetId` (string) — ID of affected resource
- `metadata` (object) — Additional context
- `createdAt` (Timestamp)

---

**Note:** Security rules are defined in Phase 9. No collections are created yet — this schema is reference documentation for development phases to follow.

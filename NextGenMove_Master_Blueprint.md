# NextGen Move — Master Engineering Blueprint

**Tagline:** "Your next step, engineered."
**Stack:** Next.js (App Router) · TypeScript · Firebase (Auth + Firestore + Storage + Cloud Functions) · Tailwind CSS

---

## 0. Read me first

This replaces every earlier version of this document (the original React/Express/Postgres draft, the Production Readiness Audit, and the Sizing & Spacing Spec) with one clean spec, re-architected for **Next.js + TypeScript + Firebase/Firestore** — the same stack pattern as the Passive Blessings project (Next.js App Router, Firebase Auth/Firestore/Storage, Tailwind, role stored as a field on the user's own document, an `/admin` surface, an Integrations settings page). Where a convention isn't specified here, default to whatever Passive Blessings already does — same folder shape, same auth pattern, same "extend, don't duplicate" discipline.

**For Cursor: read this whole document before writing code.** Section 14 is the build order. Everything before it is reference.

---

## 1. Product overview

NextGen Move is a three-sided relocation-and-placement platform run by an agency ("Nextgenmove"). Students/candidates get coached and placed into jobs abroad (Dubai is the flagship destination corridor); companies pay to access a pre-screened, coached talent pool.

| Role | Who they are | Core job to be done |
|---|---|---|
| **Student** | Job-seeker being coached/placed | Build profile, earn credits, redeem coaching content, track placement progress |
| **Company** (Employer) | Pays for access to talent | Browse/search candidates, shortlist, track hiring pipeline, request full-service sourcing |
| **Admin** (Nextgenmove ops) | Runs the marketplace | Monitor KPIs/analytics, manage content, tune platform economics, approve requests |

### Business model
- **Two company tracks**: Track A — self-service (€50/mo + €200 one-time per match). Track B — full service (€125/mo per placed student).
- **Student credit economy**: Welcome credit 2,000cr, referral bonus 150cr, profile-complete bonus 100cr, one-time placement fee €350. Credits spend on a Content Library (mock interviews, CV review, webinars, premium placement, etc.) at a fixed ~€0.25/credit ratio.
- **Plan changes and sourcing requests are request-based**, not instant — they land in an Admin approval queue.

---

## 2. Full page inventory (what's already designed — build to match)

### Public site (no auth) — 10 pages
Home, About, Careers, Journal, Browse Roles, How It Works, Credits, Pricing, Track A/B, Request Talent.
Public homepage additionally includes: an animated "global reach" band (SVG route arcs between origin cities and Dubai), a **Video Cards** section, and a **Podcast** section — both admin-managed (Section 10.4).

### Student dashboard — 3 pages
Dashboard (stats + credit-activity chart + placement journey tracker), Content Store, My Profile.

### Employer (Company) dashboard — 4 pages
Talent Pool, Pipeline (with hiring-funnel chart), Shortlist, Our Profile (plan picker + requirements uploads).

### Admin dashboard — 8 pages
Operations Dashboard (KPIs + placements/students trend chart + Track A/B donut + Content Library), CRM → All Contacts, CRM → Companies, CRM → Interns, Integrations, Homepage Content (manages the public site's video cards/podcast episodes), Program Levers, Settings (workspace, team, security, billing).

### Shared account — 1 page
My Profile/Account (avatar, personal details, password, notifications) — reachable from every dashboard's navbar.

**Total: 26 routes.** Every dashboard page (Student/Employer/Admin, 15 pages) shares one app shell: a **left sidebar** (role-aware nav + workspace switcher), a **top navbar** (breadcrumb, language switcher, dark/light toggle, global settings, profile dropdown), and a max-width content area. See Section 10.

---

## 3. Tech stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 14+ App Router**, TypeScript throughout, no `any` |
| Auth | **Firebase Auth** (email/password at minimum; Google sign-in optional) |
| Database | **Firestore** (NoSQL — see data model in Section 4) |
| File storage | **Firebase Storage** (CVs, requirement docs, job descriptions, video/podcast assets) |
| Server logic | **Next.js Server Actions** for mutations; **Route Handlers** (`app/api/**`) reserved for third-party webhooks (Stripe, DocuSign) that need a stable public URL |
| Scheduled jobs | **Cloud Functions** (2nd gen) on a Cloud Scheduler trigger — nightly match-score recompute, KPI aggregation |
| Styling | **Tailwind CSS**, design tokens in `tailwind.config.ts` (Section 9) |
| Charts | Inline SVG (bar/line/donut) as already built — no charting library dependency needed for the current scope |
| Fonts | Playfair Display (display/serif), Inter (UI), JetBrains Mono (labels/data) — via `next/font/google` |
| Hosting | Vercel (Next.js) + Firebase (Auth/Firestore/Storage/Functions) — same split as Passive Blessings |

**Role storage convention (matches Passive Blessings):** role lives as a field on the user's own Firestore document — `users/{uid}.role: 'student' | 'company' | 'admin'` — not a separate roles/claims collection. Mirror this exactly; don't introduce Firebase custom claims unless a specific rule genuinely requires them.

---

## 4. Firestore data model

Firestore is document-based, not relational — the original SQL schema is redesigned below with Firestore-idiomatic patterns: denormalize what's read together, subcollection what's owned-and-scoped, use `collectionGroup` queries for cross-cutting admin reads.

```typescript
// users/{uid}  — one doc per authenticated user, uid === Firebase Auth uid
interface UserDoc {
  email: string;
  role: 'student' | 'company' | 'admin';
  createdAt: Timestamp;
}

// students/{uid}  — same id as users/{uid}, 1:1
interface StudentDoc {
  fullName: string;
  sector: string;
  city: string;
  skills: string[];
  bio: string;
  profileComplete: boolean;
  creditBalance: number;
  status: 'available' | 'shortlisted' | 'interviewing' | 'placed';
  coachId: string | null;        // admin/coach uid assigned
  avatarInitials: string;        // e.g. "SK" — no stock photos, per brand guidelines
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// students/{uid}/creditTransactions/{txId}  — subcollection: student can read only their own
interface CreditTransactionDoc {
  direction: 'earn' | 'spend';
  source: string;                // 'welcome' | 'referral' | 'profile_complete' | 'redeem:<contentItemId>'
  amount: number;
  relatedContentItemId: string | null;
  createdAt: Timestamp;
}
// Admin-wide reads use a Firestore `collectionGroup('creditTransactions')` query — never duplicate this data into a top-level collection.

// companies/{uid}  — same id as users/{uid}, 1:1
interface CompanyDoc {
  name: string;
  contactEmail: string;
  track: 'A' | 'B' | 'none';
  subscriptionStatus: 'active' | 'pending' | 'cancelled';
  monthlyFeeEur: number;
  createdAt: Timestamp;
}

// companies/{uid}/requirementsUploads/{uploadId}  — subcollection
interface RequirementUploadDoc {
  fileUrl: string;               // Firebase Storage download URL
  label: string;
  uploadedAt: Timestamp;
}

// matches/{matchId}  — top-level; the one join collection driving Talent Pool, Pipeline, Shortlist
interface MatchDoc {
  companyId: string;
  studentId: string;
  matchScore: number;            // 0–100, see Section 8.1
  stage: 'viewed' | 'shortlisted' | 'interview' | 'placed';
  shortlistRank: number | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
// Composite indexes required: (companyId, stage), (studentId, stage), (companyId, shortlistRank)
// Enforce uniqueness of (companyId, studentId) in application logic — Firestore has no native unique-pair constraint; use a deterministic doc id: `${companyId}_${studentId}`.

// contentItems/{itemId}  — admin-managed catalog, also powers the public /credits page (status == 'live' only)
interface ContentItemDoc {
  title: string;
  type: 'coaching' | 'profile' | 'webinar' | 'premium';
  description: string;
  creditCost: number;
  priceEur: number;
  linkUrl: string;
  emojiIcon: string;
  status: 'draft' | 'live' | 'archived';
  position: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// programLevers/{key}  — singleton config docs, admin-write-only
// keys: welcomeCredit, referralBonus, profileCompleteBonus, placementFeeEur,
//       trackAMonthly, trackAMatchFee, trackBMonthly, mockInterviewCredits, webinarCredits
interface ProgramLeverDoc {
  value: number;
  updatedAt: Timestamp;
  updatedBy: string;              // admin uid — audit trail, see Production Readiness §3
}

// requests/{requestId}  — company → admin asks
interface RequestDoc {
  companyId: string;
  type: 'plan_change' | 'sourcing_request' | 'other';
  payload: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
  resolvedAt: Timestamp | null;
  resolvedBy: string | null;
}

// crmContacts/{contactId}  — powers Admin → CRM (All/Companies/Interns tabs)
// Derived/synced from students, companies, and job_applications/role_interest_submissions —
// do not hand-maintain this separately from those source collections; write to it via
// Cloud Function triggers (onCreate/onUpdate) on students, companies, jobApplications.
interface CrmContactDoc {
  refId: string;                  // points back to students/{id} or companies/{id}
  kind: 'company' | 'candidate' | 'lead';
  name: string;
  stage: 'new' | 'contacted' | 'qualified' | 'won' | 'lost';
  ownerId: string | null;         // admin/coach uid
  lastActivityAt: Timestamp;
  value: number | null;           // MRR for companies, null for candidates
}

// videoCards/{id} and podcastEpisodes/{id} — public homepage CMS content (Section 10.4)
interface VideoCardDoc {
  title: string;
  subtitle: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: string;
  status: 'draft' | 'live' | 'archived';
  position: number;
}
interface PodcastEpisodeDoc {
  episodeNumber: number;
  title: string;
  guestName: string;
  audioUrl: string;
  coverImageUrl: string;
  duration: string;
  description: string;
  status: 'draft' | 'live' | 'archived';
  publishedAt: Timestamp;
}

// Marketing/CMS collections (see Section 10.5 for the full field-level spec per page):
// pageAbout, jobPostings, articles (Journal), publicRoles (Browse Roles),
// pageHowItWorks, pagePricing, pageTracks, newsletterSubscribers, jobApplications,
// roleInterestSubmissions
```

**Why subcollections for `creditTransactions` and `requirementsUploads`:** both are owned by exactly one parent and almost always read scoped to that parent (a student's own ledger, a company's own uploads) — subcollections make the Security Rule for "you can only read your own" a one-line rule instead of a query filter that must be trusted client-side. Use `collectionGroup` queries only for the rare admin-wide view.

---

## 5. Firestore Security Rules

This is where the original spec's "auth/role-boundary tests" requirement gets enforced at the database layer instead of only in application code — a company reading another company's pipeline becomes structurally impossible, not just untested.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() { return request.auth != null; }
    function role() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role; }
    function isAdmin() { return isSignedIn() && role() == 'admin'; }
    function isOwner(uid) { return isSignedIn() && request.auth.uid == uid; }

    match /users/{uid} {
      allow read: if isOwner(uid) || isAdmin();
      allow write: if isAdmin(); // role changes are admin-only, never self-serve
    }

    match /students/{uid} {
      allow read: if isOwner(uid) || isAdmin() || role() == 'company'; // companies browse the talent pool
      allow write: if isOwner(uid) || isAdmin();

      match /creditTransactions/{txId} {
        allow read: if isOwner(uid) || isAdmin();
        allow write: if isAdmin(); // credit ledger writes only via Server Action / Cloud Function, never client-direct
      }
    }

    match /companies/{uid} {
      allow read: if isOwner(uid) || isAdmin();
      allow write: if isOwner(uid) || isAdmin();

      match /requirementsUploads/{uploadId} {
        allow read, write: if isOwner(uid) || isAdmin();
      }
    }

    match /matches/{matchId} {
      // a company may only touch matches where matches.companyId == their own uid
      allow read: if isAdmin()
        || (role() == 'company' && resource.data.companyId == request.auth.uid)
        || (role() == 'student' && resource.data.studentId == request.auth.uid);
      allow write: if isAdmin()
        || (role() == 'company' && resource.data.companyId == request.auth.uid);
    }

    match /contentItems/{itemId} {
      allow read: if resource.data.status == 'live' || isAdmin();
      allow write: if isAdmin();
    }

    match /programLevers/{key} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }

    match /requests/{requestId} {
      allow read: if isAdmin() || (role() == 'company' && resource.data.companyId == request.auth.uid);
      allow create: if role() == 'company' && request.resource.data.companyId == request.auth.uid;
      allow update: if isAdmin(); // approve/reject is admin-only
    }

    match /crmContacts/{contactId} {
      allow read, write: if isAdmin();
    }

    match /videoCards/{id} {
      allow read: if resource.data.status == 'live' || isAdmin();
      allow write: if isAdmin();
    }
    match /podcastEpisodes/{id} {
      allow read: if resource.data.status == 'live' || isAdmin();
      allow write: if isAdmin();
    }
  }
}
```

**Non-negotiable before first real user:** write the Firebase emulator test suite that asserts these boundaries — a company account attempting to read a `matches` doc where `companyId != request.auth.uid` must fail. This is the single highest-priority test in the whole project (carried over from the original Production Readiness audit).

---

## 6. Next.js App Router structure

```
app/
├── (public)/                          # no auth required
│   ├── layout.tsx                     # marketing nav + footer
│   ├── page.tsx                       # Home (hero, global-reach band, video cards, podcast, stats)
│   ├── about/page.tsx
│   ├── careers/page.tsx
│   ├── journal/page.tsx
│   ├── browse-roles/page.tsx
│   ├── how-it-works/page.tsx
│   ├── credits/page.tsx
│   ├── pricing/page.tsx
│   ├── tracks/page.tsx
│   └── request-talent/page.tsx
│
├── (app)/                             # authenticated — sidebar + navbar shell
│   ├── layout.tsx                     # AppShell: <Sidebar/> + <Navbar/>, reads role from users/{uid}
│   ├── student/
│   │   ├── dashboard/page.tsx
│   │   ├── content-store/page.tsx
│   │   └── profile/page.tsx
│   ├── company/
│   │   ├── talent-pool/page.tsx
│   │   ├── pipeline/page.tsx
│   │   ├── shortlist/page.tsx
│   │   └── profile/page.tsx
│   ├── admin/
│   │   ├── dashboard/page.tsx
│   │   ├── crm/page.tsx
│   │   ├── crm/companies/page.tsx
│   │   ├── crm/interns/page.tsx
│   │   ├── integrations/page.tsx
│   │   ├── homepage-content/page.tsx
│   │   ├── levers/page.tsx
│   │   └── settings/page.tsx
│   └── account/
│       └── profile/page.tsx           # shared "my account" — linked from every navbar
│
├── api/
│   ├── webhooks/stripe/route.ts       # signature-verified, idempotent
│   ├── webhooks/docusign/route.ts
│   └── auth/session/route.ts          # Firebase session cookie exchange
│
├── actions/                            # Server Actions — the primary mutation layer
│   ├── students.ts                     # updateProfile, redeemCreditItem
│   ├── companies.ts                    # updateProfile, requestPlanChange, uploadRequirement
│   ├── matches.ts                      # shortlistStudent, reorderShortlist, advanceStage
│   ├── admin.ts                        # upsertContentItem, updateLever, resolveRequest
│   └── homepageContent.ts              # upsertVideoCard, upsertPodcastEpisode
│
├── components/
│   ├── shell/  (Sidebar, Navbar, ThemeToggle, LanguageSwitcher, ProfileMenu)
│   ├── charts/ (BarLineChart, DonutChart, FunnelChart — inline SVG, as already built)
│   ├── ui/     (StatCard, Panel, Pill, Toggle, DataTable, MiniAvatar)
│   └── marketing/ (Hero, VideoCard, PodcastRow, GlobalReachBand)
│
├── lib/
│   ├── firebase/ (client.ts, admin.ts, converters.ts — Firestore <-> TS type converters)
│   ├── matchScore.ts
│   ├── creditLedger.ts
│   └── auth.ts   (role guard helpers used in Server Components/Actions)
│
└── functions/                          # Firebase Cloud Functions (separate deploy target)
    ├── recomputeMatchScores.ts         # scheduled, nightly
    ├── aggregateKpis.ts                # scheduled, feeds Admin Dashboard chart data
    ├── syncCrmContacts.ts              # Firestore triggers on students/companies/requests
    └── stripeWebhookHandler.ts
```

This maps 1:1 to the 26 pages in Section 2 — nothing in the earlier Express/REST spec needs to survive; Server Actions replace the REST endpoint table entirely (Section 7 gives the mapping for reference during migration).

---

## 7. Server Actions (replaces the old REST API table)

| Old REST endpoint | Server Action equivalent |
|---|---|
| `GET /api/students?search=` | Client Component + Firestore query (`where`, `orderBy`) directly, or a Server Component fetch — no action needed for reads |
| `POST /api/companies/:id/shortlist` | `shortlistStudent(companyId, studentId)` in `actions/matches.ts` |
| `PATCH /api/companies/:id/shortlist/reorder` | `reorderShortlist(companyId, orderedStudentIds: string[])` |
| `PATCH /api/matches/:id/stage` | `advanceStage(matchId, stage)` |
| `POST /api/companies/:id/plan-request` | `requestPlanChange(companyId, track)` → writes `requests` doc |
| `POST /api/companies/:id/requirements` | `uploadRequirement(companyId, file)` → Firebase Storage upload + subcollection write |
| `PATCH /api/students/:id/profile` | `updateStudentProfile(uid, data)` |
| `POST /api/students/:id/redeem` | `redeemCreditItem(uid, contentItemId)` — **must run inside `runTransaction`**, see Section 8.2 |
| `POST /api/admin/content-items` | `upsertContentItem(data)` |
| `PATCH /api/admin/levers` | `updateLever(key, value)` — writes `updatedBy` for the audit trail |
| `PATCH /api/admin/requests/:id` | `resolveRequest(requestId, status)` |

All Server Actions must: (1) verify the caller's Firebase session and role before touching data — never trust a client-passed `uid`/`companyId`, always read it from the verified session; (2) be idempotent on the money/credit-moving ones specifically (`redeemCreditItem`, `requestPlanChange`) per the Production Readiness carryover in Section 12.

---

## 8. Business logic

### 8.1 Match score
```
matchScore = weightedOverlap(company.requirementTags, student.skills) × 0.6
           + locationFit(company.preferredLocations, student.city)   × 0.2
           + profileCompleteness(student)                             × 0.2
```
Computed and stored on the `matches` doc at creation; recomputed nightly by the `recomputeMatchScores` Cloud Function, not on every page load.

### 8.2 Credit redemption — must be a Firestore transaction
```typescript
// actions/students.ts
export async function redeemCreditItem(uid: string, contentItemId: string) {
  return runTransaction(db, async (tx) => {
    const studentRef = doc(db, 'students', uid);
    const itemRef = doc(db, 'contentItems', contentItemId);
    const [studentSnap, itemSnap] = await Promise.all([tx.get(studentRef), tx.get(itemRef)]);

    const student = studentSnap.data() as StudentDoc;
    const item = itemSnap.data() as ContentItemDoc;
    if (student.creditBalance < item.creditCost) throw new Error('Insufficient credits');

    tx.update(studentRef, { creditBalance: student.creditBalance - item.creditCost });
    tx.set(doc(collection(studentRef, 'creditTransactions')), {
      direction: 'spend', source: `redeem:${contentItemId}`,
      amount: item.creditCost, relatedContentItemId: contentItemId,
      createdAt: serverTimestamp(),
    });
  });
}
```
This is the Firestore-native equivalent of the original "one SQL transaction" requirement — `runTransaction` gives the same atomicity guarantee against concurrent redemption race conditions.

### 8.3 Plan changes are request-based, not instant
`requestPlanChange` never writes directly to `companies/{uid}.track` — it only creates a `requests` doc. Only `resolveRequest` (admin-only Server Action) updates the company doc, on approval.

### 8.4 Content item status
Confirmed semantics: **Draft → Live → Archived**, a three-state visibility field (`ContentItemDoc.status`), not a per-track default/override system. Public-facing queries (`/credits` page, Student Content Store) always filter `where('status', '==', 'live')`.

---

## 9. Design system (Tailwind tokens)

Pulled directly from the Brand Guidelines — put these in `tailwind.config.ts`, don't hand-pick colors/spacing per component.

```typescript
// tailwind.config.ts (excerpt)
export default {
  theme: {
    extend: {
      colors: {
        ink: '#1A1A18', bg: '#FAFAF7', surface: '#FFFFFF', 'surface-2': '#F1EFE8',
        border: '#E7E4D9', muted: '#9B9A91', secondary: '#6B6A63',
        purple: { DEFAULT: '#3C3489', bg: '#EEEDFE', strong: '#4B3F9C' },
        amber: { DEFAULT: '#C97A2E', bg: '#FAEEDA' },
        green: { DEFAULT: '#27500A', bg: '#EAF3DE' },
        red: '#8B3A3A',
      },
      fontFamily: {
        serif: ['var(--font-playfair)'], sans: ['var(--font-inter)'], mono: ['var(--font-jetbrains)'],
      },
      spacing: { /* 4px base scale — sp-1:4px through sp-8:32px, see Section 11 for the full table */ },
      borderRadius: { DEFAULT: '10px', sm: '7px', hero: '16px' }, // one scale only — no ad hoc radius values
      backgroundImage: {
        horizon: 'linear-gradient(115deg, #2E2768 0%, #4B3F9C 38%, #9A6A3C 78%, #C97A2E 100%)',
        dusk: 'linear-gradient(135deg, #EEEDFE 0%, #FAEEDA 100%)',
        route: 'linear-gradient(90deg, #3C3489, #C97A2E)',
      },
    },
  },
  darkMode: ['class'], // toggled via a `dark` class on <html>, matching the shipped dark-mode implementation
};
```

**Dark mode:** implement with Tailwind's `class` strategy (`html.dark`), not `media` — the shipped prototype has a manual toggle persisted to `localStorage`, not an OS-preference-only switch. Port the dark palette overrides (`--bg`, `--surface`, `--border` etc. all lighten/darken as already defined) as Tailwind CSS variables under `.dark`.

**Gradient rule:** `bg-horizon` is reserved for one hero moment per screen — never on buttons, tags, or more than one section. This is a documented brand rule, not a style suggestion; consider a lint comment or Storybook note enforcing it.

---

## 10. Component architecture (build to match what's already designed)

### 10.1 App shell (all 15 dashboard pages)
`(app)/layout.tsx` renders `<Sidebar role={role} activePath={pathname} />` + a main column with `<Navbar />` on top. Sidebar: brand mark, Student/Employer/Admin workspace switcher (routes to each role's home), role-scoped nav items with active-state highlighting, footer with Global Settings + Public site links. Collapses to an off-canvas drawer under `900px` with a hamburger toggle.

### 10.2 Navbar — three genuinely wired controls, not decorative icons
- **Language switcher**: dropdown (EN/AR/NL/FR), persists selection to `localStorage` today; wire to `next-intl` or `next-i18next` when the i18n pass lands (Section 12 — this is currently UI-only, not full translation).
- **Dark/light toggle**: toggles `dark` class on `<html>`, persists to `localStorage`, respects it on reload.
- **Profile dropdown**: avatar (initials, never a stock photo), name/email header, links to My Profile / Settings / Public site / Sign out.

### 10.3 Analytics charts — inline SVG, per dashboard
- **Admin Dashboard**: bar+line combo (active students vs. placements, 6-month trend) + donut (Track A vs B split by company count).
- **Employer Pipeline**: horizontal funnel bar (Viewed → Shortlisted → Interviewing → Placed).
- **Student Dashboard**: grouped bar (credits earned vs. spent, 8-week trend).
No charting library needed at this scale — keep them as typed React components that accept a small, explicit data prop (`{ labels: string[]; series: number[][] }`) rather than hardcoded SVG paths, so Cursor can wire real Firestore-aggregated data in without rebuilding the visual.

### 10.4 Public homepage — Video Cards & Podcast (admin-managed)
Both sections on `(public)/page.tsx` query `videoCards`/`podcastEpisodes` where `status == 'live'`, ordered by `position` / `episodeNumber`. Managed from `(app)/admin/homepage-content/page.tsx` — add/edit/reorder/status-toggle for both content types, using the same Draft/Live/Archived pattern as the Content Library. **Nothing on the public homepage should be hardcoded** — this was a specific requirement and should stay enforced structurally (the page component has no literal video/podcast data in it, only the Firestore query).

### 10.5 Public-page CMS fields (unchanged from the original footer-pages spec)
| Page | Firestore collection | Admin-managed fields |
|---|---|---|
| About | `pageAbout` (singleton doc) | heroHeadline, missionBody, statBlocks[], teamMembers[] |
| Careers | `jobPostings` | title, department, location, employmentType, description, status |
| Journal | `articles` | title, slug, coverImage, excerpt, body, author, category, publishedAt, tags[] |
| Browse Roles | `publicRoles` | title, employerLabel, sector, location, seniority, relocationSupport, description, status |
| How It Works | `pageHowItWorks` (singleton) | steps[], faqItems[] |
| Credits | *(no CMS — mirrors `contentItems` + `programLevers`, read-only)* | — |
| Pricing | `pagePricing` (singleton) | trackACopy, trackBCopy, faqItems[] *(numbers still come from `programLevers`)* |
| Track A/B | `pageTracks` (singleton) | comparisonRows[], caseStudyQuote |
| Request Talent | *(pure form → `requests` with `type: 'sourcing_request'`)* | — |
| Careers/Browse Roles forms | `jobApplications`, `roleInterestSubmissions` | visitor-submitted, surfaced in Admin CRM as leads |

---

## 11. Sizing & spacing (condensed — enforce via Tailwind spacing scale, not inline styles)

| Token | Value | Use |
|---|---|---|
| `sp-1` | 4px | icon-to-label gaps |
| `sp-2` | 8px | pill padding, dense-grid gaps |
| `sp-3` | 10px | small card padding |
| `sp-4` | 12px | **default** card/panel padding and grid gap |
| `sp-5` | 16px | section internal padding |
| `sp-6` | 20px | gaps between major blocks |
| `sp-8` | 28–32px | section-to-section rhythm |

Rules to bake into shared components (not left to per-page judgement):
- One border-radius scale: `sm` (7px, buttons/inputs), `DEFAULT` (10px, cards/panels/tables), `hero` (16px, hero banners only).
- One type scale: 12px (meta/caption), 14px (body default), 16px (lede). Display sizes (H1–H3) use Playfair Display per Section 9.
- Nav height: **60px**, identical for the marketing nav and the app navbar — do not let these drift into two different heights.
- Dense data grids (CRM, Integrations — anything with 6+ repeating cards) use `sp-2` gap / `sp-3` padding as a documented exception; everything else uses `sp-4`.
- 44px minimum tap target on every interactive element for the mobile breakpoint.
- Real breakpoints: `900px` (tablet — two-column layouts collapse, sidebar becomes a drawer), `600px` (mobile — stat grids go 2-col, card grids go 1-col, tables get horizontal scroll via a wrapping container).

---

## 12. Production readiness — the non-negotiable floor

Carried over from the full audit; these six are what separate "looks done" from "survives the first incident," adapted to this stack:

1. **Firestore Security Rules emulator tests** for every role boundary in Section 5 — a company reading another company's `matches` doc must fail, provably, in CI.
2. **Structured logging + error tracking** (Sentry works fine with Next.js + Cloud Functions) + basic alerting on function errors and elevated Firestore permission-denied rates.
3. **Secrets in Firebase Functions config / Vercel env vars**, never committed; dependency scanning (Dependabot) in CI; rate limiting on auth and `redeemCreditItem`.
4. **Firestore scheduled exports to Cloud Storage** (automated backup) with an actually-rehearsed restore, not just a scheduled export nobody has tested restoring from.
5. **CI/CD**: lint → typecheck → test → deploy, gated on every PR, with genuine staging/production Firebase project separation (two projects, not one project with a URL suffix).
6. **Idempotency on `redeemCreditItem` and `requestPlanChange`** — a double-click or retried Server Action must not double-spend credits or create duplicate requests. Use a client-generated idempotency key stored alongside the transaction.

Also worth carrying forward explicitly for this stack: **Firestore composite indexes must be defined in `firestore.indexes.json` and deployed** — several of the queries in Section 4 (`matches` by `companyId`+`stage`, `collectionGroup('creditTransactions')`) will fail in production without them even though they work fine against small emulator datasets. Do not discover this in production.

---

## 13. Roadmap priorities (condensed)

Full detail in the original Gap Analysis; the two lines that matter most for sequencing:

- **Before real users**: verification layer (candidate ID checks, company domain verification), real Stripe billing, a messaging thread on each `match` (currently nothing connects a shortlisted candidate to an actual conversation), and post-placement tracking (`matches.stage` currently treats "placed" as the finish line — add 30/60/90-day check-ins before building anything else post-MVP).
- **The actual moat, once the above exists**: a placement guarantee backed by real 90-day data, and a public per-corridor success-rate view. Both require the post-placement tracking to be real and running for a few months first — don't build the guarantee messaging before the data exists to back it.

---

## 14. Build sequence for Cursor

Work in this order — each phase should be a working, deployable slice, not a partial cross-cutting change:

1. **Scaffold**: Next.js + TS + Tailwind + Firebase SDK wiring (client + admin), fonts, design tokens from Section 9.
2. **Auth**: Firebase Auth email/password, session cookie exchange (`api/auth/session`), `users/{uid}` doc creation on signup with role selection.
3. **App shell**: Sidebar + Navbar components (Section 10.1–10.2) wired to a fake/static role first, dark mode + language switcher working before any real data is connected.
4. **Firestore rules + emulator tests**: write Section 5 rules and their tests *before* building pages against real data — this order matters, don't retrofit security.
5. **Student flow**: profile CRUD, dashboard stats, content store + `redeemCreditItem` transaction, credit ledger subcollection.
6. **Employer flow**: talent pool query + match creation, shortlist reorder, pipeline stage transitions, plan-change request.
7. **Admin flow**: dashboard KPIs (static first, then wire the scheduled aggregation function), content library CRUD, program levers, request approval, CRM (build the Cloud Function triggers that populate `crmContacts` from students/companies/requests).
8. **Public site**: all 10 marketing pages, CMS-driven per Section 10.5, video cards/podcast admin page.
9. **Charts**: wire the three chart components (Section 10.3) to real aggregated Firestore data via the scheduled Cloud Functions, replacing placeholder series.
10. **Integrations page + webhook handlers**: Stripe first (it's on the money path), then the rest.
11. **Production readiness pass**: Section 12, in the listed order, before this goes anywhere near real user data.

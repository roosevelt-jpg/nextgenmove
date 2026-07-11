# NextGen Move — Master Engineering Blueprint

**Tagline:** "Your next step, engineered."

> **Implementation stack (this repo):** Next.js App Router + TypeScript + Tailwind + Firebase (Auth, Firestore, Storage).  
> The Express + PostgreSQL architecture below is the original product blueprint. Feature intent still applies; persistence and APIs are Firebase/Next route handlers instead of Prisma/Express.

**Original blueprint stack sketch:** React (frontend) + Node/Express (API) + PostgreSQL (data)

---

## 1. Product Overview

NextGen Move is a three-sided platform run by an agency (in your screenshots, the operator is "Lemoni") that helps students/young professionals relocate into jobs abroad (the "Dubai market deep-dive" webinar suggests a Gulf-relocation angle), while companies pay to access a pre-screened, coached talent pool.

### 1.1 The three roles

| Role | Who they are | Core job to be done |
|---|---|---|
| **Student** | Job-seeker being coached/placed | Build profile, earn credits, redeem coaching services, get placed |
| **Company** | Employer paying for access to talent | Browse/search vetted candidates, shortlist, track hiring pipeline, request full-service sourcing |
| **Admin** (Lemoni ops) | The agency running the marketplace | Monitor KPIs, manage the coaching content catalog, tune program economics ("levers"), review pending requests |

### 1.2 The business model (inferred directly from your screenshots)

- **Two company subscription tracks** (seen on "Our Profile"):
  - **Track A — Self-service**: €50/mo + €200 one-time per successful match. Company browses the pool itself; Lemoni just makes the introduction.
  - **Track B — Lemoni does everything**: €125/mo per placed student. Full-service sourcing, weekly updates, full placement support.
- **Student-side monetization is credit-based**, funded partly by the agency and partly by paid top-ups:
  - Welcome credit: 2,000 cr on signup
  - Referral bonus: 150 cr
  - Profile-complete bonus: 100 cr
  - Placement fee charged to student on success: €350 (one-time)
- **Content Library** (admin-managed catalog students spend credits on): Mock interview (200cr/€50), LinkedIn polish (80cr/€20), CV review (80cr/€20), Salary negotiation webinar (80cr/€20), Dubai market deep-dive webinar (80cr/€20), 1:1 coaching call (140cr/€35), Premium placement (1600cr/€400), Interview outfit consult (80cr/€20), Company research pack (80cr/€20).
- Each catalog item has a **credit-to-EUR conversion** (visibly ~€0.25/credit across every item — confirm this ratio is fixed platform-wide before building the redemption engine).

---

## 2. Feature Inventory by Role

### 2.1 Company — Talent Pool
- Hero stats: Available / Shortlisted / Interviewing counts
- Search by name, skill, or location
- Candidate row: avatar initials, name, sector · city, top 3 skill tags, match % badge, "View profile" CTA
- Match % is a computed score (see §5.1)

### 2.2 Company — Pipeline
- Funnel KPIs: Viewed → Shortlisted → Interviews Planned → Placed
- "Active candidates" list — empty state when no one has moved past "viewed"
- This is effectively a lightweight ATS (applicant tracking) view scoped per company

### 2.3 Company — Shortlist
- Ranked list of starred candidates, drag-to-reorder
- Empty state instructs the company to star candidates from Talent Pool

### 2.4 Company — Our Profile
- Company identity (name, email)
- Subscription status badge + current monthly price
- Plan picker (Track A vs Track B) with a "Request this plan →" CTA (plan changes go through an approval/request flow, not instant self-serve)
- "Requirements & Uploads" panel — company can attach hiring requirements/docs

### 2.5 Admin — Operations Dashboard
- KPIs: Active Students, Open Requests, Placed This Quarter, Avg Time-to-Place
- **Content Library** management: add/edit coaching products (title, type, description, credit cost, EUR price, external link, emoji icon), each with a 3-way status toggle (interpret as **Draft / Live / Archived** — confirm exact semantics; screenshots show "Default | Live | Default" which likely renders as a segmented control where the *currently selected* state is highlighted)
- **Pending Requests** queue — company plan-change requests and sourcing requests land here for admin approval
- **Program Levers** — a single editable config panel controlling all platform economics (bonuses, fees, track pricing, redemption costs). This should be a key-value settings table, not hardcoded.

### 2.6 Student (not captured in screenshots — must be designed)
Given the credit/content model, the student side needs, at minimum:
- Dashboard: credit balance, profile completeness %, current placement stage
- Content Library storefront (mirrors admin catalog, filtered to `status = live`), redeem with credits
- Profile builder (skills, sector, location, bio) — feeds the match score
- Application/placement status tracker mirroring the company's pipeline view for that student
- Referral flow (generate code, track bonus credits)

---

## 3. Data Model

```
users
 ├─ id (pk)
 ├─ email (unique)
 ├─ password_hash
 ├─ role            enum: student | company | admin
 ├─ created_at

students
 ├─ id (pk)
 ├─ user_id (fk users)
 ├─ full_name
 ├─ sector
 ├─ city
 ├─ skills            text[]
 ├─ bio
 ├─ profile_complete  boolean
 ├─ credit_balance    int
 ├─ status            enum: available | shortlisted | interviewing | placed
 ├─ created_at

companies
 ├─ id (pk)
 ├─ user_id (fk users)
 ├─ name
 ├─ contact_email
 ├─ track             enum: A | B | none
 ├─ subscription_status  enum: active | pending | cancelled
 ├─ monthly_fee_eur
 ├─ created_at

matches                      -- one row per (company, student) pairing
 ├─ id (pk)
 ├─ company_id (fk)
 ├─ student_id (fk)
 ├─ match_score       numeric   -- see §5.1
 ├─ stage             enum: viewed | shortlisted | interview | placed
 ├─ shortlist_rank    int nullable
 ├─ created_at, updated_at

content_items
 ├─ id (pk)
 ├─ title
 ├─ type              enum: coaching | profile | webinar | premium
 ├─ description
 ├─ credit_cost
 ├─ price_eur
 ├─ link_url
 ├─ emoji_icon
 ├─ status            enum: draft | live | archived
 ├─ created_at, updated_at

credit_transactions
 ├─ id (pk)
 ├─ student_id (fk)
 ├─ direction         enum: earn | spend
 ├─ source            text        -- 'welcome' | 'referral' | 'profile_complete' | 'redeem:<content_id>'
 ├─ amount
 ├─ related_content_id (fk content_items, nullable)
 ├─ created_at

program_levers            -- singleton config table, admin-editable
 ├─ key (pk)              -- 'welcome_credit', 'referral_bonus', 'profile_complete_bonus',
 │                           'placement_fee_eur', 'track_a_monthly', 'track_a_match_fee',
 │                           'track_b_monthly', 'mock_interview_credits', 'webinar_credits'
 ├─ value                 numeric
 ├─ updated_at

requests                  -- company→admin asks: plan change, sourcing request, etc.
 ├─ id (pk)
 ├─ company_id (fk)
 ├─ type              enum: plan_change | sourcing_request | other
 ├─ payload           jsonb
 ├─ status            enum: pending | approved | rejected
 ├─ created_at, resolved_at

requirements_uploads
 ├─ id (pk)
 ├─ company_id (fk)
 ├─ file_url
 ├─ label
 ├─ uploaded_at
```

**Relationships:** `users` 1—1 `students`/`companies` (role-specific profile tables). `matches` is the join table driving both the Talent Pool match %, Pipeline funnel, and Shortlist ranking — all three company screens read from the same table with different filters, which keeps state consistent (this matters: your screenshots show Talent Pool available=24, but Pipeline viewed=6 — meaning "viewed" is a subset triggered by opening a profile, not by appearing in the pool).

---

## 4. API Specification (REST)

```
Auth
POST   /api/auth/register          { email, password, role }
POST   /api/auth/login             → { token }
POST   /api/auth/logout
GET    /api/auth/me

Talent Pool (company-facing)
GET    /api/students?search=&skill=&location=      -- paginated, includes match_score for :companyId
GET    /api/students/:id

Shortlist
POST   /api/companies/:id/shortlist        { studentId }
DELETE /api/companies/:id/shortlist/:studentId
PATCH  /api/companies/:id/shortlist/reorder { orderedStudentIds: [] }
GET    /api/companies/:id/shortlist

Pipeline
GET    /api/companies/:id/pipeline         -- returns funnel counts + active candidate list
PATCH  /api/matches/:id/stage              { stage }   -- move a candidate through the funnel

Company profile & plans
GET    /api/companies/:id
PATCH  /api/companies/:id
POST   /api/companies/:id/plan-request     { track: 'A' | 'B' }   -- creates a `requests` row, admin approves
POST   /api/companies/:id/requirements     (multipart upload)

Student
GET    /api/students/:id/dashboard         -- credits, profile %, stage
PATCH  /api/students/:id/profile
GET    /api/content-items?status=live
POST   /api/students/:id/redeem            { contentItemId }   -- validates balance, writes credit_transactions

Admin
GET    /api/admin/dashboard                -- KPIs: active students, open requests, placed this Q, avg time-to-place
GET    /api/admin/content-items
POST   /api/admin/content-items
PATCH  /api/admin/content-items/:id        (incl. status toggle)
DELETE /api/admin/content-items/:id
GET    /api/admin/levers
PATCH  /api/admin/levers                   { key, value }
GET    /api/admin/requests?status=pending
PATCH  /api/admin/requests/:id             { status: 'approved' | 'rejected' }
```

Auth: JWT bearer tokens, role claim checked via Express middleware (`requireRole('admin')` etc.) on every route above the student/company's own resources.

---

## 5. Business Logic

### 5.1 Match score
Not specified in the UI, so this needs an explicit, documented formula rather than a black box. Recommended v1 (simple, explainable, tunable later):

```
match_score = weighted_overlap(company.requirements_tags, student.skills)  × 0.6
            + location_fit(company.preferred_locations, student.city)     × 0.2
            + profile_completeness(student)                                × 0.2
```
Store the score on `matches` at creation time and recompute on a schedule (nightly job) rather than on every page load, so Talent Pool stays fast.

### 5.2 Credit economy
- All bonus/fee amounts live in `program_levers`, never hardcoded — this is exactly what the Admin "Program Levers" screen edits.
- Redemption is transactional: check `credit_balance >= content_item.credit_cost`, decrement balance, insert a `credit_transactions` row, all inside one DB transaction to avoid race conditions on concurrent redemptions.
- Credits and EUR are two separate ledgers — credits are internal currency; the €-figures next to catalog items are informational (what it would cost to buy credits), not a live payment. Confirm with stakeholders whether real payment (Stripe) is needed for credit top-ups, or whether credits are only ever earned, never purchased.

### 5.3 Plan changes are request-based, not instant
The "Request this plan →" button and the empty "Pending requests" panel on Admin confirm plan switches go through an approval workflow, not immediate self-serve billing changes. Model this explicitly as a `requests` row with `type = 'plan_change'`, not as a direct write to `companies.track`.

### 5.4 Content item status toggle
Before building, confirm with the client/PM what the 3-state toggle actually means — the two leading hypotheses:
- **Visibility state**: Draft → Live → Archived (most likely, given "Live" is highlighted green)
- **Default vs custom per-audience config**: "Default" bookending "Live" could mean per-track defaults (Track A default / Live override / Track B default)

This is the single biggest open ambiguity in the spec — resolve it before writing the admin content-editing logic.

---

## 6. Architecture

```
┌─────────────────────┐        ┌──────────────────────┐        ┌────────────────┐
│  React SPA (Vite)   │  REST  │  Node/Express API     │  SQL   │  PostgreSQL    │
│  role-based routing │ ─────► │  JWT auth, controllers│ ─────► │  (see §3)      │
│  /company /admin     │        │  services, validators │        │                │
│  /student            │ ◄───── │                       │ ◄───── │                │
└─────────────────────┘        └──────────┬────────────┘        └────────────────┘
                                            │
                                    ┌───────▼────────┐
                                    │ File storage    │  (S3-compatible, for
                                    │ (requirements   │   requirement uploads)
                                    │  uploads)       │
                                    └────────────────┘
```

### 6.1 Tech choices
- **Frontend**: React 18 + Vite, React Router (role-guarded routes), TanStack Query for server state, Tailwind for styling (matches the clean card/badge aesthetic in your screenshots)
- **Backend**: Node + Express, layered as routes → controllers → services → data access (Prisma ORM recommended over raw SQL for this schema's relational complexity)
- **Database**: PostgreSQL — enums as Postgres native enum types or check constraints; `matches` table needs a unique constraint on `(company_id, student_id)`
- **Auth**: JWT + bcrypt password hashing; refresh tokens if you want long-lived sessions
- **Background jobs**: a simple cron (node-cron or a scheduled Lambda) for nightly match-score recompute and `avg_time_to_place` KPI aggregation
- **File uploads**: S3 or Cloudflare R2 with pre-signed URLs; don't proxy file bytes through Express

### 6.2 Suggested repo structure
```
nextgenmove/
├── apps/
│   ├── web/                # React frontend
│   │   └── src/
│   │       ├── routes/
│   │       │   ├── company/   (talent-pool, pipeline, shortlist, profile)
│   │       │   ├── admin/     (dashboard, content-library, levers, requests)
│   │       │   └── student/   (dashboard, content-store, profile)
│   │       ├── components/
│   │       ├── api/            # typed API client
│   │       └── hooks/
│   └── api/                 # Express backend
│       └── src/
│           ├── routes/
│           ├── controllers/
│           ├── services/       # matchScore.ts, creditLedger.ts, planRequests.ts
│           ├── middleware/     # auth.ts, requireRole.ts
│           ├── db/             # prisma schema + migrations
│           └── jobs/           # nightly recompute
├── packages/
│   └── shared-types/         # TS types shared FE/BE (enums, DTOs)
└── docker-compose.yml         # postgres + api + web for local dev
```

---

## 7. Security & Access Control

- Every company-scoped route must verify `req.user.companyId === :id` (or admin override) — the Pipeline/Shortlist data is per-company and must never leak across tenants.
- Same rule for students accessing their own credit balance/profile.
- Admin routes require `role === 'admin'` middleware, no exceptions.
- File uploads: validate MIME type and size server-side before generating a pre-signed URL; never trust client-declared content type alone.
- Rate-limit `/api/auth/login` and `/api/students/:id/redeem` (credit redemption should be idempotent-safe against double-submits).

---

## 8. Build Roadmap

| Phase | Scope | Notes |
|---|---|---|
| **0. Foundation** | Auth, roles, DB schema, empty shells for all 3 role dashboards | Get the skeleton and role-guarded routing working first |
| **1. Company core** | Talent Pool (search/list), Candidate profile view, Shortlist (star + reorder) | This is the highest-visible surface in your screenshots |
| **2. Pipeline & matching** | `matches` table, stage transitions, match score v1, Pipeline dashboard | Depends on Phase 1 data existing |
| **3. Admin ops** | Dashboard KPIs, Content Library CRUD, Program Levers config | Levers must exist before credit logic in Phase 4 can be tuned live |
| **4. Credit economy** | Student dashboard, content storefront, redemption transaction logic, credit_transactions ledger | Ties student side to the admin-managed catalog |
| **5. Requests & plans** | Plan-change request flow, admin approval queue, requirements/uploads | Closes the loop on the "Our Profile" plan picker |
| **6. Polish** | Empty states (already partly designed in your screenshots), notifications, KPI trend charts | |

---

## 9. Open Questions to Resolve Before Building

1. What does the 3-way content-item toggle (**Default | Live | Default**) actually control? (§5.4)
2. Is the credit-to-EUR ratio fixed platform-wide (~4 credits = €1), and do students ever *purchase* credits, or only earn them?
3. Does "match %" need to be real-time/explainable to the company, or is a black-box score acceptable for v1?
4. Are Track A and Track B mutually exclusive per company, or can a company run both simultaneously for different hires?
5. Who can see a student's identity before shortlisting — is there an anonymized-until-shortlist mode (common in similar marketplaces), or is full name always visible as shown?

---

This blueprint is derived entirely from the UI states captured in your screenshots plus reasonable inference from the credit/subscription figures shown. The student-side screens weren't in your captures, so that section is designed to be consistent with the admin/company data model rather than reverse-engineered from a screenshot.

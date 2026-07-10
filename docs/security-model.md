# Security Model — NextGen Move

Access control is enforced in three layers:

1. **Firestore / Storage rules** (`firestore.rules`, `storage.rules`) — defense in depth for any direct Client SDK access.
2. **Next.js middleware + session cookies** — route-level portal gating (`/admin`, `/employer`, `/student`).
3. **Admin SDK API routes** (`src/app/api/**`) — primary read/write path for privileged operations, inbound forms, and purchases.

Roles are stored in Firestore `users/{uid}.role` (`admin` | `company` | `student`). Rules resolve role by reading the signed-in user's `users` document (no custom claims required).

Document IDs for `companies` and `students` match the owner's Firebase Auth UID.

---

## Firestore access matrix

| Collection | Public | Student | Company | Admin | Server (Admin SDK) |
|---|---|---|---|---|---|
| `users` | — | R/W own (no `role`/`status` self-edit) | R/W own (no `role`/`status` self-edit) | R/W all | R/W all |
| `companies` | — | — | R own; W own profile fields (not `plan`, `subscriptionStatus`) | R/W all | R/W all |
| `students` | — | R/W own profile (not `credits`, `status`) | R matched students only† | R/W all | R/W all |
| `matches` | — | R own | R own; W `stageId`/`shortlisted`/`notes`/`updatedAt` only | R/W all | R/W all |
| `match_access` | — | — | — | — | R/W all (client denied) |
| `articles` | R if `status=published` | R if published | R if published | R/W all | R/W all |
| `public_roles` | R if `status=open` | R if open | R if open | R/W all | R/W all |
| `content_items` | R if `status=live` (metadata only; files gated in Storage) | R if live | R if live | R/W all | R/W all |
| `job_postings` | R if `status=open` | R if open | R if open | R/W all | R/W all |
| `page_*` | R | R | R | W | R/W all |
| `program_levers` | R | R | R | W | R/W all |
| `site_settings` | R | R | R | W | R/W all |
| `taxonomies` | R | R | R | W | R/W all |
| `pipeline_stages` | — | — | R | W | R/W all |
| `integrations` | — | — | — | R/W | R/W all |
| `job_applications` | — | — | — | — | R/W all (client denied) |
| `role_interest_submissions` | — | — | — | — | R/W all (client denied) |
| `requests` | — | — | — | — | R/W all (client denied) |
| `newsletter_subscribers` | — | — | — | — | R/W all (client denied) |
| `content_purchases` | — | — | — | — | R/W all (client denied) |
| `activity_log` | — | — | — | — | R/W all (client denied) |
| `integration_secrets` | — | — | — | — | R/W all (client denied) |

**Legend:** R = read, W = write, — = denied.

† Companies can read a student profile in Firestore when a denormalized `match_access/{companyId}_{studentId}` document exists (written by Admin SDK when a `matches` row is created).

---

## Storage access matrix

| Path | Public read | Public write | Student | Company | Admin |
|---|---|---|---|---|---|
| `cvs/{studentId}/**` | — | — | W own | R† | R/W |
| `students/{studentId}/cv/**` (app path) | — | — | W own | R† | R/W |
| `student-photos/{studentId}/**` | R | — | W own | R | R/W |
| `students/{studentId}/photo/**` (app path) | R | — | W own | R | R/W |
| `company-logos/{companyId}/**` | R | — | — | W own | R/W |
| `companies/{companyId}/logo/**` (app path) | R | — | — | W own | R/W |
| `companies/{companyId}/requirements/**` | — | — | — | R/W own | R/W |
| `content/{contentItemId}/**` | — | — | — | — | W (download via API) |
| `journal-covers/**` | R | — | — | — | W |
| `team-photos/**` | R | — | — | — | W |
| `admin/**` | R | — | — | — | W |
| `job-descriptions/**` | — | — | — | W | R/W |
| `careers/applications/{jobId}/**` | — | W (upload only) | — | — | R |
| `requests/sourcing/**` | — | W (upload only) | — | — | R |
| `roles/interest/{roleId}/**` | — | W (upload only) | — | — | R |

† Company CV read requires `match_access/{companyId}_{studentId}` in Firestore (maintained by Admin SDK).

All uploads are capped at **15 MB** in rules. PDF/image-only constraints apply where noted.

---

## Privileged fields (Admin SDK only)

These fields must never be writable by portal clients — rules block direct Client SDK writes; API routes use the Admin SDK:

| Collection | Field(s) | Changed via |
|---|---|---|
| `companies` | `plan`, `subscriptionStatus` | `/api/admin/**`, `/api/employer/plan-request` |
| `students` | `credits` | `/api/student/store/purchase` (transaction) |
| `students` | `status` | `/api/admin/**`, `/api/student/deactivate` |
| `users` | `role`, `status` | `/api/admin/users`, registration & suspend flows |
| `integrations` | secrets | `/api/admin/integrations/[id]/connect` → `integration_secrets` |

---

## Purchase-gated content downloads

Store asset files under `content/{contentItemId}/**`. Storage rules deny all client reads.

Students download purchased files through:

```
GET /api/student/store/download/[contentItemId]
```

The route verifies `content_purchases` for the signed-in student, then streams the object from Storage using the Admin SDK.

---

## Match access index

Storage and Firestore rules cannot query the `matches` collection. When a match is created, Admin SDK routes write:

```
match_access/{companyId}_{studentId}
  companyId, studentId, active: true
```

This document is client-inaccessible (`allow read, write: if false`) and exists solely for rules evaluation.

---

## Deployment

```bash
firebase deploy --only firestore:rules,storage
```

Rule files: `firestore.rules`, `storage.rules` (referenced from `firebase.json`).

Ensure `INTEGRATION_ENCRYPTION_KEY` is set in production for integration secret encryption at rest (see Phase 7).

---

## Audit notes

- Default deny is the catch-all in both rule files.
- Portal pages primarily use Admin SDK API routes; Firestore/Storage rules protect against direct Client SDK abuse.
- Anonymous inbound forms (careers apply, request talent, role interest) may upload files to designated Storage paths (write-only); metadata is persisted exclusively through API routes.

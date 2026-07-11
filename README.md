# NextGen Move

Next.js App Router + TypeScript + Tailwind + Firebase (Auth, Firestore, Storage).

Canonical product docs (project root — do not fork copies):

- `NextGenMove_Master_Blueprint.md` — product features & business logic (implemented on **Next.js + Firebase**, not the Postgres/Express sketch in §6)
- `NextGenMove_Production_Readiness_Audit.md` — production readiness bar
- Spacing / type scale lives in `src/styles/tokens.css` (4px spacing scale from the sizing spec)

## Local setup

1. Copy `.env.local.example` → `.env.local` and fill Firebase + `SESSION_SECRET`.
2. `npm install`
3. `npm run seed` — operational config only (taxonomies, program levers, one super-admin). Never seeds demo companies/students.
4. `npm run dev` — http://localhost:3002

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server on port 3002 |
| `npm run build` / `npm start` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest (match score, credits, RBAC tenant boundaries, idempotency) |
| `npm run verify:rbac` | Static portal route → role map |
| `npm run seed` | Seed operational Firestore config |

## Environments

Use **separate** Firebase projects (and Stripe keys when live) for `dev` / `staging` / `production`. Do not point staging at production data.

Production secrets (Stripe, DocuSign, SendGrid, etc.) must be injected from a secrets manager into the host env — never committed. See `docs/ops/secrets.md`.

## Production floor (audit § non-negotiables)

Implemented against the live Firebase stack (not the blueprint’s Postgres sketch):

1. Auth / role-boundary tests (`src/lib/security/tenant-boundary.test.ts`)
2. Structured JSON request logging + optional Sentry (`SENTRY_DSN`)
3. Rate limits on login / register / redeem / plan-request; Dependabot; secrets runbook
4. Backup / restore runbook for Firestore (`docs/ops/backup-restore.md`)
5. CI: lint → typecheck → test → build (`.github/workflows/ci.yml`)
6. Idempotency keys on redeem + plan-request

Ops: `docs/ops/` (SLOs, incident runbook, backup, secrets).

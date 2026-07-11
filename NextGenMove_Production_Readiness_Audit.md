# NextGen Move — Production Readiness Audit

> **Implementation status (live stack):** see `docs/ops/production-floor.md`. This audit remains the bar; the app is Next.js + Firebase (not the blueprint’s Postgres/Express sketch). Floor items are wired into existing routes — no parallel demo systems.

*Not "what should we add later" — this is "what does not currently meet the bar to run real money, real visas, and real personal data through it."*

Everything below is scoped as if this ships to paying Track B enterprise customers and real relocating candidates on day one. Nothing here is deferred to "v2."

---

## 1. Reliability & Observability — currently absent

A production system is judged by what happens when something breaks, not by the happy path. None of the following exists yet:

| Gap | Requirement |
|---|---|
| No structured logging | Every API request logged with request ID, user ID, role, latency, status — correlatable end to end (JSON logs, not console.log) |
| No error tracking | Sentry (or equivalent) wired into both frontend and API, with source maps, so a candidate's failed credit redemption produces a stack trace, not silence |
| No APM / tracing | Distributed tracing (OpenTelemetry) across API → DB → third-party calls (Stripe, DocuSign, LinkedIn API), so a slow "Redeem" click is diagnosable in minutes, not hours |
| No uptime monitoring or status page | External synthetic checks (every core flow: login, talent pool load, redeem, plan request) + a public status page — Track B enterprise contracts will contractually require this |
| No defined SLOs/SLAs | Need explicit targets before launch: API p95 latency budget, uptime target (99.9%?), and what "degraded" vs "down" means — undefined today |
| No incident response process | No runbook, no on-call rotation, no severity levels, no postmortem template. First real incident becomes ad hoc firefighting instead of a practiced process |
| No alerting thresholds | Error-rate spikes, queue backlogs, failed webhook deliveries (Stripe/DocuSign) — none of this pages anyone currently |

**Why this matters more than it looks:** this product touches visa timelines and payroll-adjacent payments. A silent failure in the credit redemption transaction or a missed Stripe webhook isn't a UX bug — it's a candidate who thinks they paid for a mock interview and didn't get one, or a company that thinks a plan change was approved and it wasn't.

---

## 2. Testing — currently zero coverage

The blueprint specifies endpoints and schema; it specifies no tests. For production, "we'll test manually" does not scale past the first release.

| Layer | Requirement |
|---|---|
| Unit tests | Credit ledger logic, match-score calculation, plan-request state machine — these are the modules where a silent bug directly costs money or breaks trust. Target meaningful coverage on business logic specifically, not a vanity % |
| Integration tests | Every API route, run against a real (test) Postgres instance, including auth/role-boundary tests (a Company user must never be able to read another company's pipeline — this needs an explicit automated test per the Security section of the original blueprint, not just a code comment) |
| End-to-end tests | Playwright/Cypress covering the core funnels: candidate signup → profile complete → credit redemption; company signup → shortlist → plan request; admin → approve request → lever change reflects live |
| Load testing | k6 or Locust against Talent Pool search and the redemption endpoint specifically — these are the two paths most likely to see concurrent-write race conditions |
| Contract tests for third-party integrations | Stripe, DocuSign, LinkedIn Talent API, VisaConnect — mock their failure modes explicitly (timeout, 4xx, malformed payload) and assert the system degrades gracefully, not silently |

**Non-negotiable before first paying Track B customer:** the auth/role-boundary integration tests. This is the one category of bug that turns into a data-leak headline.

---

## 3. Security — from "documented" to "verified"

The earlier pass named the gap (no security posture documented). Production-ready means each of these is *implemented and verified*, not just written down.

| Gap | Requirement |
|---|---|
| No secrets management | API keys (Stripe, DocuSign, LinkedIn, Twilio, SendGrid — all nine integrations on the Integrations page) currently implied to live in `.env` files. Production needs a real secrets manager (AWS Secrets Manager / Vault) with rotation, not files that end up in a laptop backup |
| No rate limiting spec | "Rate-limit login and redeem" was named but never specified — needs actual numbers (requests/min per IP and per user), enforced at the gateway, not the app layer |
| No dependency/vulnerability scanning | Dependabot/Snyk in CI, blocking merge on critical CVEs — npm supply-chain compromises are a live, common attack vector |
| No penetration test | Before handling visa documents and payment data, a third-party pen test is a baseline expectation, not a nice-to-have — and will be asked for by any serious Track B enterprise customer's procurement team |
| No WAF / DDoS layer | Cloudflare or equivalent in front of the API, not just app-level rate limiting |
| No audit log for admin actions | Program Levers changes, content-item edits, request approvals — an admin can currently change the placement fee or approve a plan with zero record of *who* did it *when*. This is both a security and a compliance gap |
| Auth is JWT-only, no session revocation story | If a coach's laptop is stolen, there is currently no way to invalidate their existing tokens immediately — needs a revocation list or short-lived tokens + refresh rotation |
| File uploads (requirements, CVs, JDs) unscanned | Antivirus/malware scanning on upload before storage, not just MIME-type validation |

---

## 4. Data protection & compliance — full depth, not a checkbox

The earlier analysis flagged GDPR at a high level. Production-ready means each mechanism actually exists in the schema and API, not just a policy PDF:

| Requirement | What's actually missing |
|---|---|
| Right to erasure | No `deleted_at`/anonymization path in the schema. "Delete my account" today would mean either hard-deleting rows that other tables foreign-key against (breaking referential integrity) or doing nothing. Needs a designed anonymization flow |
| Data residency | EU candidate data and UAE-based processing — needs an explicit decision on where Postgres and backups physically live, documented for the DPA |
| Consent tracking | No table recording *what* a user consented to and *when* (marketing emails vs. required processing) — required for GDPR defensibility, not just ethically nice |
| Data retention automation | `credit_transactions`, `matches`, and uploaded documents have no retention policy or automated purge — "we'll get to it" is not a compliant answer to a data subject access request |
| DPA with every sub-processor | Stripe, SendGrid, Twilio, LinkedIn, DocuSign, VisaConnect — each needs a signed DPA on file before their integration goes live in production, not after |
| Backup & disaster recovery | No stated RPO/RTO. Needs automated, tested (not just scheduled) Postgres backups, and a documented, *rehearsed* restore procedure — an untested backup is not a backup |

---

## 5. Scalability & performance engineering

The architecture doc specifies a single Postgres instance and a single API tier. That's fine for the first customers; it is not a production capacity plan.

| Gap | Requirement |
|---|---|
| No caching layer | Talent Pool search, match-score reads, and content-library reads all hit Postgres directly on every request. Needs Redis for hot-path reads before this becomes a bottleneck, not after |
| No async job infrastructure | Nightly match-score recompute is specified as "a cron job" — at production scale this needs a real queue (BullMQ/SQS) with retry/backoff and dead-letter handling, especially since it feeds a customer-facing % score |
| No read replica strategy | Admin dashboard KPI queries (aggregate counts across all students/companies) will compete with live transactional writes on the same instance without one |
| No CDN | Static assets and the public marketing site (10 pages) should not be served from the app origin |
| No defined capacity/cost model | No answer yet to "what does this cost at 10,000 active students" — needed before signing enterprise contracts with volume commitments |
| No horizontal scaling plan for the API tier | Single Express instance with JWT auth should be stateless and trivially replicable behind a load balancer — needs to be verified, not assumed |

---

## 6. DevOps & release engineering

| Gap | Requirement |
|---|---|
| No CI/CD pipeline specified | Needs: lint → typecheck → test → build → deploy, gated, on every PR — not manual deploys |
| No environment parity | Needs dev / staging / production as genuinely separate infrastructure (separate DBs, separate Stripe test/live keys), not "staging is prod with a different URL" |
| No infrastructure-as-code | Terraform/Pulumi for reproducible infra — "someone clicked around in the AWS console" is not production-grade and is not auditable |
| No migration strategy | Prisma migrations need a documented forward-and-rollback process, tested in staging against production-shaped data before every release |
| No feature flag system | Given the credit economy and pricing levers are live business logic, shipping a change to `program_levers` behavior needs to be flaggable/rollback-able independent of a full deploy |
| No blue-green or canary deploy strategy | A bad deploy currently means full downtime until a manual rollback — needs zero-downtime deploys as a baseline |

---

## 7. Accessibility & internationalization

Given the actual user base (European candidates relocating to Dubai, Arabic-speaking market on the destination side):

| Gap | Requirement |
|---|---|
| No WCAG compliance target | Should target WCAG 2.1 AA minimum — currently unaddressed in every screen built so far |
| No i18n framework | All copy is hardcoded English strings across 25+ pages. Needs a translation layer (react-i18next or similar) before this is genuinely production-ready for a market where the destination is a non-English-primary business environment |
| No RTL support | Arabic is a strong candidate for a supported locale given the Dubai focus — the entire CSS/layout system (built left-to-right throughout) has no RTL consideration today |
| No keyboard-navigation / screen-reader pass | Every custom component built so far (pills, toggles, the drag-to-reorder shortlist) needs an explicit accessibility pass — drag-to-reorder in particular needs a non-drag fallback |

---

## 8. API & third-party integration robustness

Nine integrations are shown as connected on the Integrations page. Production-ready means each one survives failure, not just succeeds on the happy path.

| Gap | Requirement |
|---|---|
| No webhook reliability strategy | Stripe and DocuSign webhooks need idempotency keys, signature verification, and a dead-letter queue for failed processing — "we'll retry manually" does not scale |
| No API versioning | `/api/students/:id` etc. has no version prefix — a breaking change to the credit redemption contract currently has no safe rollout path |
| No documented rate limits for partner APIs | LinkedIn Talent API and Google Calendar both have their own rate limits — nothing in the current design handles backoff/throttling against them |
| No idempotency on money-moving endpoints | `POST /api/students/:id/redeem` and plan-request creation need idempotency keys so a double-click or retried request can't double-charge credits or create duplicate requests |

---

## 9. Documentation & operational maturity

| Gap | Requirement |
|---|---|
| No API documentation | OpenAPI/Swagger spec generated from the actual routes, not just the markdown table in the blueprint |
| No onboarding docs | A new engineer today has the blueprint and the code — no README covering local setup, environment variables, seed data |
| No customer-facing SLA/support tier documentation | Track B enterprise customers will ask "what happens when something breaks" before signing — needs a documented support tier, response time commitment, and escalation path |
| No architecture decision records | Why Prisma over raw SQL, why Postgres over Mongo, why JWT over sessions — undocumented decisions become re-litigated arguments six months in |

---

## What "production ready" actually requires before first paying customer

Collapsing all of the above into the non-negotiable floor — not the full list, the floor:

1. **Auth/role-boundary integration tests** (Section 2) — the single highest-consequence gap
2. **Structured logging + error tracking + basic alerting** (Section 1) — you cannot operate blind
3. **Secrets management + rate limiting + dependency scanning** (Section 3) — minimum viable security posture
4. **A tested, automated backup with a rehearsed restore** (Section 4) — an unverified backup is a false sense of safety
5. **CI/CD with staging parity** (Section 6) — manual deploys to a system handling payments and visa data is not acceptable at any stage
6. **Idempotency on the redeem and plan-request endpoints** (Section 8) — direct money/credit correctness

Everything else in this document is real, and should be sequenced in — but these six are the difference between "production ready" and "looks production ready until the first incident."

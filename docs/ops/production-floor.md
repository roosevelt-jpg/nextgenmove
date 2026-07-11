# Production readiness floor — status

Source of truth: `NextGenMove_Production_Readiness_Audit.md` (project root).

Stack adaptation: audit text mentions Postgres/Express; this app is **Next.js + Firebase**. Requirements are implemented on the live stack.

| Floor item | Status | Where |
|---|---|---|
| Auth/role-boundary tests | Done | `src/lib/security/tenant-boundary.test.ts`, `npm run verify:rbac` |
| Structured logging + error tracking | Done | `src/lib/observability/*`, optional `SENTRY_DSN` |
| Secrets + rate limiting + dependency scanning | Done | `docs/ops/secrets.md`, rate limits on auth/redeem/plan-request, Dependabot |
| Tested backup + restore procedure | Documented + rehearsal required | `docs/ops/backup-restore.md` |
| CI/CD with gated PR checks | Done | `.github/workflows/ci.yml` |
| Idempotency on redeem + plan-request | Done | purchase + plan-request routes + client `Idempotency-Key` |

Remaining audit sections (APM, pen test, WAF, i18n, etc.) stay sequenced after this floor — do not treat them as optional forever; they are not yet the launch blocker list above.

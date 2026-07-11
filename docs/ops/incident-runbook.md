# Incident response

## Severity

| Level | Meaning | Example | Response |
|---|---|---|---|
| SEV-1 | Payments / credits / visas blocked for many users | Redeem double-charge, auth outage | Page on-call immediately |
| SEV-2 | Major feature degraded | Talent pool errors, plan approvals stuck | Respond within 30 min |
| SEV-3 | Limited impact | Single integration timeout | Business hours |

## First 15 minutes

1. Acknowledge in the on-call channel; assign an incident lead.
2. Capture `x-request-id` from failing responses / JSON logs.
3. Check `/api/health` and Firebase status.
4. If credit or plan-request corruption suspected: freeze related Admin actions; do not “fix data” without a ledger trail.

## Postmortem

Within 5 business days of SEV-1/2: timeline, root cause, customer impact, action items with owners. No blame language — fix the system.

## Alerting (minimum)

Wire host/log alerts for:

- API 5xx rate > 2% over 5 minutes
- Auth `/api/auth/session` 429 spike (possible attack)
- Failed redeem rate spike
- Firestore export job failure

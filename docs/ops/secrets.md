# Secrets management

## Rule

Never commit `.env.local`, Firebase private keys, or `integration_secrets` payloads. Only `.env.local.example` is tracked.

## Local

Copy `.env.local.example` → `.env.local`. Values stay on the developer machine.

## Staging / production

1. Store secrets in **AWS Secrets Manager**, **GCP Secret Manager**, or **Vault**.
2. Inject into the host (Vercel / Cloud Run / etc.) as environment variables at deploy time.
3. Rotate integration keys from the Admin → Integrations UI after rotating the upstream secret; the app stores encrypted/connected metadata in Firestore `integrations` and secret material in Admin-SDK-only `integration_secrets`.
4. Set `SENTRY_DSN` in the secrets manager when error tracking goes live.

## Required server secrets

| Variable | Purpose |
|---|---|
| `FIREBASE_ADMIN_*` | Admin SDK |
| `SESSION_SECRET` | Role cookie signing |
| `SENTRY_DSN` | Optional error tracking |

Client `NEXT_PUBLIC_FIREBASE_*` values are public by design; still use separate projects per environment.

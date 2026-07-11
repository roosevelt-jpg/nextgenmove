# Branded email (SendGrid)

Transactional email is CMS-driven. Connect SendGrid once; templates and brand come from Firestore.

## Connect

1. Verify a sender in [SendGrid](https://app.sendgrid.com/) (Single Sender or Domain Auth).
2. Create an API key with Mail Send permission (`SG.…`).
3. Set `NEXT_PUBLIC_APP_URL` and optionally `INTEGRATION_ENCRYPTION_KEY`.
4. Run seed: `npx tsx scripts/seed.ts` (creates `email_templates/*` + SendGrid integration shell).
5. **Admin → Integrations → SendGrid → Connect**:
   - API key
   - From email (verified)
   - From name

Brand chrome (logo, site name, tagline, support email) comes from **Site settings**.

## What sends automatically

| Event | Template id |
|-------|-------------|
| Account created | `account_created` |
| Email verification | `email_verification` |
| Welcome (after profile photo/logo) | `welcome` |
| Login alert | `account_login` |
| Suspicious login (new IP) | `suspicious_login` |
| Forgot / reset password | `password_reset` |
| Password changed | `password_changed` |
| Welcome credits | `welcome_credits` |
| Low credit balance | `low_credit_balance` |
| Top-up requested / successful | `topup_requested`, `topup_successful` |
| Referral bonus | `referral_bonus` |
| Plan request / activated | `plan_request_received`, `plan_activated` |
| Payment failed | `payment_failed` |
| Match pipeline update | `match_update` |
| Form submission ack | `form_submission_ack` |
| Admin pending | `admin_pending_alert` |

Security templates ignore notification preferences. Product/billing templates respect `notificationPreferences` keys (default ON).

## Forgot password

Public page: `/forgot-password` → `/api/auth/forgot-password` → Firebase reset link emailed via branded `password_reset` template.

## Edit copy

Admin collection `email_templates` — subject, `htmlBody`, `textBody`, `preferenceKey`, `enabled`. Variables use `{{displayName}}`, `{{siteName}}`, `{{appUrl}}`, etc.

Low-balance threshold: `program_levers.lowCreditThreshold` (default 50).

If SendGrid is not connected, sends are skipped and logged (`email_skipped_not_configured`) — app flows still succeed.

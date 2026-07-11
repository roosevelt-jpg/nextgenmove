# Stripe billing

Once Stripe credentials are connected in Admin → Integrations, Checkout and monthly auto-debit work without further code changes.

## Connect (one-time)

1. Set `NEXT_PUBLIC_APP_URL` to your public site URL (e.g. `https://your-domain.com`). Used for Checkout success/cancel and the Customer Portal return URL.
2. Optional but recommended: set `INTEGRATION_ENCRYPTION_KEY` to a long random string so keys are encrypted at rest in `integration_secrets`.
3. Run seed if needed so `integrations/stripe` exists: `npx tsx scripts/seed.ts`.
4. In **Admin → Integrations → Stripe → Connect**, paste:
   - Secret key (`sk_test_…` or `sk_live_…`)
   - Publishable key (`pk_…`) — stored for reference
   - Webhook signing secret (`whsec_…`)
5. In [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks), add endpoint:
   - URL: `{NEXT_PUBLIC_APP_URL}/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
6. Copy the endpoint’s signing secret into the Connect form (`whsec_…`).

## What goes live automatically

| Flow | Behaviour |
|------|-----------|
| Employer plan (Track A / B) | Stripe Checkout `mode: subscription`, monthly recurring price → **auto-debit** each month on the saved card |
| Manage billing | Stripe Customer Portal (update card / cancel) |
| Student credit top-up | Stripe Checkout `mode: payment` (one-time charge); credits applied on `checkout.session.completed` |
| Stripe not connected | Employer falls back to admin plan-request; student top-up creates a pending admin request |

## Notes

- Webhooks must reach a publicly reachable URL. Locally use Stripe CLI: `stripe listen --forward-to localhost:3002/api/webhooks/stripe`.
- Idempotent webhook handling uses `stripe_webhook_events` (Admin SDK only).
- Plan amounts come from `program_levers` (`trackAMonthly` / `trackBMonthly`).

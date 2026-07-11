# SLOs / SLAs (launch)

| Signal | Target | Degraded | Down |
|---|---|---|---|
| Availability (core APIs) | 99.9% monthly | Elevated 5xx or partial feature loss | Login or redeem unavailable |
| API p95 latency | ≤ 800 ms for auth/session, redeem, talent pool list | p95 > 1.5 s for 15 min | Timeouts > 5% |
| Credit redeem correctness | 100% ledger balance matches transactions | Any mismatch | Double-spend or silent drop |

Synthetic checks (external) should hit every 1–5 minutes:

1. `GET /api/health`
2. Sign-in path (staging credentials)
3. Talent pool list (company session)
4. Redeem + plan-request (staging only)

Public status: publish incidents on the customer status page once Track B contracts require it; until then keep internal status in ops channel + `/api/health`.

# Firestore backup & restore

Stack note: production data lives in **Firebase Firestore + Storage**, not Postgres. RPO/RTO targets still apply.

## Targets (launch)

| Metric | Target |
|---|---|
| RPO | ≤ 24 hours (daily automated export) |
| RTO | ≤ 4 hours (documented restore to a fresh project) |

## Automated backup

1. Enable [Firestore scheduled exports](https://firebase.google.com/docs/firestore/manage-data/export-import) to a dedicated GCS bucket (`gs://nextgenmove-<env>-firestore-backups`).
2. Enable Storage object versioning / separate backup bucket for CVs and content files.
3. Retain ≥ 30 daily exports; test restore quarterly.

## Restore rehearsal (required before first paying Track B customer)

1. Create a scratch Firebase project.
2. Import the latest export into that project.
3. Point a staging deploy at the scratch project credentials.
4. Verify: admin login, talent pool query, one credit redeem, one plan-request approval.
5. Record date + operator in the incident log / ops calendar.

An untested backup is not a backup.

# Firebase setup for `osa-document-os-prod-1a127`

This project is prepared to use Firebase as the production backend while keeping
the legacy SQLite database safe.

## Recommended Firebase services

- Authentication: enable Email/Password first; add Google login later if needed.
- Firestore: production database, locked by `firestore.rules`.
- Storage: PDFs, logos, and attachments, locked by `storage.rules`.

## Collections

The migration keeps legacy numeric IDs in `legacy_id` fields and uses stable
document IDs like `customers/legacy-12`. This makes the first import repeatable
without exposing the old SQLite file to GitHub or Netlify.

| SQLite table | Firestore collection | Notes |
| --- | --- | --- |
| company_profile | company_profile | Usually one document: `main` |
| document_settings | document_settings | Document ID from `document_type` |
| customers | customers | Contains business/customer records; protect carefully |
| projects | projects | References `customer_legacy_id` initially |
| quotations | quotations | References `project_legacy_id` initially |
| quotation_items | quotation_items | References `quotation_legacy_id` initially |
| documents | documents | References project/quotation/invoice legacy IDs |
| invoices | invoices | Accounting-only writes |
| receipts | receipts | Accounting-only writes |
| project_costs | project_costs | Accounting/admin writes |
| office_expenses | office_expenses | Accounting/admin visibility |
| workflow_events | workflow_events | Operational audit trail |
| reference_options | reference_options | Master data |

## Safe migration sequence

1. Create Firebase project `osa-document-os-prod-1a127`.
2. Enable Firestore in production mode.
3. Enable Firebase Authentication.
4. Add your first admin user in Firebase Auth.
5. Create `users/{uid}` in Firestore:

   ```json
   {
     "email": "your-email@example.com",
     "role": "admin",
     "created_at": "2026-07-15T00:00:00Z"
   }
   ```

6. Deploy `firestore.rules` and `storage.rules`.
7. Download a Firebase Admin service account JSON and keep it outside the repo.
8. Run migration first as dry-run:

   ```bash
   python3 scripts/migrate_sqlite_to_firestore.py \
     --sqlite "/absolute/path/to/data/octa.db" \
     --project-id osa-document-os-prod-1a127 \
     --dry-run
   ```

9. If counts look right, run the real import:

   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json \
   python3 scripts/migrate_sqlite_to_firestore.py \
     --sqlite "/absolute/path/to/data/octa.db" \
     --project-id osa-document-os-prod-1a127 \
     --apply
   ```

## Important safety notes

- Do not commit `data/octa.db`.
- Do not commit Firebase service account JSON.
- Do not make Firestore rules public during testing.
- Do not run migration with `--apply` until the first admin user and rules are ready.
- Keep the old local app as the source of truth until Firebase data is verified.

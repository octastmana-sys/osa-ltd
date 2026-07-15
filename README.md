# OSA Document OS (`osa-ltd`)

Deployable web portal for Octa / OSA document operations.

Current version is a safe migration portal:

- Shows an anonymized operating snapshot from the legacy local SQLite app.
- Does not commit or upload `data/octa.db`.
- Includes Firebase + Netlify setup files for the new production backend.
- Includes a dry-run-first SQLite → Firestore migration script.

## Accounts and services

- GitHub repo: `octastmana-sys/osa-ltd`
- Firebase project: `osa-document-os-prod-1a127`
- Netlify: connect this repo and set the environment variables from `.env.example`

## Local development

```bash
npm install
npm run dev
npm run build
```

## Netlify settings

```text
Build command: npm run build
Publish directory: dist/client
Node version: 22
```

The same settings are also stored in `netlify.toml`.

## Firebase setup

See [docs/firebase/README.md](docs/firebase/README.md).

Before importing real data:

1. Enable Firebase Authentication.
2. Enable Firestore in production mode.
3. Enable Storage.
4. Create the first admin user for `octa.stm.ana@gmail.com`.
5. Deploy `firestore.rules` and `storage.rules`.
6. Run migration dry-run, then run `--apply` only when ready.

## Safe migration dry-run

```bash
python3 scripts/migrate_sqlite_to_firestore.py \
  --sqlite "/absolute/path/to/data/octa.db" \
  --dry-run
```

## Do not commit

- `.env.local`
- Firebase service account JSON
- `data/octa.db`
- PDFs, customer documents, or private exported files

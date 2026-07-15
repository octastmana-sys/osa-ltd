#!/usr/bin/env python3
"""Migrate Octa legacy SQLite data to Firestore.

Default mode is dry-run. Use --apply only after Firebase Auth, Firestore rules,
and a first admin user are configured.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import sqlite3
from pathlib import Path
from typing import Any


TABLES: tuple[str, ...] = (
    "company_profile",
    "document_settings",
    "customers",
    "projects",
    "document_numbers",
    "quotations",
    "quotation_items",
    "documents",
    "invoices",
    "receipts",
    "project_costs",
    "office_expenses",
    "workflow_events",
    "reference_options",
)


COLLECTION_BY_TABLE = {
    "company_profile": "company_profile",
    "document_settings": "document_settings",
    "customers": "customers",
    "projects": "projects",
    "document_numbers": "document_numbers",
    "quotations": "quotations",
    "quotation_items": "quotation_items",
    "documents": "documents",
    "invoices": "invoices",
    "receipts": "receipts",
    "project_costs": "project_costs",
    "office_expenses": "office_expenses",
    "workflow_events": "workflow_events",
    "reference_options": "reference_options",
}


def connect_sqlite(path: Path) -> sqlite3.Connection:
    uri = f"file:{path}?mode=ro"
    conn = sqlite3.connect(uri, uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def table_exists(conn: sqlite3.Connection, table: str) -> bool:
    row = conn.execute(
        "select 1 from sqlite_master where type = 'table' and name = ?",
        (table,),
    ).fetchone()
    return row is not None


def row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    data = dict(row)
    for key, value in list(data.items()):
        if isinstance(value, bytes):
            data[key] = value.decode("utf-8", errors="replace")
    return data


def document_id(table: str, row: dict[str, Any]) -> str:
    if table == "company_profile":
        return "main"
    if table == "document_settings":
        return str(row["document_type"])
    if table == "reference_options":
        return f"{row.get('option_type', 'option')}-{row.get('id')}"
    legacy_id = row.get("id")
    if legacy_id is None:
        raise ValueError(f"Cannot build document ID for {table}: missing id")
    return f"legacy-{legacy_id}"


def transform(table: str, row: dict[str, Any], migration_id: str) -> dict[str, Any]:
    data = dict(row)
    if "id" in data:
        data["legacy_id"] = data["id"]
        del data["id"]

    # Keep legacy references explicit for the first import. A later normalization
    # pass can replace these with Firestore DocumentReferences if desired.
    for key in ("customer_id", "project_id", "quotation_id", "invoice_id"):
        if key in data and data[key] is not None:
            data[f"{key.removesuffix('_id')}_legacy_id"] = data[key]
            del data[key]

    data["_migration"] = {
        "id": migration_id,
        "source": "sqlite",
        "source_table": table,
        "imported_at": dt.datetime.now(dt.timezone.utc).isoformat(),
    }
    return data


def load_rows(conn: sqlite3.Connection, table: str) -> list[dict[str, Any]]:
    if not table_exists(conn, table):
        return []
    return [row_to_dict(row) for row in conn.execute(f"select * from {table}")]


def dry_run_report(conn: sqlite3.Connection) -> dict[str, Any]:
    counts = {}
    samples = {}
    for table in TABLES:
        rows = load_rows(conn, table)
        counts[table] = len(rows)
        if rows:
            sample = transform(table, rows[0], "dry-run")
            samples[table] = {
                "collection": COLLECTION_BY_TABLE[table],
                "document_id": document_id(table, rows[0]),
                "fields": sorted(sample.keys()),
            }
    return {"counts": counts, "samples": samples}


def import_firestore(conn: sqlite3.Connection, project_id: str, batch_size: int) -> dict[str, int]:
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
    except ImportError as exc:
        raise SystemExit(
            "Missing firebase-admin. Install it in a temporary venv before applying migration:\n"
            "python3 -m pip install firebase-admin"
        ) from exc

    if not firebase_admin._apps:
        firebase_admin.initialize_app(
            credentials.ApplicationDefault(),
            {"projectId": project_id},
        )

    db = firestore.client()
    migration_id = dt.datetime.now(dt.timezone.utc).strftime("sqlite-%Y%m%d-%H%M%S")
    imported: dict[str, int] = {}

    batch = db.batch()
    pending = 0

    def commit_if_needed(force: bool = False) -> None:
        nonlocal batch, pending
        if pending and (force or pending >= batch_size):
            batch.commit()
            batch = db.batch()
            pending = 0

    for table in TABLES:
        collection = COLLECTION_BY_TABLE[table]
        rows = load_rows(conn, table)
        imported[table] = len(rows)
        for row in rows:
            doc_ref = db.collection(collection).document(document_id(table, row))
            batch.set(doc_ref, transform(table, row, migration_id), merge=True)
            pending += 1
            commit_if_needed()

    run_ref = db.collection("migration_runs").document(migration_id)
    batch.set(
        run_ref,
        {
            "id": migration_id,
            "project_id": project_id,
            "counts": imported,
            "created_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        },
    )
    pending += 1
    commit_if_needed(force=True)
    return imported


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sqlite", required=True, type=Path)
    parser.add_argument("--project-id", default="osa-document-os-prod-1a127")
    parser.add_argument("--batch-size", default=400, type=int)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    if args.apply == args.dry_run:
        raise SystemExit("Choose exactly one: --dry-run or --apply")
    if not args.sqlite.exists():
        raise SystemExit(f"SQLite file not found: {args.sqlite}")

    conn = connect_sqlite(args.sqlite)
    if args.dry_run:
        print(json.dumps(dry_run_report(conn), ensure_ascii=False, indent=2))
        return

    result = import_firestore(conn, args.project_id, args.batch_size)
    print(json.dumps({"imported": result}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

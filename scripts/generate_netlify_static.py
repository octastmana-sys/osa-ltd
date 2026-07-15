#!/usr/bin/env python3
"""Create a static Netlify entrypoint for the current migration portal.

Vinext produces Cloudflare/Sites-compatible server output plus client assets.
Netlify static hosting needs an index.html in the publish directory, so this
script renders the current read-only dashboard snapshot into dist/client.
"""

from __future__ import annotations

import html
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist" / "client"
SUMMARY_PATH = DIST / "data" / "octa-summary.json"


def esc(value: object) -> str:
    return html.escape("" if value is None else str(value), quote=True)


def money(value: float) -> str:
    return f"฿{value:,.0f}"


def number(value: float) -> str:
    return f"{value:,.0f}"


def percent(value: float, max_value: float) -> int:
    if max_value <= 0:
        return 4
    return max(4, round((value / max_value) * 100))


def css_href() -> str:
    css_files = sorted((DIST / "assets").glob("index-*.css"))
    if not css_files:
        raise SystemExit("No compiled CSS asset found in dist/client/assets")
    return f"/assets/{css_files[-1].name}"


def stat(label: str, value: int) -> str:
    return f"""
    <div class="stat-card">
      <span>{esc(label)}</span>
      <strong>{number(value)}</strong>
    </div>"""


def money_card(label: str, value: float, alert: bool = False) -> str:
    cls = "money-card alert" if alert else "money-card"
    return f"""
    <div class="{cls}">
      <span>{esc(label)}</span>
      <strong>{money(value)}</strong>
    </div>"""


def bar_rows(rows: list[dict], max_value: float, value_key: str = "total") -> str:
    out = []
    for row in rows:
        value = float(row.get(value_key) or 0)
        out.append(
            f"""
            <div class="bar-row">
              <span>{esc(row.get("month"))}</span>
              <div><i style="width:{percent(value, max_value)}%"></i></div>
              <strong>{money(value)}</strong>
            </div>"""
        )
    return "\n".join(out)


def status_rows(rows: list[dict], label_key: str) -> str:
    max_count = max((int(row.get("count") or 0) for row in rows), default=1)
    out = []
    for row in rows:
        label = row.get(label_key) or "unknown"
        count = int(row.get("count") or 0)
        out.append(
            f"""
            <div class="status-row">
              <div><span>{esc(label)}</span><strong>{number(count)}</strong></div>
              <i style="width:{percent(count, max_count)}%"></i>
            </div>"""
        )
    return "\n".join(out)


def main() -> None:
    data = json.loads(SUMMARY_PATH.read_text(encoding="utf-8"))
    counts = data["counts"]
    financials = data["financials"]
    quotation_max = max((float(row.get("total") or 0) for row in data["monthly_quotations"]), default=1)
    invoice_max = max((float(row.get("total") or 0) for row in data["monthly_invoices"]), default=1)

    modules = [
        ("Sales intake", "New Job, customer, project code, quotation draft"),
        ("Quotation", "Items, VAT, totals, HTML preview, PDF pipeline"),
        ("Billing", "Delivery notes, invoices, tax invoices, receipts"),
        ("Control", "Document numbers, settings pack, backups, health API"),
        ("Costs", "Project costs and office expenses for margin visibility"),
        ("AI-ready", "Structured SQLite records and JSON summary routes"),
    ]

    html_doc = f"""<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Octa Document OS Migration Portal</title>
  <meta name="description" content="A deployable, read-only migration portal for Octa Local Web App operations." />
  <meta property="og:title" content="Octa Document OS Migration Portal" />
  <meta property="og:description" content="A deployable, read-only migration portal for Octa Local Web App operations." />
  <meta property="og:image" content="/og.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" href="/favicon.svg" />
  <link rel="stylesheet" href="{css_href()}" />
</head>
<body>
<main class="min-h-screen bg-[#f5f3ed] text-[#18211f]">
  <section class="hero">
    <div class="hero__glow"></div>
    <nav class="nav">
      <div>
        <p class="eyebrow">Octa Document OS</p>
        <h1>Deployable migration portal for the local document system</h1>
      </div>
      <div class="safe-pill">Read-only snapshot · legacy DB untouched</div>
    </nav>
    <div class="hero__grid">
      <div class="hero__copy">
        <p class="thai-kicker">ระบบเว็บใหม่สำหรับย้าย Octa Local Web App ขึ้นสู่เว็บจริงแบบปลอดภัย</p>
        <h2>A cloud-ready front door for sales, quotations, billing, receipts, and document workflow.</h2>
        <p>This first migration layer preserves the original portable app and exposes only anonymized operating metrics from a read-only snapshot. It is designed to become the hosted application shell before adding authentication, cloud database writes, and document storage.</p>
        <div class="hero__actions">
          <a href="#migration">Migration plan</a>
          <a href="#snapshot" class="secondary">View snapshot</a>
        </div>
      </div>
      <div class="control-card">
        <div class="control-card__top"><span>System health</span><strong>Migration-safe</strong></div>
        <div class="metric-stack">
          <div><small>Records summarized</small><strong>{number(counts["projects"] + counts["quotations"] + counts["documents"] + counts["invoices"] + counts["receipts"])}</strong></div>
          <div><small>Quotation pipeline</small><strong>{money(financials["quotation_total"])}</strong></div>
          <div><small>Outstanding invoices</small><strong>{money(financials["invoice_outstanding"])}</strong></div>
        </div>
        <p>Snapshot generated {esc(data["generated_at"])}. No customer names, contact details, tax IDs, addresses, document numbers, or free-text project details are included.</p>
      </div>
    </div>
  </section>

  <section class="section stats" id="snapshot">
    <div class="section__heading">
      <p class="eyebrow">Live legacy snapshot</p>
      <h2>Operational data is available, but isolated from writes.</h2>
      <p>The original SQLite database remains the source system. This website ships with a sanitized analytics snapshot so deployment cannot mutate old records.</p>
    </div>
    <div class="stats__grid">
      {stat("Customers", counts["customers"])}
      {stat("Projects", counts["projects"])}
      {stat("Quotations", counts["quotations"])}
      {stat("Documents", counts["documents"])}
      {stat("Invoices", counts["invoices"])}
      {stat("Receipts", counts["receipts"])}
    </div>
  </section>

  <section class="section split">
    <div class="panel">
      <p class="eyebrow">Financial picture</p>
      <h3>Billing and collection view</h3>
      <div class="money-grid">
        {money_card("Quotation total", financials["quotation_total"])}
        {money_card("Invoice total", financials["invoice_total"])}
        {money_card("Invoice paid", financials["invoice_paid"])}
        {money_card("Outstanding", financials["invoice_outstanding"], True)}
        {money_card("Project costs", financials["project_cost_total"])}
        {money_card("Office expenses", financials["office_expense_total"])}
      </div>
    </div>
    <div class="panel dark">
      <p class="eyebrow">Document engine</p>
      <h3>Existing modules ready to migrate</h3>
      <div class="module-list">
        {"".join(f"<div><strong>{esc(title)}</strong><span>{esc(body)}</span></div>" for title, body in modules)}
      </div>
    </div>
  </section>

  <section class="section charts">
    <div class="chart-card">
      <div><p class="eyebrow">Quotation trend</p><h3>Monthly quotation pipeline</h3></div>
      <div class="bars">{bar_rows(data["monthly_quotations"], quotation_max)}</div>
    </div>
    <div class="chart-card">
      <div><p class="eyebrow">Invoice trend</p><h3>Monthly invoice movement</h3></div>
      <div class="bars invoice">{bar_rows(data["monthly_invoices"], invoice_max)}</div>
    </div>
  </section>

  <section class="section split">
    <div class="panel">
      <p class="eyebrow">Project status</p>
      <h3>Current work distribution</h3>
      <div class="status-list">{status_rows(data["project_status"], "status")}</div>
    </div>
    <div class="panel">
      <p class="eyebrow">Document status</p>
      <h3>Generated document mix</h3>
      <div class="status-list">{status_rows(data["document_types"], "document_type")}</div>
    </div>
  </section>

  <section class="section roadmap" id="migration">
    <div class="section__heading">
      <p class="eyebrow">Migration route</p>
      <h2>Four safe steps from portable local app to hosted system.</h2>
    </div>
    <div class="roadmap__grid">
      {"".join(f"<article><span>{esc(item['phase'])}</span><h3>{esc(item['name'])}</h3><p>{esc(item['status'])}</p><small>{esc(item['risk'])}</small></article>" for item in data["migration_plan"])}
    </div>
  </section>

  <footer>
    <div><strong>{esc(data["company"]["name_en"])}</strong><span>{esc(data["company"]["name_th"])}</span></div>
    <p>Built as a separate deployable project. Legacy app files and data/octa.db are not modified by this portal.</p>
  </footer>
</main>
</body>
</html>"""

    (DIST / "index.html").write_text(html_doc, encoding="utf-8")
    (DIST / "_redirects").write_text("/* /index.html 200\n", encoding="utf-8")
    print(f"Wrote {DIST / 'index.html'}")


if __name__ == "__main__":
    main()

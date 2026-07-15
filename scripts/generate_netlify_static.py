#!/usr/bin/env python3
"""Create the static Netlify entrypoint for Octa Document OS."""

from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist" / "client"


def css_href() -> str:
    css_files = sorted((DIST / "assets").glob("index-*.css"))
    if not css_files:
        raise SystemExit("No compiled CSS asset found in dist/client/assets")
    return f"/assets/{css_files[-1].name}"


def main() -> None:
    html_doc = f"""<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Octa Document OS</title>
  <meta name="description" content="Octa Document OS production web app." />
  <link rel="icon" href="/favicon.svg" />
  <link rel="stylesheet" href="{css_href()}" />
</head>
<body>
<main class="osa-app">
  <section class="login-screen" id="login-screen">
    <form class="login-card" id="live-login-form">
      <div class="login-brand">
        <div class="octa-logo">O</div>
        <div><b>OCTA</b><span>Document OS</span></div>
      </div>
      <h1>เข้าสู่ระบบ</h1>
      <p>ลงชื่อเข้าใช้เพื่อจัดการงาน เอกสาร ลูกค้า ใบเสนอราคา และการวางบิล</p>
      <label>Email<input id="live-email" type="email" autocomplete="email" value="octa.stm.ana@gmail.com" /></label>
      <label>Password<input id="live-password" type="password" autocomplete="current-password" /></label>
      <button type="submit">Login</button>
      <div class="live-status" id="live-status">พร้อมเข้าสู่ระบบ</div>
    </form>
  </section>

  <section class="live-data hidden" id="live-data">
    <div class="octa-local-shell" id="octa-local-shell">
      <aside class="octa-side">
        <div class="octa-brand">
          <div class="octa-logo">O</div>
          <div><b>OCTA</b><span>Document OS</span></div>
        </div>
        <nav class="octa-nav" id="octa-nav">
          <button type="button" data-view="home">Home / Overview</button>
          <button type="button" data-view="customers">Customers</button>
          <button type="button" data-view="projects">Projects</button>
          <button type="button" data-view="project_costs">Project Costs</button>
          <button type="button" data-view="office_expenses">Office Expenses</button>
          <button type="button" data-view="quotations">Quotations</button>
          <button type="button" data-view="documents">Documents</button>
          <button type="button" data-view="invoices">Invoices</button>
          <button type="button" data-view="receipts">Receipts</button>
          <button type="button" data-view="billing">Billing & Collection</button>
          <button type="button" data-view="settings">System Setup</button>
        </nav>
      </aside>
      <main class="octa-main">
        <div class="octa-top">
          <div>
            <h2 id="octa-title">Home / Overview</h2>
            <p id="octa-subtitle">ภาพรวมงานค้างตามขั้นตอนขายและเอกสาร</p>
          </div>
          <div class="octa-actions">
            <button class="btn home" type="button" data-view-action="home">Home</button>
            <button class="btn" type="button" id="octa-new-record">+ New</button>
            <button class="btn ghost" id="live-sign-out" type="button">Sign out</button>
          </div>
        </div>
        <div id="octa-view"></div>
      </main>
    </div>

    <div class="editor-modal hidden" id="editor-modal" aria-hidden="true">
      <div class="editor-card">
        <div class="editor-head">
          <div><p class="eyebrow">Record Editor</p><h2>Create / Edit Firestore record</h2></div>
          <button class="btn ghost" type="button" id="editor-close">Close</button>
        </div>
        <div class="editor-grid compact-editor">
          <aside class="record-list-panel">
            <label>Collection<select id="workbench-collection"></select></label>
            <div class="workbench-count" id="workbench-count">0 records</div>
            <div class="record-list" id="workbench-records"></div>
          </aside>
          <div class="json-editor-panel">
            <label>Document ID<input id="workbench-doc-id" placeholder="Blank = auto ID for new record" /></label>
            <label>JSON data<textarea id="workbench-json" spellcheck="false">{{}}</textarea></label>
            <div class="workbench-actions">
              <button id="workbench-new" type="button">New</button>
              <button id="workbench-save" type="button">Save</button>
              <button id="workbench-refresh" type="button">Refresh</button>
              <button id="workbench-delete" class="danger" type="button">Delete</button>
            </div>
            <div class="live-status compact" id="workbench-status">Ready.</div>
          </div>
        </div>
      </div>
    </div>

    <div class="editor-modal hidden" id="document-create-modal" aria-hidden="true">
      <form class="editor-card document-create-card" id="document-create-form">
        <div class="editor-head">
          <div><p class="eyebrow">Create Document</p><h2>สร้างเอกสารใหม่</h2></div>
          <button class="btn ghost" type="button" id="document-create-close">Close</button>
        </div>
        <div class="form-grid document-form-grid">
          <label>ประเภทเอกสาร
            <select name="document_type" id="document-create-type">
              <option value="DeliveryNote">Delivery Note</option>
              <option value="SalesTaxInvoice">Tax Invoice</option>
              <option value="TaxInvoiceReceipt">Tax Invoice Receipt</option>
              <option value="Receipt">Receipt</option>
              <option value="PurchaseOrder">Purchase Order</option>
            </select>
          </label>
          <label>วันที่เอกสาร<input name="document_date" id="document-create-date" type="date" /></label>
          <label class="full">Project<select name="project_id" id="document-create-project"></select></label>
          <label class="full">Invoice / เอกสารอ้างอิง<select name="invoice_id" id="document-create-invoice"></select></label>
          <label>เลขเอกสาร<input name="document_no" id="document-create-no" placeholder="เว้นว่างเพื่อสร้างเลขชั่วคราวอัตโนมัติ" /></label>
          <label>Status
            <select name="status" id="document-create-status">
              <option value="draft">draft</option>
              <option value="issued">issued</option>
              <option value="sent">sent</option>
              <option value="cancelled">cancelled</option>
            </select>
          </label>
          <label class="full">Note<textarea name="note" id="document-create-note" placeholder="หมายเหตุ"></textarea></label>
        </div>
        <div class="workbench-actions">
          <button type="submit">Create document</button>
          <button class="ghost" type="button" id="document-create-cancel">Cancel</button>
        </div>
        <div class="live-status compact" id="document-create-status-message">Ready.</div>
      </form>
    </div>

    <div class="editor-modal hidden" id="record-create-modal" aria-hidden="true">
      <form class="editor-card document-create-card" id="record-create-form">
        <div class="editor-head">
          <div><p class="eyebrow" id="record-create-eyebrow">Create Record</p><h2 id="record-create-title">สร้างรายการใหม่</h2></div>
          <button class="btn ghost" type="button" id="record-create-close">Close</button>
        </div>
        <div class="form-grid document-form-grid" id="record-create-fields"></div>
        <div class="workbench-actions">
          <button type="submit" id="record-create-submit">Create</button>
          <button class="ghost" type="button" id="record-create-cancel">Cancel</button>
        </div>
        <div class="live-status compact" id="record-create-status-message">Ready.</div>
      </form>
    </div>
  </section>

  <script>
  window.OSA_FIREBASE_CONFIG = {{
    apiKey: "AIzaSyCQU5oGQ2d5vugzLoMwxwyFHBtD3EAc5v0",
    authDomain: "osa-document-os-prod-1a127.firebaseapp.com",
    projectId: "osa-document-os-prod-1a127",
    storageBucket: "osa-document-os-prod-1a127.firebasestorage.app",
    messagingSenderId: "524435498120",
    appId: "1:524435498120:web:c91ed5a264e1d5d1b76b3d"
  }};
  </script>
  <script type="module" src="/live-firestore.js"></script>
</main>
</body>
</html>
"""
    DIST.mkdir(parents=True, exist_ok=True)
    (DIST / "index.html").write_text(html_doc, encoding="utf-8")
    print(f"Wrote {DIST / 'index.html'}")


if __name__ == "__main__":
    main()

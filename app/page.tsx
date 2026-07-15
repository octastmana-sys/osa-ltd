export default function Home() {
  return (
    <main className="osa-app">
      <section className="login-screen" id="login-screen">
        <form className="login-card" id="live-login-form">
          <div className="login-brand">
            <div className="octa-logo">O</div>
            <div>
              <b>OCTA</b>
              <span>Document OS</span>
            </div>
          </div>
          <h1>เข้าสู่ระบบ</h1>
          <p>ลงชื่อเข้าใช้เพื่อจัดการงาน เอกสาร ลูกค้า ใบเสนอราคา และการวางบิล</p>
          <label>
            Email
            <input id="live-email" type="email" autoComplete="email" defaultValue="octa.stm.ana@gmail.com" />
          </label>
          <label>
            Password
            <input id="live-password" type="password" autoComplete="current-password" />
          </label>
          <button type="submit">Login</button>
          <div className="live-status" id="live-status">
            พร้อมเข้าสู่ระบบ
          </div>
        </form>
      </section>

      <section className="live-data hidden" id="live-data">
        <div className="octa-local-shell" id="octa-local-shell">
          <aside className="octa-side">
            <div className="octa-brand">
              <div className="octa-logo">O</div>
              <div><b>OCTA</b><span>Document OS</span></div>
            </div>
            <nav className="octa-nav" id="octa-nav">
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
          <main className="octa-main">
            <div className="octa-top">
              <div>
                <h2 id="octa-title">Home / Overview</h2>
                <p id="octa-subtitle">ภาพรวมงานค้างตามขั้นตอนขายและเอกสาร</p>
              </div>
              <div className="octa-actions">
                <button className="btn home" type="button" data-view-action="home">Home</button>
                <button className="btn" type="button" id="octa-new-record">+ New</button>
                <button className="btn ghost" id="live-sign-out" type="button">Sign out</button>
              </div>
            </div>
            <div id="octa-view"></div>
          </main>
        </div>

        <div className="editor-modal hidden" id="editor-modal" aria-hidden="true">
          <div className="editor-card">
            <div className="editor-head">
              <div>
                <p className="eyebrow">Record Editor</p>
                <h2>Create / Edit Firestore record</h2>
              </div>
              <button className="btn ghost" type="button" id="editor-close">Close</button>
            </div>
            <div className="editor-grid compact-editor">
              <aside className="record-list-panel">
                <label>
                  Collection
                  <select id="workbench-collection"></select>
                </label>
                <div className="workbench-count" id="workbench-count">0 records</div>
                <div className="record-list" id="workbench-records" />
              </aside>
              <div className="json-editor-panel">
                <label>
                  Document ID
                  <input id="workbench-doc-id" placeholder="Blank = auto ID for new record" />
                </label>
                <label>
                  JSON data
                  <textarea id="workbench-json" spellCheck={false} defaultValue={"{}"}></textarea>
                </label>
                <div className="workbench-actions">
                  <button id="workbench-new" type="button">New</button>
                  <button id="workbench-save" type="button">Save</button>
                  <button id="workbench-refresh" type="button">Refresh</button>
                  <button id="workbench-delete" className="danger" type="button">Delete</button>
                </div>
                <div className="live-status compact" id="workbench-status">Ready.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <script
        dangerouslySetInnerHTML={{
          __html: `window.OSA_FIREBASE_CONFIG=${JSON.stringify({
            apiKey: "AIzaSyCQU5oGQ2d5vugzLoMwxwyFHBtD3EAc5v0",
            authDomain: "osa-document-os-prod-1a127.firebaseapp.com",
            projectId: "osa-document-os-prod-1a127",
            storageBucket: "osa-document-os-prod-1a127.firebasestorage.app",
            messagingSenderId: "524435498120",
            appId: "1:524435498120:web:c91ed5a264e1d5d1b76b3d",
          })};`,
        }}
      />
      <script type="module" src="/live-firestore.js" />
    </main>
  );
}

import summary from "../public/data/octa-summary.json";

type StatusRow = {
  status?: string;
  stage?: string;
  document_type?: string;
  count: number;
  total?: number;
  paid?: number;
};

type MonthlyRow = {
  month: string;
  count: number;
  total: number;
  paid?: number;
};

const money = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat("th-TH");

function formatMoney(value: number) {
  return money.format(value || 0);
}

function formatNumber(value: number) {
  return number.format(value || 0);
}

function percent(value: number, max: number) {
  if (!max) return "0%";
  return `${Math.max(4, Math.round((value / max) * 100))}%`;
}

const counts = summary.counts;
const financials = summary.financials;
const quotationMax = Math.max(
  ...summary.monthly_quotations.map((row: MonthlyRow) => row.total),
  1,
);
const invoiceMax = Math.max(
  ...summary.monthly_invoices.map((row: MonthlyRow) => row.total),
  1,
);

const modules = [
  ["Sales intake", "New Job, customer, project code, quotation draft"],
  ["Quotation", "Items, VAT, totals, HTML preview, PDF pipeline"],
  ["Billing", "Delivery notes, invoices, tax invoices, receipts"],
  ["Control", "Document numbers, settings pack, backups, health API"],
  ["Costs", "Project costs and office expenses for margin visibility"],
  ["AI-ready", "Structured SQLite records and JSON summary routes"],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f5f3ed] text-[#18211f]">
      <section className="hero">
        <div className="hero__glow" />
        <nav className="nav">
          <div>
            <p className="eyebrow">Octa Document OS</p>
            <h1>Deployable migration portal for the local document system</h1>
          </div>
          <div className="safe-pill">Read-only snapshot · legacy DB untouched</div>
        </nav>

        <div className="hero__grid">
          <div className="hero__copy">
            <p className="thai-kicker">ระบบเว็บใหม่สำหรับย้าย Octa Local Web App ขึ้นสู่เว็บจริงแบบปลอดภัย</p>
            <h2>
              A cloud-ready front door for sales, quotations, billing, receipts,
              and document workflow.
            </h2>
            <p>
              This first migration layer preserves the original portable app and
              exposes only anonymized operating metrics from a read-only snapshot.
              It is designed to become the hosted application shell before adding
              authentication, cloud database writes, and document storage.
            </p>
            <div className="hero__actions">
              <a href="#migration">Migration plan</a>
              <a href="#snapshot" className="secondary">View snapshot</a>
            </div>
          </div>

          <div className="control-card">
            <div className="control-card__top">
              <span>System health</span>
              <strong>Migration-safe</strong>
            </div>
            <div className="metric-stack">
              <div>
                <small>Records summarized</small>
                <strong>
                  {formatNumber(
                    counts.projects +
                      counts.quotations +
                      counts.documents +
                      counts.invoices +
                      counts.receipts,
                  )}
                </strong>
              </div>
              <div>
                <small>Quotation pipeline</small>
                <strong>{formatMoney(financials.quotation_total)}</strong>
              </div>
              <div>
                <small>Outstanding invoices</small>
                <strong>{formatMoney(financials.invoice_outstanding)}</strong>
              </div>
            </div>
            <p>
              Snapshot generated {summary.generated_at}. No customer names,
              contact details, tax IDs, addresses, document numbers, or free-text
              project details are included.
            </p>
          </div>
        </div>
      </section>

      <section className="section stats" id="snapshot">
        <div className="section__heading">
          <p className="eyebrow">Live legacy snapshot</p>
          <h2>Operational data is available, but isolated from writes.</h2>
          <p>
            The original SQLite database remains the source system. This website
            ships with a sanitized analytics snapshot so deployment cannot mutate
            old records.
          </p>
        </div>
        <div className="stats__grid">
          <Stat label="Customers" value={counts.customers} />
          <Stat label="Projects" value={counts.projects} />
          <Stat label="Quotations" value={counts.quotations} />
          <Stat label="Documents" value={counts.documents} />
          <Stat label="Invoices" value={counts.invoices} />
          <Stat label="Receipts" value={counts.receipts} />
        </div>
      </section>

      <section className="section live-console" id="live-console">
        <div className="section__heading">
          <p className="eyebrow">Live Firestore</p>
          <h2>Sign in to read the migrated production database.</h2>
          <p>
            This console uses Firebase Authentication and your Firestore role
            document. It reads live migrated records and does not write data yet.
          </p>
        </div>
        <div className="live-shell">
          <form className="live-login" id="live-login-form">
            <label>
              Email
              <input id="live-email" type="email" autoComplete="email" defaultValue="octa.stm.ana@gmail.com" />
            </label>
            <label>
              Password
              <input id="live-password" type="password" autoComplete="current-password" />
            </label>
            <button type="submit">Sign in</button>
          </form>
          <div className="live-status" id="live-status">
            Sign in with your Firebase account to view live Firestore data.
          </div>
            <div className="live-data hidden" id="live-data">
              <div className="live-toolbar">
                <div>
                  <strong id="live-user-email">Signed in</strong>
                  <span>Role: <b id="live-user-role">staff</b></span>
                </div>
                <button id="live-sign-out" type="button">Sign out</button>
              </div>
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
                    </div>
                  </div>
                  <div id="octa-view"></div>
                </main>
              </div>
              <div className="stats__grid live-stats">
                <div className="stat-card"><span>Customers</span><strong id="live-count-customers">0</strong></div>
              <div className="stat-card"><span>Projects</span><strong id="live-count-projects">0</strong></div>
              <div className="stat-card"><span>Quotations</span><strong id="live-count-quotations">0</strong></div>
              <div className="stat-card"><span>Documents</span><strong id="live-count-documents">0</strong></div>
              <div className="stat-card"><span>Invoices</span><strong id="live-count-invoices">0</strong></div>
              <div className="stat-card"><span>Receipts</span><strong id="live-count-receipts">0</strong></div>
            </div>
            <div className="money-grid live-money">
              <div className="money-card"><span>Quotation total</span><strong id="live-quotation-total">฿0</strong></div>
              <div className="money-card"><span>Invoice total</span><strong id="live-invoice-total">฿0</strong></div>
              <div className="money-card"><span>Paid total</span><strong id="live-paid-total">฿0</strong></div>
              <div className="money-card alert"><span>Costs + expenses</span><strong id="live-cost-total">฿0</strong></div>
            </div>
            <div className="split live-split">
              <div className="panel">
                <p className="eyebrow">Project status</p>
                <div className="chip-list" id="live-project-status" />
              </div>
              <div className="panel">
                <p className="eyebrow">Quotation status</p>
                <div className="chip-list" id="live-quotation-status" />
              </div>
            </div>
            <div className="live-tables">
              <div className="panel"><h3>Latest projects</h3><div id="live-projects-table" /></div>
              <div className="panel"><h3>Latest quotations</h3><div id="live-quotations-table" /></div>
              <div className="panel"><h3>Latest invoices</h3><div id="live-invoices-table" /></div>
            </div>
            <div className="workbench">
              <div className="section__heading mini">
                <p className="eyebrow">Operations Workbench</p>
                <h2>Create, edit, and delete Firestore records.</h2>
                <p>
                  This is the first production management surface. Use quick forms
                  for common work and the JSON editor for all migrated collections.
                </p>
              </div>
              <div className="quick-panel">
                <h3>Quick add customer</h3>
                <form id="quick-customer-form" className="quick-form">
                  <input name="name" placeholder="Customer name *" />
                  <input name="contact_name" placeholder="Contact name" />
                  <input name="phone" placeholder="Phone" />
                  <input name="email" placeholder="Email" />
                  <input name="tax_id" placeholder="Tax ID" />
                  <input name="credit_term" placeholder="Credit term" />
                  <textarea name="address" placeholder="Address"></textarea>
                  <button type="submit">Create customer</button>
                </form>
              </div>
              <div className="editor-grid">
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
        </div>
      </section>

      <section className="section split">
        <div className="panel">
          <p className="eyebrow">Financial picture</p>
          <h3>Billing and collection view</h3>
          <div className="money-grid">
            <Money label="Quotation total" value={financials.quotation_total} />
            <Money label="Invoice total" value={financials.invoice_total} />
            <Money label="Invoice paid" value={financials.invoice_paid} />
            <Money label="Outstanding" value={financials.invoice_outstanding} tone="alert" />
            <Money label="Project costs" value={financials.project_cost_total} />
            <Money label="Office expenses" value={financials.office_expense_total} />
          </div>
        </div>

        <div className="panel dark">
          <p className="eyebrow">Document engine</p>
          <h3>Existing modules ready to migrate</h3>
          <div className="module-list">
            {modules.map(([title, body]) => (
              <div key={title}>
                <strong>{title}</strong>
                <span>{body}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section charts">
        <div className="chart-card">
          <div>
            <p className="eyebrow">Quotation trend</p>
            <h3>Monthly quotation pipeline</h3>
          </div>
          <div className="bars">
            {summary.monthly_quotations.map((row: MonthlyRow) => (
              <div className="bar-row" key={row.month}>
                <span>{row.month}</span>
                <div>
                  <i style={{ width: percent(row.total, quotationMax) }} />
                </div>
                <strong>{formatMoney(row.total)}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="chart-card">
          <div>
            <p className="eyebrow">Invoice trend</p>
            <h3>Monthly invoice movement</h3>
          </div>
          <div className="bars invoice">
            {summary.monthly_invoices.map((row: MonthlyRow) => (
              <div className="bar-row" key={row.month}>
                <span>{row.month}</span>
                <div>
                  <i style={{ width: percent(row.total, invoiceMax) }} />
                </div>
                <strong>{formatMoney(row.total)}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section split">
        <StatusPanel
          eyebrow="Project status"
          title="Current work distribution"
          rows={summary.project_status}
          labelKey="status"
        />
        <StatusPanel
          eyebrow="Document status"
          title="Generated document mix"
          rows={summary.document_types}
          labelKey="document_type"
        />
      </section>

      <section className="section roadmap" id="migration">
        <div className="section__heading">
          <p className="eyebrow">Migration route</p>
          <h2>Four safe steps from portable local app to hosted system.</h2>
        </div>
        <div className="roadmap__grid">
          {summary.migration_plan.map((item) => (
            <article key={item.phase}>
              <span>{item.phase}</span>
              <h3>{item.name}</h3>
              <p>{item.status}</p>
              <small>{item.risk}</small>
            </article>
          ))}
        </div>
      </section>

      <footer>
        <div>
          <strong>{summary.company.name_en}</strong>
          <span>{summary.company.name_th}</span>
        </div>
        <p>
          Built as a separate deployable project. Legacy app files and
          `data/octa.db` are not modified by this portal.
        </p>
      </footer>
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
    </div>
  );
}

function Money({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "alert";
}) {
  return (
    <div className={tone === "alert" ? "money-card alert" : "money-card"}>
      <span>{label}</span>
      <strong>{formatMoney(value)}</strong>
    </div>
  );
}

function StatusPanel({
  eyebrow,
  title,
  rows,
  labelKey,
}: {
  eyebrow: string;
  title: string;
  rows: StatusRow[];
  labelKey: "status" | "document_type" | "stage";
}) {
  const max = Math.max(...rows.map((row) => row.count), 1);
  return (
    <div className="panel">
      <p className="eyebrow">{eyebrow}</p>
      <h3>{title}</h3>
      <div className="status-list">
        {rows.map((row) => {
          const label = row[labelKey] || "unknown";
          return (
            <div key={`${label}-${row.count}`} className="status-row">
              <div>
                <span>{label}</span>
                <strong>{formatNumber(row.count)}</strong>
              </div>
              <i style={{ width: percent(row.count, max) }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

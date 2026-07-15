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

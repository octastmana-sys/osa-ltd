const firebaseConfig =
  window.OSA_FIREBASE_CONFIG || {
    apiKey: "AIzaSyCQU5oGQ2d5vugzLoMwxwyFHBtD3EAc5v0",
    authDomain: "osa-document-os-prod-1a127.firebaseapp.com",
    projectId: "osa-document-os-prod-1a127",
    storageBucket: "osa-document-os-prod-1a127.firebasestorage.app",
    messagingSenderId: "524435498120",
    appId: "1:524435498120:web:c91ed5a264e1d5d1b76b3d",
  };

const money = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});
const number = new Intl.NumberFormat("th-TH");

const COLLECTIONS = [
  "customers",
  "projects",
  "quotations",
  "quotation_items",
  "documents",
  "document_numbers",
  "invoices",
  "receipts",
  "project_costs",
  "office_expenses",
  "workflow_events",
  "reference_options",
  "document_settings",
  "company_profile",
];

let firebaseApi = {};
let firestoreDb = null;
let liveState = {};
let currentUser = null;
let currentRole = null;
let octaCurrentView = "home";
let octaSearch = "";

const $ = (id) => document.getElementById(id);
const liveRoot = $("live-console");

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function setLiveStatus(message, tone = "info") {
  const el = $("live-status");
  if (!el) return;
  el.textContent = message;
  el.dataset.tone = tone;
}

function setWorkbenchStatus(message, tone = "info") {
  const el = $("workbench-status");
  if (!el) return;
  el.textContent = message;
  el.dataset.tone = tone;
}

function setLiveVisible(isSignedIn) {
  $("live-login-form")?.classList.toggle("hidden", isSignedIn);
  $("live-data")?.classList.toggle("hidden", !isSignedIn);
}

function formatMoney(value) {
  return money.format(Number(value || 0));
}

function formatNumber(value) {
  return number.format(Number(value || 0));
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
}

function latest(rows, dateKey, limit = 6) {
  return [...rows]
    .sort((a, b) => String(b[dateKey] || "").localeCompare(String(a[dateKey] || "")))
    .slice(0, limit);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function stripEditorFields(record) {
  const copy = { ...record };
  delete copy.id;
  return copy;
}

function cleanForFirestore(value) {
  if (Array.isArray(value)) return value.map(cleanForFirestore);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, cleanForFirestore(item)]),
    );
  }
  return value;
}

function renderRows(targetId, rows, columns) {
  const target = $(targetId);
  if (!target) return;
  if (!rows.length) {
    target.innerHTML = '<p class="empty-state">No records found.</p>';
    return;
  }
  target.innerHTML = `
    <table class="live-table">
      <thead>
        <tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>
                ${columns
                  .map((column) => {
                    const raw = column.value ? column.value(row) : row[column.key];
                    return `<td>${escapeHtml(raw)}</td>`;
                  })
                  .join("")}
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderStatus(targetId, rows, labelKey = "status") {
  const target = $(targetId);
  if (!target) return;
  const grouped = rows.reduce((acc, row) => {
    const label = row[labelKey] || "unknown";
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  target.innerHTML = Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => `<span class="status-chip"><strong>${escapeHtml(label)}</strong>${formatNumber(count)}</span>`)
    .join("");
}

async function fetchCollection(name) {
  const snapshot = await firebaseApi.getDocs(firebaseApi.collection(firestoreDb, name));
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

async function loadAllCollections() {
  const entries = await Promise.all(
    COLLECTIONS.map(async (name) => [name, await fetchCollection(name)]),
  );
  liveState = Object.fromEntries(entries);
  return liveState;
}

function renderDashboard() {
  const customers = liveState.customers || [];
  const projects = liveState.projects || [];
  const quotations = liveState.quotations || [];
  const invoices = liveState.invoices || [];
  const receipts = liveState.receipts || [];
  const documents = liveState.documents || [];
  const projectCosts = liveState.project_costs || [];
  const officeExpenses = liveState.office_expenses || [];

  setText("live-user-email", currentUser?.email || "Signed in");
  setText("live-user-role", currentRole || "staff");
  setText("live-count-customers", formatNumber(customers.length));
  setText("live-count-projects", formatNumber(projects.length));
  setText("live-count-quotations", formatNumber(quotations.length));
  setText("live-count-documents", formatNumber(documents.length));
  setText("live-count-invoices", formatNumber(invoices.length));
  setText("live-count-receipts", formatNumber(receipts.length));
  setText("live-quotation-total", formatMoney(sum(quotations, "total")));
  setText("live-invoice-total", formatMoney(sum(invoices, "total")));
  setText("live-paid-total", formatMoney(sum(invoices, "paid_amount")));
  setText("live-cost-total", formatMoney(sum(projectCosts, "total") + sum(officeExpenses, "total")));

  renderStatus("live-project-status", projects);
  renderStatus("live-quotation-status", quotations);
  renderRows("live-projects-table", latest(projects, "created_at"), [
    { label: "Project", key: "project_code" },
    { label: "Name", key: "project_name" },
    { label: "Type", key: "project_type" },
    { label: "Status", key: "status" },
  ]);
  renderRows("live-quotations-table", latest(quotations, "quotation_date"), [
    { label: "Quotation", key: "quotation_no" },
    { label: "Date", key: "quotation_date" },
    { label: "Status", key: "status" },
    { label: "Total", value: (row) => formatMoney(row.total) },
  ]);
  renderRows("live-invoices-table", latest(invoices, "invoice_date"), [
    { label: "Invoice", key: "invoice_no" },
    { label: "Date", key: "invoice_date" },
    { label: "Status", key: "status" },
    { label: "Total", value: (row) => formatMoney(row.total) },
  ]);
  renderOctaApp();
}

const VIEW_CONFIG = {
  customers: {
    title: "Customers",
    subtitle: "ฐานข้อมูลลูกค้า / ผู้ติดต่อ / เครดิตเทอม",
    collection: "customers",
    searchPlaceholder: "ค้นหาลูกค้า ผู้ติดต่อ เบอร์ อีเมล เลขภาษี หรือ Credit Term",
    fields: ["name", "contact_name", "phone", "email", "tax_id", "credit_term"],
    newTemplate: {
      name: "",
      contact_name: "",
      phone: "",
      email: "",
      tax_id: "",
      credit_term: "Cash",
      address: "",
    },
    columns: [
      ["Customer", (row) => row.name],
      ["Contact", (row) => row.contact_name],
      ["Phone", (row) => row.phone],
      ["Email", (row) => row.email],
      ["Tax ID", (row) => row.tax_id],
      ["Credit Term", (row) => row.credit_term],
    ],
  },
  projects: {
    title: "Projects",
    subtitle: "รายการงาน / Project Code / PO / สถานะงาน",
    collection: "projects",
    searchPlaceholder: "ค้นหาเลขงาน ชื่องาน ประเภท สถานะ PO หรือลูกค้า",
    fields: ["project_code", "project_name", "project_type", "status", "po_number", "po_date", "customer_name"],
    newTemplate: {
      customer_id: "",
      project_code: "",
      project_name: "",
      project_type: "P",
      request_summary: "",
      po_number: "",
      po_date: "",
      status: "new",
    },
    columns: [
      ["Project Code", (row) => row.project_code],
      ["Project", (row) => row.project_name],
      ["Type", (row) => row.project_type],
      ["Customer", (row) => lookupCustomer(row.customer_id)?.name || row.customer_name],
      ["PO", (row) => [row.po_number, row.po_date].filter(Boolean).join(" / ")],
      ["Status", (row) => row.status],
    ],
  },
  project_costs: {
    title: "Project Costs",
    subtitle: "ต้นทุนโครงการสำหรับดู margin",
    collection: "project_costs",
    searchPlaceholder: "ค้นหาเลขงาน รายการ หมวดหมู่ หรือผู้ขาย",
    fields: ["project_code", "description", "category", "vendor", "note"],
    newTemplate: {
      project_id: "",
      cost_date: new Date().toISOString().slice(0, 10),
      category: "สินค้า",
      description: "",
      vendor: "",
      amount: 0,
      vat_amount: 0,
      total: 0,
      payment_status: "unpaid",
    },
    columns: [
      ["Date", (row) => row.cost_date || row.created_at?.slice(0, 10)],
      ["Project", (row) => lookupProject(row.project_id)?.project_code || row.project_id],
      ["Category", (row) => row.category],
      ["Description", (row) => row.description],
      ["Vendor", (row) => row.vendor],
      ["Total", (row) => formatMoney(row.total || row.amount)],
      ["Status", (row) => row.payment_status],
    ],
  },
  office_expenses: {
    title: "Office Expenses",
    subtitle: "ค่าใช้จ่ายสำนักงาน",
    collection: "office_expenses",
    searchPlaceholder: "ค้นหาเดือน หมวดหมู่ รายการ หรือผู้ขาย",
    fields: ["expense_month", "category", "description", "vendor", "payment_method"],
    newTemplate: {
      expense_date: new Date().toISOString().slice(0, 10),
      expense_month: new Date().toISOString().slice(0, 7),
      category: "อื่นๆ",
      description: "",
      vendor: "",
      amount: 0,
      vat_amount: 0,
      total: 0,
      payment_method: "โอน",
    },
    columns: [
      ["Date", (row) => row.expense_date || row.created_at?.slice(0, 10)],
      ["Month", (row) => row.expense_month],
      ["Category", (row) => row.category],
      ["Description", (row) => row.description],
      ["Vendor", (row) => row.vendor],
      ["Total", (row) => formatMoney(row.total || row.amount)],
    ],
  },
  quotations: {
    title: "Quotations",
    subtitle: "ใบเสนอราคา / ยอดรวม / สถานะ",
    collection: "quotations",
    searchPlaceholder: "ค้นหาเลข QT เลขงาน ชื่องาน ลูกค้า หรือสถานะ",
    fields: ["quotation_no", "quotation_date", "status", "project_code", "project_name", "customer_name"],
    newTemplate: {
      project_id: "",
      quotation_no: "",
      quotation_date: new Date().toISOString().slice(0, 10),
      status: "draft",
      subtotal: 0,
      vat_amount: 0,
      total: 0,
      payment_terms: "",
      delivery_terms: "",
    },
    columns: [
      ["QT No.", (row) => row.quotation_no],
      ["Date", (row) => row.quotation_date],
      ["Project", (row) => projectLabel(row.project_id)],
      ["Customer", (row) => customerForProject(row.project_id)],
      ["Total", (row) => formatMoney(row.total)],
      ["Status", (row) => row.status],
    ],
  },
  documents: {
    title: "Documents",
    subtitle: "Delivery Note / Tax Invoice / เอกสารประกอบ workflow",
    collection: "documents",
    searchPlaceholder: "ค้นหาเลขเอกสาร ประเภท เลขงาน หรือสถานะ",
    fields: ["document_no", "document_type", "status", "project_code", "project_name"],
    newTemplate: {
      project_id: "",
      invoice_id: "",
      document_type: "DeliveryNote",
      document_no: "",
      status: "draft",
      created_at: new Date().toISOString(),
    },
    columns: [
      ["Document No.", (row) => row.document_no],
      ["Type", (row) => row.document_type],
      ["Project", (row) => projectLabel(row.project_id)],
      ["Invoice", (row) => lookupInvoice(row.invoice_id)?.invoice_no || row.invoice_id],
      ["Date", (row) => row.created_at?.slice(0, 10)],
      ["Status", (row) => row.status],
    ],
  },
  invoices: {
    title: "Invoices",
    subtitle: "ใบแจ้งหนี้ / paid amount / due date",
    collection: "invoices",
    searchPlaceholder: "ค้นหาเลขงาน ลูกค้า PO QT เลข IV หรือสถานะ",
    fields: ["invoice_no", "invoice_date", "status", "project_code", "project_name", "customer_name"],
    newTemplate: {
      project_id: "",
      invoice_no: "",
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: "",
      status: "draft",
      subtotal: 0,
      vat_amount: 0,
      total: 0,
      paid_amount: 0,
    },
    columns: [
      ["Invoice", (row) => row.invoice_no],
      ["Date", (row) => row.invoice_date],
      ["Project", (row) => projectLabel(row.project_id)],
      ["Customer", (row) => customerForProject(row.project_id)],
      ["Total", (row) => formatMoney(row.total)],
      ["Paid", (row) => formatMoney(row.paid_amount)],
      ["Status", (row) => row.status],
    ],
  },
  receipts: {
    title: "Receipts",
    subtitle: "ใบเสร็จรับเงิน / วิธีรับชำระ / ยอดรับเงิน",
    collection: "receipts",
    searchPlaceholder: "ค้นหาเลขงาน ลูกค้า Invoice หรือเลขใบเสร็จ",
    fields: ["receipt_no", "receipt_date", "status", "payment_method", "project_code", "project_name"],
    newTemplate: {
      invoice_id: "",
      receipt_no: "",
      receipt_date: new Date().toISOString().slice(0, 10),
      amount: 0,
      payment_method: "โอน",
      status: "draft",
    },
    columns: [
      ["Receipt", (row) => row.receipt_no],
      ["Date", (row) => row.receipt_date],
      ["Invoice", (row) => lookupInvoice(row.invoice_id)?.invoice_no || row.invoice_id],
      ["Project", (row) => projectLabel(lookupInvoice(row.invoice_id)?.project_id)],
      ["Amount", (row) => formatMoney(row.amount)],
      ["Method", (row) => row.payment_method],
      ["Status", (row) => row.status],
    ],
  },
};

function recordKey(value) {
  return value === undefined || value === null ? "" : String(value);
}

function lookupByFlexibleId(collectionName, id) {
  const key = recordKey(id);
  if (!key) return null;
  return (liveState[collectionName] || []).find(
    (row) => recordKey(row.id) === key || recordKey(row.legacy_id) === key || recordKey(row.sqlite_id) === key || recordKey(row.rowid) === key,
  );
}

function lookupCustomer(id) {
  return lookupByFlexibleId("customers", id);
}

function lookupProject(id) {
  return lookupByFlexibleId("projects", id);
}

function lookupInvoice(id) {
  return lookupByFlexibleId("invoices", id);
}

function projectLabel(projectId) {
  const project = lookupProject(projectId);
  return project ? `${project.project_code || ""}${project.project_name ? ` / ${project.project_name}` : ""}` : projectId || "";
}

function customerForProject(projectId) {
  const project = lookupProject(projectId);
  return lookupCustomer(project?.customer_id)?.name || project?.customer_name || "";
}

function enhancedSearchText(row, config) {
  const raw = config.fields.map((field) => row[field]);
  if (row.project_id) {
    const project = lookupProject(row.project_id);
    raw.push(project?.project_code, project?.project_name, lookupCustomer(project?.customer_id)?.name);
  }
  if (row.customer_id) raw.push(lookupCustomer(row.customer_id)?.name);
  if (row.invoice_id) {
    const invoice = lookupInvoice(row.invoice_id);
    raw.push(invoice?.invoice_no, projectLabel(invoice?.project_id), customerForProject(invoice?.project_id));
  }
  return raw.filter(Boolean).join(" ").toLowerCase();
}

function sortedRows(rows, config) {
  const dateFields = ["updated_at", "created_at", "quotation_date", "invoice_date", "receipt_date", "expense_date", "cost_date"];
  return [...rows].sort((a, b) => {
    const aDate = dateFields.map((field) => a[field]).find(Boolean) || "";
    const bDate = dateFields.map((field) => b[field]).find(Boolean) || "";
    return String(bDate).localeCompare(String(aDate));
  });
}

function renderMetricCard(label, value) {
  return `<div class="card"><div>${escapeHtml(label)}</div><div class="metric">${escapeHtml(value)}</div></div>`;
}

function renderOverviewTable(title, rows, columns, emptyText = "ไม่มีรายการค้าง") {
  return `
    <h3 class="section-title">${escapeHtml(title)}</h3>
    <table class="octa-table">
      <thead><tr>${columns.map(([label]) => `<th>${escapeHtml(label)}</th>`).join("")}</tr></thead>
      <tbody>
        ${
          rows.length
            ? rows
                .slice(0, 12)
                .map((row) => `<tr>${columns.map(([, value]) => `<td>${escapeHtml(value(row) || "")}</td>`).join("")}</tr>`)
                .join("")
            : `<tr><td colspan="${columns.length}">${escapeHtml(emptyText)}</td></tr>`
        }
      </tbody>
    </table>
  `;
}

function renderOctaHome() {
  const projects = liveState.projects || [];
  const quotations = liveState.quotations || [];
  const invoices = liveState.invoices || [];
  const receipts = liveState.receipts || [];
  const documents = liveState.documents || [];
  const projectsWithInvoice = new Set(invoices.map((row) => recordKey(row.project_id)).filter(Boolean));
  const invoicesWithTax = new Set(
    documents.filter((row) => row.document_type === "SalesTaxInvoice").map((row) => recordKey(row.invoice_id)).filter(Boolean),
  );
  const invoicesWithReceipt = new Set(receipts.map((row) => recordKey(row.invoice_id)).filter(Boolean));
  const waitingPo = projects.filter((row) => !row.po_number && !["lost", "paid", "closed"].includes(row.status));
  const inProgress = projects.filter((row) => row.status === "in_progress");
  const waitingInvoice = projects.filter((row) => row.po_number && !projectsWithInvoice.has(recordKey(row.id)) && !["lost", "paid", "closed"].includes(row.status));
  const waitingTaxInvoice = invoices.filter((row) => !invoicesWithTax.has(recordKey(row.id)));
  const waitingReceipt = invoices.filter((row) => !invoicesWithReceipt.has(recordKey(row.id)));

  return `
    <div class="grid octa-dashboard-grid">
      ${renderMetricCard("รอ PO", formatNumber(waitingPo.length))}
      ${renderMetricCard("In Progress", formatNumber(inProgress.length))}
      ${renderMetricCard("รอเปิด Invoice", formatNumber(waitingInvoice.length))}
      ${renderMetricCard("รอเปิด Tax Invoice", formatNumber(waitingTaxInvoice.length))}
      ${renderMetricCard("รอเปิด Receipt", formatNumber(waitingReceipt.length))}
    </div>
    ${renderOverviewTable("1. งานที่รอ PO", waitingPo, [
      ["Project Code", (row) => row.project_code],
      ["Project", (row) => row.project_name],
      ["Customer", (row) => lookupCustomer(row.customer_id)?.name || row.customer_name],
      ["Status", (row) => row.status],
    ])}
    ${renderOverviewTable("2. งานที่ In Progress", inProgress, [
      ["Project Code", (row) => row.project_code],
      ["Project", (row) => row.project_name],
      ["Customer", (row) => lookupCustomer(row.customer_id)?.name || row.customer_name],
      ["PO", (row) => row.po_number],
    ])}
    ${renderOverviewTable("3. งานที่รอเปิด Invoice", waitingInvoice, [
      ["Project Code", (row) => row.project_code],
      ["Project", (row) => row.project_name],
      ["Customer", (row) => lookupCustomer(row.customer_id)?.name || row.customer_name],
      ["PO", (row) => row.po_number],
    ])}
    ${renderOverviewTable("4. งานที่รอเปิด Tax Invoice", waitingTaxInvoice, [
      ["Invoice", (row) => row.invoice_no],
      ["Project", (row) => projectLabel(row.project_id)],
      ["Customer", (row) => customerForProject(row.project_id)],
      ["Total", (row) => formatMoney(row.total)],
    ])}
    ${renderOverviewTable("5. งานที่รอเปิด Receipt", waitingReceipt, [
      ["Invoice", (row) => row.invoice_no],
      ["Project", (row) => projectLabel(row.project_id)],
      ["Customer", (row) => customerForProject(row.project_id)],
      ["Total", (row) => formatMoney(row.total)],
    ])}
  `;
}

function renderBillingView() {
  const invoices = liveState.invoices || [];
  const receipts = liveState.receipts || [];
  const paid = sum(invoices, "paid_amount");
  const invoiceTotal = sum(invoices, "total");
  const receiptTotal = sum(receipts, "amount");
  return `
    <div class="grid octa-dashboard-grid">
      ${renderMetricCard("Invoice Total", formatMoney(invoiceTotal))}
      ${renderMetricCard("Paid Amount", formatMoney(paid))}
      ${renderMetricCard("Receipt Amount", formatMoney(receiptTotal))}
      ${renderMetricCard("Outstanding", formatMoney(invoiceTotal - paid))}
    </div>
    ${renderCollectionView("invoices", true)}
  `;
}

function renderSettingsView() {
  return `
    <div class="grid octa-dashboard-grid">
      ${renderMetricCard("Document Settings", formatNumber((liveState.document_settings || []).length))}
      ${renderMetricCard("Number Sequences", formatNumber((liveState.document_numbers || []).length))}
      ${renderMetricCard("Reference Options", formatNumber((liveState.reference_options || []).length))}
      ${renderMetricCard("Company Profiles", formatNumber((liveState.company_profile || []).length))}
    </div>
    ${renderOverviewTable("Document Settings", liveState.document_settings || [], [
      ["Type", (row) => row.document_type],
      ["Label", (row) => row.label],
      ["Prefix", (row) => row.prefix],
      ["Format", (row) => row.number_format],
    ])}
    ${renderOverviewTable("Reference Options", liveState.reference_options || [], [
      ["Type", (row) => row.option_type],
      ["Value", (row) => row.value],
      ["Updated", (row) => row.updated_at?.slice(0, 10)],
    ])}
  `;
}

function renderCollectionView(viewName, embedded = false) {
  const config = VIEW_CONFIG[viewName];
  const term = octaSearch.trim().toLowerCase();
  const source = sortedRows(liveState[config.collection] || [], config);
  const rows = term ? source.filter((row) => enhancedSearchText(row, config).includes(term)) : source;
  const search = embedded
    ? ""
    : `<form class="searchbar octa-search" id="octa-search-form">
        <input name="q" value="${escapeHtml(octaSearch)}" placeholder="${escapeHtml(config.searchPlaceholder)}">
        <button class="btn ghost" type="submit">Search</button>
        <button class="btn ghost" type="button" id="octa-clear-search">Clear</button>
      </form>`;
  return `
    ${search}
    <table class="octa-table">
      <thead>
        <tr>
          ${config.columns.map(([label]) => `<th>${escapeHtml(label)}</th>`).join("")}
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${
          rows.length
            ? rows
                .map(
                  (row) => `
                  <tr>
                    ${config.columns.map(([, value]) => `<td>${escapeHtml(value(row) || "")}</td>`).join("")}
                    <td>
                      <div class="actions">
                        <button class="btn ghost mini" type="button" data-octa-edit="${escapeHtml(config.collection)}:${escapeHtml(row.id)}">Edit</button>
                        <button class="btn danger mini" type="button" data-octa-delete="${escapeHtml(config.collection)}:${escapeHtml(row.id)}">Delete</button>
                      </div>
                    </td>
                  </tr>`,
                )
                .join("")
            : `<tr><td colspan="${config.columns.length + 1}">ไม่มีรายการ</td></tr>`
        }
      </tbody>
    </table>
  `;
}

function renderOctaApp() {
  const root = $("octa-view");
  if (!root) return;
  const title = $("octa-title");
  const subtitle = $("octa-subtitle");
  const newButton = $("octa-new-record");

  document.querySelectorAll("#octa-nav button[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === octaCurrentView);
  });

  if (octaCurrentView === "home") {
    if (title) title.textContent = "Home / Overview";
    if (subtitle) subtitle.textContent = "ภาพรวมงานค้างตามขั้นตอนขายและเอกสาร";
    if (newButton) newButton.style.display = "";
    root.innerHTML = renderOctaHome();
    return;
  }
  if (octaCurrentView === "billing") {
    if (title) title.textContent = "Billing & Collection";
    if (subtitle) subtitle.textContent = "ภาพรวมใบแจ้งหนี้ การรับเงิน และยอดค้าง";
    if (newButton) newButton.style.display = "none";
    root.innerHTML = renderBillingView();
    return;
  }
  if (octaCurrentView === "settings") {
    if (title) title.textContent = "System Setup";
    if (subtitle) subtitle.textContent = "ค่าตั้งต้นเลขเอกสาร master data และข้อมูลบริษัท";
    if (newButton) newButton.style.display = "none";
    root.innerHTML = renderSettingsView();
    return;
  }

  const config = VIEW_CONFIG[octaCurrentView];
  if (!config) return;
  if (title) title.textContent = config.title;
  if (subtitle) subtitle.textContent = config.subtitle;
  if (newButton) newButton.style.display = "";
  root.innerHTML = renderCollectionView(octaCurrentView);
}

function populateWorkbenchCollections() {
  const select = $("workbench-collection");
  if (!select || select.dataset.ready) return;
  select.innerHTML = COLLECTIONS.map((name) => `<option value="${name}">${name}</option>`).join("");
  select.dataset.ready = "true";
}

function labelForRecord(collectionName, record) {
  const candidates = [
    "name",
    "project_code",
    "project_name",
    "quotation_no",
    "invoice_no",
    "receipt_no",
    "document_no",
    "document_type",
    "value",
    "email",
  ];
  const found = candidates.map((key) => record[key]).find(Boolean);
  return found ? `${found} (${record.id})` : record.id;
}

function renderWorkbenchList() {
  const collectionName = $("workbench-collection")?.value || COLLECTIONS[0];
  const rows = liveState[collectionName] || [];
  const list = $("workbench-records");
  if (!list) return;
  list.innerHTML = rows
    .sort((a, b) => labelForRecord(collectionName, a).localeCompare(labelForRecord(collectionName, b)))
    .map(
      (record) =>
        `<button type="button" class="record-button" data-id="${escapeHtml(record.id)}">${escapeHtml(labelForRecord(collectionName, record))}</button>`,
    )
    .join("");
  list.querySelectorAll("button[data-id]").forEach((button) => {
    button.addEventListener("click", () => selectWorkbenchRecord(button.dataset.id));
  });
  setText("workbench-count", `${formatNumber(rows.length)} records`);
}

function selectWorkbenchRecord(id) {
  const collectionName = $("workbench-collection")?.value || COLLECTIONS[0];
  const record = (liveState[collectionName] || []).find((row) => row.id === id);
  $("workbench-doc-id").value = id || "";
  $("workbench-json").value = JSON.stringify(stripEditorFields(record || {}), null, 2);
  setWorkbenchStatus(record ? `Loaded ${collectionName}/${id}` : "Ready");
}

function setupWorkbench() {
  populateWorkbenchCollections();
  const collectionSelect = $("workbench-collection");
  collectionSelect?.addEventListener("change", () => {
    $("workbench-doc-id").value = "";
    $("workbench-json").value = "{}";
    renderWorkbenchList();
  });
  $("workbench-refresh")?.addEventListener("click", async () => {
    await refreshLiveData();
  });
  $("workbench-new")?.addEventListener("click", () => {
    $("workbench-doc-id").value = "";
    $("workbench-json").value = "{\n  \n}";
    setWorkbenchStatus("New record draft. Leave document ID blank for auto ID.");
  });
  $("workbench-save")?.addEventListener("click", saveWorkbenchRecord);
  $("workbench-delete")?.addEventListener("click", deleteWorkbenchRecord);
  $("quick-customer-form")?.addEventListener("submit", createQuickCustomer);
  renderWorkbenchList();
}

function openWorkbenchForNew(collectionName, template = {}) {
  const select = $("workbench-collection");
  if (select) select.value = collectionName;
  $("workbench-doc-id").value = "";
  $("workbench-json").value = JSON.stringify(
    {
      ...template,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    null,
    2,
  );
  renderWorkbenchList();
  setWorkbenchStatus(`New ${collectionName} draft. Save when ready.`);
  $("workbench-json")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function openWorkbenchForRecord(collectionName, docId) {
  const select = $("workbench-collection");
  if (select) select.value = collectionName;
  renderWorkbenchList();
  selectWorkbenchRecord(docId);
  $("workbench-json")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function deleteRecordFromOcta(collectionName, docId) {
  const label = `${collectionName}/${docId}`;
  if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
  setWorkbenchStatus(`Deleting ${label}…`);
  try {
    await firebaseApi.deleteDoc(firebaseApi.doc(firestoreDb, collectionName, docId));
    setWorkbenchStatus(`Deleted ${label}`, "success");
    await refreshLiveData(false);
  } catch (error) {
    setWorkbenchStatus(error?.message || "Delete failed.", "error");
  }
}

function setupOctaShell() {
  if (setupOctaShell.ready) return;
  setupOctaShell.ready = true;
  $("octa-nav")?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-view]");
    if (!button) return;
    octaCurrentView = button.dataset.view;
    octaSearch = "";
    renderOctaApp();
  });
  document.addEventListener("click", async (event) => {
    const homeButton = event.target.closest("[data-view-action='home']");
    if (homeButton) {
      octaCurrentView = "home";
      octaSearch = "";
      renderOctaApp();
      return;
    }
    const editButton = event.target.closest("[data-octa-edit]");
    if (editButton) {
      const [collectionName, docId] = editButton.dataset.octaEdit.split(":");
      openWorkbenchForRecord(collectionName, docId);
      return;
    }
    const deleteButton = event.target.closest("[data-octa-delete]");
    if (deleteButton) {
      const [collectionName, docId] = deleteButton.dataset.octaDelete.split(":");
      await deleteRecordFromOcta(collectionName, docId);
      return;
    }
    const clearButton = event.target.closest("#octa-clear-search");
    if (clearButton) {
      octaSearch = "";
      renderOctaApp();
      return;
    }
  });
  document.addEventListener("submit", (event) => {
    if (event.target?.id !== "octa-search-form") return;
    event.preventDefault();
    octaSearch = new FormData(event.target).get("q") || "";
    renderOctaApp();
  });
  $("octa-new-record")?.addEventListener("click", () => {
    if (octaCurrentView === "home") {
      octaCurrentView = "projects";
      octaSearch = "";
      renderOctaApp();
    }
    const config = VIEW_CONFIG[octaCurrentView] || VIEW_CONFIG.projects;
    openWorkbenchForNew(config.collection, config.newTemplate);
  });
}

async function saveWorkbenchRecord() {
  const collectionName = $("workbench-collection")?.value || COLLECTIONS[0];
  const docId = $("workbench-doc-id")?.value.trim();
  let payload;
  try {
    payload = cleanForFirestore(JSON.parse($("workbench-json")?.value || "{}"));
  } catch (error) {
    setWorkbenchStatus(`Invalid JSON: ${error.message}`, "error");
    return;
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    setWorkbenchStatus("JSON payload must be an object.", "error");
    return;
  }
  payload.updated_at = new Date().toISOString();
  setWorkbenchStatus("Saving…");
  try {
    if (docId) {
      await firebaseApi.setDoc(firebaseApi.doc(firestoreDb, collectionName, docId), payload, { merge: true });
      setWorkbenchStatus(`Saved ${collectionName}/${docId}`, "success");
    } else {
      payload.created_at = payload.created_at || new Date().toISOString();
      const ref = await firebaseApi.addDoc(firebaseApi.collection(firestoreDb, collectionName), payload);
      $("workbench-doc-id").value = ref.id;
      setWorkbenchStatus(`Created ${collectionName}/${ref.id}`, "success");
    }
    await refreshLiveData(false);
  } catch (error) {
    setWorkbenchStatus(error?.message || "Save failed.", "error");
  }
}

async function deleteWorkbenchRecord() {
  const collectionName = $("workbench-collection")?.value || COLLECTIONS[0];
  const docId = $("workbench-doc-id")?.value.trim();
  if (!docId) {
    setWorkbenchStatus("Select a record before deleting.", "error");
    return;
  }
  if (!confirm(`Delete ${collectionName}/${docId}? This cannot be undone.`)) return;
  setWorkbenchStatus("Deleting…");
  try {
    await firebaseApi.deleteDoc(firebaseApi.doc(firestoreDb, collectionName, docId));
    $("workbench-doc-id").value = "";
    $("workbench-json").value = "{}";
    setWorkbenchStatus(`Deleted ${collectionName}/${docId}`, "success");
    await refreshLiveData(false);
  } catch (error) {
    setWorkbenchStatus(error?.message || "Delete failed.", "error");
  }
}

async function createQuickCustomer(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const payload = {
    name: data.name?.trim(),
    contact_name: data.contact_name?.trim() || "",
    phone: data.phone?.trim() || "",
    email: data.email?.trim() || "",
    address: data.address?.trim() || "",
    tax_id: data.tax_id?.trim() || "",
    credit_term: data.credit_term?.trim() || "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (!payload.name) {
    setWorkbenchStatus("Customer name is required.", "error");
    return;
  }
  setWorkbenchStatus("Creating customer…");
  try {
    const ref = await firebaseApi.addDoc(firebaseApi.collection(firestoreDb, "customers"), payload);
    form.reset();
    $("workbench-collection").value = "customers";
    setWorkbenchStatus(`Created customer ${ref.id}`, "success");
    await refreshLiveData(false);
    selectWorkbenchRecord(ref.id);
  } catch (error) {
    setWorkbenchStatus(error?.message || "Could not create customer.", "error");
  }
}

async function refreshLiveData(showStatus = true) {
  if (showStatus) setLiveStatus("Loading Firestore records…");
  await loadAllCollections();
  renderDashboard();
  setupWorkbench();
  setupOctaShell();
  renderWorkbenchList();
  if (showStatus) setLiveStatus("Connected to Firestore. Data below is live.", "success");
}

async function init() {
  if (!liveRoot) return;
  try {
    const [{ initializeApp }, authModule, firestoreModule] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js"),
    ]);
    const app = initializeApp(firebaseConfig);
    const auth = authModule.getAuth(app);
    firestoreDb = firestoreModule.getFirestore(app);
    firebaseApi = firestoreModule;

    $("live-login-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const email = $("live-email")?.value;
      const password = $("live-password")?.value;
      if (!email || !password) return;
      setLiveStatus("Signing in…");
      try {
        await authModule.signInWithEmailAndPassword(auth, email, password);
      } catch (error) {
        setLiveStatus(error?.message || "Sign in failed.", "error");
      }
    });

    $("live-sign-out")?.addEventListener("click", async () => {
      await authModule.signOut(auth);
    });

    authModule.onAuthStateChanged(auth, async (user) => {
      if (!user) {
        currentUser = null;
        currentRole = null;
        setLiveVisible(false);
        setLiveStatus("Sign in with your Firebase account to view live Firestore data.");
        return;
      }
      try {
        const userDoc = await firestoreModule.getDoc(firestoreModule.doc(firestoreDb, "users", user.uid));
        if (!userDoc.exists()) {
          setLiveVisible(false);
          setLiveStatus("Signed in, but this account has no role document in Firestore.", "error");
          return;
        }
        currentUser = user;
        currentRole = userDoc.data()?.role;
        setLiveVisible(true);
        await refreshLiveData(true);
      } catch (error) {
        setLiveVisible(false);
        setLiveStatus(error?.message || "Could not read Firestore. Check rules and account role.", "error");
      }
    });
  } catch (error) {
    setLiveStatus(error?.message || "Could not load Firebase SDK.", "error");
  }
}

init();

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

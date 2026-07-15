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

function renderRows(targetId, rows, columns) {
  const target = $(targetId);
  if (!target) return;
  if (!rows.length) {
    target.innerHTML = "<p class=\"empty-state\">No records found.</p>";
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
  const items = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  target.innerHTML = items
    .map(([label, count]) => `<span class="status-chip"><strong>${escapeHtml(label)}</strong>${formatNumber(count)}</span>`)
    .join("");
}

async function fetchCollection(db, name) {
  const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js");
  const snapshot = await getDocs(collection(db, name));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function loadLiveData(db, user, role) {
  setLiveStatus("Loading Firestore records…");
  const [customers, projects, quotations, invoices, receipts, documents, projectCosts, officeExpenses] =
    await Promise.all([
      fetchCollection(db, "customers"),
      fetchCollection(db, "projects"),
      fetchCollection(db, "quotations"),
      fetchCollection(db, "invoices"),
      fetchCollection(db, "receipts"),
      fetchCollection(db, "documents"),
      fetchCollection(db, "project_costs"),
      fetchCollection(db, "office_expenses"),
    ]);

  setText("live-user-email", user.email || "Signed in");
  setText("live-user-role", role || "staff");
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

  setLiveStatus("Connected to Firestore. Data below is live.", "success");
}

async function init() {
  if (!liveRoot) return;
  try {
    const [{ initializeApp }, authModule, firestoreModule] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js"),
    ]);
    const {
      getAuth,
      onAuthStateChanged,
      signInWithEmailAndPassword,
      signOut,
    } = authModule;
    const { doc, getDoc, getFirestore } = firestoreModule;
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    $("live-login-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const email = $("live-email")?.value;
      const password = $("live-password")?.value;
      if (!email || !password) return;
      setLiveStatus("Signing in…");
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (error) {
        setLiveStatus(error?.message || "Sign in failed.", "error");
      }
    });

    $("live-sign-out")?.addEventListener("click", async () => {
      await signOut(auth);
    });

    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLiveVisible(false);
        setLiveStatus("Sign in with your Firebase account to view live Firestore data.");
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) {
          setLiveVisible(false);
          setLiveStatus("Signed in, but this account has no role document in Firestore.", "error");
          return;
        }
        const role = userDoc.data()?.role;
        setLiveVisible(true);
        await loadLiveData(db, user, role);
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

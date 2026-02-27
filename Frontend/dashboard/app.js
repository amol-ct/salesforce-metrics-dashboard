const dom = {
  productFilter: document.getElementById("productFilter"),
  quarterFilter: document.getElementById("quarterFilter"),
  statusFilter: document.getElementById("statusFilter"),
  notifyBtn: document.getElementById("notifyBtn"),
  notifyCount: document.getElementById("notifyCount"),
  notifyPanel: document.getElementById("notifyPanel"),
  roleBadge: document.getElementById("roleBadge"),
  inviteUserBtn: document.getElementById("inviteUserBtn"),
  manageUsersBtn: document.getElementById("manageUsersBtn"),
  profileEmail: document.getElementById("profileEmail"),
  logoutBtn: document.getElementById("logoutBtn"),
  kpiCards: document.getElementById("kpiCards"),
  productProgress: document.getElementById("productProgress"),
  quarterMatrix: document.getElementById("quarterMatrix"),
  drilldown: document.getElementById("drilldown"),
  drilldownMeta: document.getElementById("drilldownMeta"),
  combinedClusterTable: document.getElementById("combinedClusterTable"),
  clusterMeta: document.getElementById("clusterMeta"),
  clusterProductFilter: document.getElementById("clusterProductFilter"),
  clusterJiraFilter: document.getElementById("clusterJiraFilter"),
  clusterVerdictFilter: document.getElementById("clusterVerdictFilter"),
  clusterMovedFilter: document.getElementById("clusterMovedFilter"),
  clusterSearch: document.getElementById("clusterSearch"),
  downloadSFDataBtn: document.getElementById("downloadSFDataBtn"),
  uploadSFDataBtn: document.getElementById("uploadSFDataBtn"),
  uploadSFDataInput: document.getElementById("uploadSFDataInput"),
  roadmapProductFilter: document.getElementById("roadmapProductFilter"),
  roadmapQuarterFilter: document.getElementById("roadmapQuarterFilter"),
  roadmapStatusFilter: document.getElementById("roadmapStatusFilter"),
  roadmapThemeFilter: document.getElementById("roadmapThemeFilter"),
  roadmapOwnerFilter: document.getElementById("roadmapOwnerFilter"),
  roadmapMovedFilter: document.getElementById("roadmapMovedFilter"),
  roadmapSearch: document.getElementById("roadmapSearch"),
  roadmapSectionCollapse: document.getElementById("roadmapSectionCollapse"),
  allActionsSelect: document.getElementById("allActionsSelect"),
  editModal: document.getElementById("editModal"),
  editModalTitle: document.getElementById("editModalTitle"),
  editModalClose: document.getElementById("editModalClose"),
  editModalCancel: document.getElementById("editModalCancel"),
  editModalSave: document.getElementById("editModalSave"),
  editProduct: document.getElementById("editProduct"),
  editHierarchy: document.getElementById("editHierarchy"),
  editStatus: document.getElementById("editStatus"),
  editStackRank: document.getElementById("editStackRank"),
  editOwner: document.getElementById("editOwner"),
  editQuarter: document.getElementById("editQuarter"),
  editTheme: document.getElementById("editTheme"),
  editPriority: document.getElementById("editPriority"),
  editProdDate: document.getElementById("editProdDate"),
  editOldProdDate: document.getElementById("editOldProdDate"),
  editCustomerDate: document.getElementById("editCustomerDate"),
  editAopGoal: document.getElementById("editAopGoal"),
  editTitle: document.getElementById("editTitle"),
  editDescription: document.getElementById("editDescription"),
  clusterDetailModal: document.getElementById("clusterDetailModal"),
  clusterDetailClose: document.getElementById("clusterDetailClose"),
  cdetLabel: document.getElementById("cdetLabel"),
  cdetId: document.getElementById("cdetId"),
  cdetProduct: document.getElementById("cdetProduct"),
  cdetPriority: document.getElementById("cdetPriority"),
  cdetVerdict: document.getElementById("cdetVerdict"),
  cdetDesc: document.getElementById("cdetDesc"),
  cdetStats: document.getElementById("cdetStats"),
  cdetCustomers: document.getElementById("cdetCustomers"),
  clusterDetailTicketsList: document.getElementById("clusterDetailTicketsList"),
  clusterDetailTicketsCount: document.getElementById("clusterDetailTicketsCount"),
  prdModal: document.getElementById("prdModal"),
  prdClose: document.getElementById("prdClose"),
  prdContent: document.getElementById("prdContent"),
  prdInputModal: document.getElementById("prdInputModal"),
  prdInputClose: document.getElementById("prdInputClose"),
  prdInputCancel: document.getElementById("prdInputCancel"),
  prdInputGenerate: document.getElementById("prdInputGenerate"),
  prdInputDescription: document.getElementById("prdInputDescription"),
  prdInputVideoLink: document.getElementById("prdInputVideoLink"),
  prdInputDocLink: document.getElementById("prdInputDocLink"),
  prdInputUseFallback: document.getElementById("prdInputUseFallback"),
  prdImageInput: document.getElementById("prdImageInput"),
  prdImageDropzone: document.getElementById("prdImageDropzone"),
  prdImagePreviews: document.getElementById("prdImagePreviews"),
  prdImageUploadBtn: document.getElementById("prdImageUploadBtn"),
  prdViewImages: document.getElementById("prdViewImages"),
  prdViewImageGrid: document.getElementById("prdViewImageGrid"),
  addClusterItemBtn: document.getElementById("addClusterItemBtn"),
  addClusterModal: document.getElementById("addClusterModal"),
  addClusterModalClose: document.getElementById("addClusterModalClose"),
  addClusterModalCancel: document.getElementById("addClusterModalCancel"),
  addClusterModalSave: document.getElementById("addClusterModalSave"),
  acLabel: document.getElementById("acLabel"),
  acProduct: document.getElementById("acProduct"),
  acPriority: document.getElementById("acPriority"),
  acCustomerCount: document.getElementById("acCustomerCount"),
  acTicketCount: document.getElementById("acTicketCount"),
  acArr: document.getElementById("acArr"),
  acCustomerNames: document.getElementById("acCustomerNames"),
  acDescription: document.getElementById("acDescription"),
  acExamples: document.getElementById("acExamples"),
  inviteModal: document.getElementById("inviteModal"),
  inviteClose: document.getElementById("inviteClose"),
  inviteEmail: document.getElementById("inviteEmail"),
  inviteRole: document.getElementById("inviteRole"),
  inviteLink: document.getElementById("inviteLink"),
  inviteSend: document.getElementById("inviteSend"),
  userMgmtModal: document.getElementById("userMgmtModal"),
  userMgmtClose: document.getElementById("userMgmtClose"),
  userMgmtTable: document.getElementById("userMgmtTable"),
  capabilityTooltip: document.getElementById("capabilityTooltip"),
};

const DONE_SET = new Set(["done", "closed", "completed"]);
const PROGRESS_SET = new Set(["in progress", "problem solving", "deferred", "at risk", "triage"]);
const TODO_SET = new Set(["to do", "not started", "", "backlog", "won't do"]);
const QUARTERS = ["Q1", "Q2", "Q3", "Q4", "Unassigned"];
const BLANK_STATUS_VALUE = "__BLANK__";

let roadmapRows = [];
let roadmapStatuses = [];
let renderDashboard = () => {};
let currentUserEmail = "";
let currentUserRole = "view";
let currentPermissions = { can_add: false, can_edit: false, can_delete: false, can_manage_users: false, can_invite: false };
let lastMovedRowId = "";
const customOrderByProduct = {};
let activeEditRowId = null;
let activePrdRowId = null;
let prdImages = []; // [{name, dataUrl}] — images attached to the open PRD input modal
let clusterRowsAll = [];
let shippedRowsAll = [];
let renderedClusterRows = [];

init();

async function init() {
  await loadCurrentUser();
  await loadNotifications();

  const [productsRes, statusesRes, itemsRes, clusterRes, shippedRes] = await Promise.all([
    fetchJson("/api/roadmap/products"),
    fetchJson("/api/roadmap/statuses"),
    fetchJson("/api/roadmap/items"),
    fetchJson("/api/clusters?limit=10000"),
    fetchJson("/api/shipped?limit=10000"),
  ]);

  roadmapRows = itemsRes.items || [];
  const products = productsRes.products || [];
  const statuses = statusesRes.statuses || [];
  roadmapStatuses = statuses.slice();
  const themes = [...new Set((roadmapRows || []).map((r) => (r.theme || "").trim()).filter(Boolean))].sort();
  const owners = [...new Set((roadmapRows || []).map((r) => (r.owner || "").trim()).filter(Boolean))].sort();
  const quarters = [...new Set((roadmapRows || []).map((r) => (r.quarter || "").trim()).filter(Boolean))].sort();

  dom.productFilter.innerHTML = ['<option value="ALL">All Capabilities</option>']
    .concat(products.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`))
    .join("");

  dom.statusFilter.innerHTML += statuses
    .map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`)
    .join("");
  if (roadmapRows.some((r) => !String(r.status_raw || "").trim())) {
    dom.statusFilter.innerHTML += `<option value="${BLANK_STATUS_VALUE}">Blank</option>`;
  }
  if (dom.statusFilter.options.length) {
    dom.statusFilter.options[0].selected = true;
  }

  dom.roadmapProductFilter.innerHTML += products
    .map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`)
    .join("");
  dom.roadmapQuarterFilter.innerHTML += quarters
    .map((q) => `<option value="${escapeHtml(q)}">${escapeHtml(q)}</option>`)
    .join("");
  dom.roadmapStatusFilter.innerHTML += statuses
    .map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`)
    .join("");
  if (roadmapRows.some((r) => !String(r.status_raw || "").trim())) {
    dom.roadmapStatusFilter.innerHTML += `<option value="${BLANK_STATUS_VALUE}">Blank</option>`;
  }
  dom.roadmapThemeFilter.innerHTML += themes
    .map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`)
    .join("");
  dom.roadmapOwnerFilter.innerHTML += owners
    .map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`)
    .join("");
  dom.editStatus.innerHTML = ['<option value="">Not Started</option>']
    .concat(statuses.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`))
    .join("");

  clusterRowsAll = clusterRes.items || [];
  shippedRowsAll = shippedRes.items || [];
  const clusterProducts = [...new Set(clusterRowsAll.map((r) => r.product).filter(Boolean))].sort();
  dom.clusterProductFilter.innerHTML += clusterProducts
    .map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`)
    .join("");
  renderFilteredClusters();

  const render = () => {
    const selectedProduct = dom.productFilter.value;
    const selectedQuarter = dom.quarterFilter.value;
    const selectedStatuses = getTopSelectedStatuses();
    const roadmapProduct = dom.roadmapProductFilter.value;
    const roadmapQuarter = dom.roadmapQuarterFilter.value;
    const roadmapStatusesSelected = getRoadmapSelectedStatuses();
    const roadmapTheme = dom.roadmapThemeFilter.value;
    const roadmapOwner = dom.roadmapOwnerFilter.value;
    const roadmapMoved = dom.roadmapMovedFilter.value;
    const roadmapSearch = (dom.roadmapSearch.value || "").trim().toLowerCase();

    const scopeRows = roadmapRows.filter((r) => {
      const productOk = selectedProduct === "ALL" || r.product === selectedProduct;
      const quarterOk = selectedQuarter === "ALL" || r.quarter === selectedQuarter;
      const rowStatus = String(r.status_raw || "").trim();
      const statusOk = !selectedStatuses.length
        || selectedStatuses.includes(rowStatus)
        || (selectedStatuses.includes(BLANK_STATUS_VALUE) && !rowStatus);
      return productOk && quarterOk && statusOk;
    });

    const drillRows = scopeRows.filter((r) => {
      const productOk = roadmapProduct === "ALL" || r.product === roadmapProduct;
      const quarterOk = roadmapQuarter === "ALL" || r.quarter === roadmapQuarter;
      const rowStatus = String(r.status_raw || "").trim();
      const statusOk = !roadmapStatusesSelected.length
        || roadmapStatusesSelected.includes(rowStatus)
        || (roadmapStatusesSelected.includes(BLANK_STATUS_VALUE) && !rowStatus);
      const themeOk = roadmapTheme === "ALL" || (r.theme || "") === roadmapTheme;
      const ownerOk = roadmapOwner === "ALL" || (r.owner || "") === roadmapOwner;
      const moved = String(r.source_system || "").toLowerCase() === "semantic cluster";
      const movedOk = roadmapMoved === "ALL" || (roadmapMoved === "MOVED" ? moved : !moved);
      const searchOk = !roadmapSearch || rowMatchesKeyword(r, roadmapSearch);
      return productOk && quarterOk && statusOk && themeOk && ownerOk && movedOk && searchOk;
    });

    renderKpis(scopeRows, selectedProduct);
    renderProductProgress(scopeRows, selectedProduct);
    renderQuarterMatrix(scopeRows, selectedProduct);
    const statusMeta = roadmapStatusesSelected.length ? roadmapStatusesSelected.join(", ") : "ALL";
    renderDrilldown(drillRows, roadmapProduct, roadmapQuarter, statusMeta);
  };
  renderDashboard = render;

  dom.productFilter.addEventListener("change", render);
  dom.notifyBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleNotificationsPanel(); });
  document.addEventListener("click", (e) => {
    if (!dom.notifyPanel.classList.contains("hidden") &&
        !dom.notifyPanel.contains(e.target) &&
        e.target !== dom.notifyBtn) {
      dom.notifyPanel.classList.add("hidden");
    }
  });
  dom.inviteUserBtn.addEventListener("click", openInviteModal);
  dom.manageUsersBtn.addEventListener("click", openUserManagementModal);
  dom.logoutBtn.addEventListener("click", logout);
  dom.quarterFilter.addEventListener("change", render);
  dom.statusFilter.addEventListener("change", () => {
    normalizeTopStatusSelection();
    render();
  });
  dom.roadmapProductFilter.addEventListener("change", render);
  dom.roadmapQuarterFilter.addEventListener("change", render);
  dom.roadmapStatusFilter.addEventListener("change", () => {
    normalizeRoadmapStatusSelection();
    render();
  });
  dom.roadmapThemeFilter.addEventListener("change", render);
  dom.roadmapOwnerFilter.addEventListener("change", render);
  dom.roadmapMovedFilter.addEventListener("change", render);
  dom.roadmapSearch.addEventListener("input", render);
  dom.allActionsSelect.addEventListener("change", () => {
    const action = dom.allActionsSelect.value;
    if (action === "add") openAddModal();
    if (action === "export") exportRoadmapExcel();
    dom.allActionsSelect.value = "";
  });
  dom.drilldown.addEventListener("click", onRoadmapTableClick);
  dom.drilldown.addEventListener("change", onRoadmapTableChange);
  dom.clusterProductFilter.addEventListener("change", renderFilteredClusters);
  dom.clusterJiraFilter.addEventListener("change", renderFilteredClusters);
  dom.clusterVerdictFilter.addEventListener("change", renderFilteredClusters);
  dom.clusterMovedFilter.addEventListener("change", renderFilteredClusters);
  dom.clusterSearch.addEventListener("input", renderFilteredClusters);
  dom.downloadSFDataBtn.addEventListener("click", downloadSalesForceData);
  dom.uploadSFDataBtn.addEventListener("click", () => dom.uploadSFDataInput.click());
  dom.uploadSFDataInput.addEventListener("change", handleSFDataUpload);
  dom.editModalClose.addEventListener("click", closeEditModal);
  dom.editModalCancel.addEventListener("click", closeEditModal);
  dom.editModalSave.addEventListener("click", saveEditModal);
  dom.editModal.addEventListener("click", (e) => {
    if (e.target?.dataset?.modalClose === "true") closeEditModal();
  });
  dom.combinedClusterTable.addEventListener("click", onCombinedClusterTableClick);
  dom.clusterDetailClose.addEventListener("click", closeClusterDetailModal);
  dom.clusterDetailModal.addEventListener("click", (e) => {
    if (e.target?.dataset?.clusterModalClose === "true") closeClusterDetailModal();
  });
  dom.prdClose.addEventListener("click", closePrdModal);
  dom.prdModal.addEventListener("click", (e) => {
    if (e.target?.dataset?.prdModalClose === "true") closePrdModal();
  });
  dom.prdInputClose.addEventListener("click", closePrdInputModal);
  dom.prdInputCancel.addEventListener("click", closePrdInputModal);
  dom.prdInputGenerate.addEventListener("click", generatePrdFromInputs);
  dom.prdInputModal.addEventListener("click", (e) => {
    if (e.target?.dataset?.prdInputModalClose === "true") closePrdInputModal();
  });

  // ── PRD image upload wiring ──────────────────────────────────────────────
  dom.prdImageUploadBtn.addEventListener("click", () => dom.prdImageInput.click());
  dom.prdImageInput.addEventListener("change", (e) => {
    addPrdImages(e.target.files);
    e.target.value = ""; // reset so same file can be re-added
  });
  dom.prdImageDropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dom.prdImageDropzone.classList.add("drag-over");
  });
  dom.prdImageDropzone.addEventListener("dragleave", () => {
    dom.prdImageDropzone.classList.remove("drag-over");
  });
  dom.prdImageDropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dom.prdImageDropzone.classList.remove("drag-over");
    addPrdImages(e.dataTransfer.files);
  });
  dom.prdImagePreviews.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-img-idx]");
    if (btn) {
      prdImages.splice(parseInt(btn.dataset.imgIdx, 10), 1);
      renderPrdImagePreviews();
    }
  });
  // Clipboard paste — only active when PRD input modal is open (images only from clipboard)
  document.addEventListener("paste", (e) => {
    if (dom.prdInputModal.classList.contains("hidden")) return;
    const pastedFiles = Array.from(e.clipboardData?.items || [])
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter(Boolean);
    if (pastedFiles.length) addPrdImages(pastedFiles);
  });
  dom.addClusterItemBtn.addEventListener("click", openAddClusterModal);
  dom.addClusterModalClose.addEventListener("click", closeAddClusterModal);
  dom.addClusterModalCancel.addEventListener("click", closeAddClusterModal);
  dom.addClusterModalSave.addEventListener("click", saveAddClusterModal);
  dom.addClusterModal.addEventListener("click", (e) => {
    if (e.target?.dataset?.addClusterModalClose === "true") closeAddClusterModal();
  });
  dom.inviteClose.addEventListener("click", closeInviteModal);
  dom.inviteSend.addEventListener("click", submitInvite);
  dom.inviteModal.addEventListener("click", (e) => {
    if (e.target?.dataset?.inviteModalClose === "true") closeInviteModal();
  });
  dom.userMgmtClose.addEventListener("click", closeUserManagementModal);
  dom.userMgmtModal.addEventListener("click", (e) => {
    if (e.target?.dataset?.userMgmtClose === "true") closeUserManagementModal();
  });
  dom.userMgmtTable.addEventListener("change", onUserRoleChange);

  // Capability tooltip — hover via event delegation on the progress container
  dom.productProgress.addEventListener("mouseenter", (e) => {
    const row = e.target.closest(".progress-row[data-product]");
    if (!row) return;
    clearTimeout(_cttFadeTimer);
    showCapabilityTooltip(row.dataset.product, row);
  }, true);
  dom.productProgress.addEventListener("mouseleave", (e) => {
    const row = e.target.closest(".progress-row[data-product]");
    if (!row) return;
    if (row.contains(e.relatedTarget)) return;
    clearTimeout(_cttFadeTimer);
    hideCapabilityTooltip();
  }, true);

  configureRoleUi();
  render();
  setInterval(loadNotifications, 30000);
}

async function loadCurrentUser() {
  try {
    const me = await fetchJson("/api/auth/me");
    currentUserEmail = String(me.email || "").trim().toLowerCase();
    currentUserRole = String(me.role || "view").trim().toLowerCase();
    currentPermissions = me.permissions || currentPermissions;
    dom.roleBadge.textContent = `Role: ${currentUserRole}`;
    dom.profileEmail.textContent = me.email ? `My Profile: ${me.email}` : "My Profile";
  } catch (_err) {
    window.location.href = "/dashboard/login.html";
  }
}

function configureRoleUi() {
  dom.inviteUserBtn.style.display = currentPermissions.can_invite ? "" : "none";
  dom.manageUsersBtn.style.display = currentPermissions.can_manage_users ? "" : "none";
  dom.addClusterItemBtn.style.display = currentPermissions.can_add ? "" : "none";
  const actions = ['<option value="">All Actions</option>', '<option value="export">Export Excel</option>'];
  if (currentPermissions.can_add) actions.splice(1, 0, '<option value="add">Add Item</option>');
  dom.allActionsSelect.innerHTML = actions.join("");
}

async function logout() {
  try {
    await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  } catch (_err) {
    // Ignore and still redirect.
  }
  window.location.href = "/dashboard/login.html";
}

function toggleNotificationsPanel() {
  const isHidden = dom.notifyPanel.classList.toggle("hidden");
  if (!isHidden) {
    // Position the panel directly below the Notifications button
    const rect = dom.notifyBtn.getBoundingClientRect();
    dom.notifyPanel.style.top = `${rect.bottom + 6}px`;
    dom.notifyPanel.style.right = `${window.innerWidth - rect.right}px`;
  }
}

async function loadNotifications() {
  try {
    const data = await fetchJson("/api/notifications?limit=20");
    const items = data.items || [];
    dom.notifyCount.textContent = String(items.length);
    if (!items.length) {
      dom.notifyPanel.innerHTML = '<div class="notify-item">No new activity from other users.</div>';
      return;
    }
    dom.notifyPanel.innerHTML = items.map((e) => {
      const actor = e.actor_email || "Unknown";
      const action = String(e.action || "").replaceAll("_", " ");
      const details = e.details || "";
      const ts = formatEpoch(e.ts);
      return `<div class="notify-item"><strong>${escapeHtml(actor)}</strong> ${escapeHtml(action)}<br/><small>${escapeHtml(details)} | ${escapeHtml(ts)}</small></div>`;
    }).join("");
  } catch (_err) {
    dom.notifyCount.textContent = "0";
  }
}

function openInviteModal() {
  if (!currentPermissions.can_invite) return;
  dom.inviteEmail.value = "";
  dom.inviteRole.value = currentPermissions.can_manage_users ? "view" : "view";
  dom.inviteRole.disabled = !currentPermissions.can_manage_users;
  dom.inviteLink.value = "";
  dom.inviteModal.classList.remove("hidden");
  dom.inviteModal.setAttribute("aria-hidden", "false");
}

function closeInviteModal() {
  dom.inviteModal.classList.add("hidden");
  dom.inviteModal.setAttribute("aria-hidden", "true");
}

async function submitInvite() {
  const email = String(dom.inviteEmail.value || "").trim();
  const role = String(dom.inviteRole.value || "view").trim().toLowerCase();
  if (!email) {
    window.alert("Invite email is required.");
    return;
  }
  try {
    const res = await fetch("/api/invitations/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const body = await res.json();
    if (!res.ok || !body.ok) throw new Error(body.error || "Failed to create invite");
    const absolute = `${window.location.origin}${body.invite_link}`;
    dom.inviteLink.value = absolute;
    await loadNotifications();
  } catch (err) {
    window.alert(String(err.message || err));
  }
}

function closeUserManagementModal() {
  dom.userMgmtModal.classList.add("hidden");
  dom.userMgmtModal.setAttribute("aria-hidden", "true");
}

async function openUserManagementModal() {
  if (!currentPermissions.can_manage_users) return;
  try {
    const data = await fetchJson("/api/users/list");
    const items = data.items || [];
    dom.userMgmtTable.innerHTML = `
      <thead><tr><th>Email</th><th>Role</th></tr></thead>
      <tbody>
        ${items.map((u) => `<tr><td>${escapeHtml(u.email || "")}</td><td>
          <select data-user-email="${escapeHtml(u.email || "")}">
            <option value="view" ${u.role === "view" ? "selected" : ""}>View</option>
            <option value="edit" ${u.role === "edit" ? "selected" : ""}>Edit</option>
            <option value="admin" ${u.role === "admin" ? "selected" : ""}>Admin</option>
          </select>
        </td></tr>`).join("")}
      </tbody>
    `;
    dom.userMgmtModal.classList.remove("hidden");
    dom.userMgmtModal.setAttribute("aria-hidden", "false");
  } catch (err) {
    window.alert(String(err.message || err));
  }
}

async function onUserRoleChange(event) {
  const select = event.target.closest("select[data-user-email]");
  if (!select) return;
  const email = select.dataset.userEmail || "";
  const role = select.value;
  try {
    const res = await fetch("/api/users/set-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const body = await res.json();
    if (!res.ok || !body.ok) throw new Error(body.error || "Failed to update role");
    await loadNotifications();
  } catch (err) {
    window.alert(String(err.message || err));
  }
}

function renderFilteredClusters() {
  const p = dom.clusterProductFilter.value;
  const j = dom.clusterJiraFilter.value;
  const v = dom.clusterVerdictFilter.value;
  const m = dom.clusterMovedFilter.value;
  const q = (dom.clusterSearch.value || "").trim().toLowerCase();
  const movedClusterIds = new Set(
    (roadmapRows || [])
      .filter((r) => String(r.source_system || "").toLowerCase() === "semantic cluster")
      .map((r) => String(r.source_key || "").trim())
      .filter(Boolean),
  );

  const shippedById = new Map();
  const shippedByLabel = new Map();
  for (const s of shippedRowsAll || []) {
    if (s.cluster_id) shippedById.set(String(s.cluster_id), s);
    if (s.cluster_label) shippedByLabel.set(String(s.cluster_label), s);
  }

  const filtered = (clusterRowsAll || []).filter((r) => {
    const shipped = shippedById.get(String(r.cluster_id || "")) || shippedByLabel.get(String(r.cluster_label || "")) || {};
    const verdict = (shipped.decision || "N/A").toUpperCase();
    const moved = movedClusterIds.has(String(r.cluster_id || ""));
    const productOk = p === "ALL" || r.product === p;
    const jiraOk = j === "ALL" || Number(r.jira_ticket_count || 0) > 0;
    const verdictOk = v === "ALL" || verdict === v;
    const movedOk = m === "ALL" || (m === "MOVED" ? moved : !moved);
    const blob = `${r.cluster_label || ""} ${r.product || ""} ${r.representative_examples || ""} ${shipped.reason || ""}`.toLowerCase();
    const searchOk = !q || blob.includes(q);
    return productOk && jiraOk && verdictOk && movedOk && searchOk;
  });

  renderCombinedClusterTable(filtered, shippedRowsAll || []);
}

function getTopSelectedStatuses() {
  const values = Array.from(dom.statusFilter.selectedOptions || []).map((o) => o.value);
  if (!values.length || values.includes("ALL")) return [];
  return values.filter((v) => v !== "ALL");
}

function normalizeTopStatusSelection() {
  const options = Array.from(dom.statusFilter.options || []);
  const selected = options.filter((o) => o.selected).map((o) => o.value);
  const hasAll = selected.includes("ALL");

  if (hasAll && selected.length > 1) {
    options.forEach((o) => {
      if (o.value === "ALL") o.selected = false;
    });
    return;
  }

  if (!selected.length && options.length) {
    options[0].selected = true;
  }
}

function getRoadmapSelectedStatuses() {
  const values = Array.from(dom.roadmapStatusFilter.selectedOptions || []).map((o) => o.value);
  if (!values.length || values.includes("ALL")) return [];
  return values.filter((v) => v !== "ALL");
}

function normalizeRoadmapStatusSelection() {
  const options = Array.from(dom.roadmapStatusFilter.options || []);
  const selected = options.filter((o) => o.selected).map((o) => o.value);
  const hasAll = selected.includes("ALL");
  if (hasAll && selected.length > 1) {
    options.forEach((o) => {
      if (o.value === "ALL") o.selected = false;
    });
    return;
  }
  if (!selected.length && options.length) {
    options[0].selected = true;
  }
}

async function reloadRoadmapRows() {
  try {
    const itemsRes = await fetchJson("/api/roadmap/items");
    roadmapRows = itemsRes.items || roadmapRows;
  } catch (_err) {
    // Keep current in-memory rows on transient failures.
  }
}

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) {
    throw new Error(`Failed ${url}: ${r.status}`);
  }
  return r.json();
}

function renderKpis(rows, productLabel) {
  const total = rows.length;
  const done = rows.filter((r) => DONE_SET.has((r.status || "").toLowerCase())).length;
  const inProgress = rows.filter((r) => PROGRESS_SET.has((r.status || "").toLowerCase())).length;
  const todo = rows.filter((r) => TODO_SET.has((r.status || "").toLowerCase())).length;
  const avg = avgProgress(rows);

  const cards = [
    { label: productLabel === "ALL" ? "Org Annual Progress" : `${productLabel} Annual Progress`, value: `${avg.toFixed(1)}%` },
    { label: "Total Roadmap Items", value: total },
    { label: "Done Items", value: done },
    { label: "In Progress / At Risk", value: inProgress },
    { label: "Not Started / Backlog", value: todo },
  ];

  dom.kpiCards.innerHTML = cards
    .map((c) => `<div class="card"><div class="label">${escapeHtml(String(c.label))}</div><div class="value">${escapeHtml(String(c.value))}</div></div>`)
    .join("");
}

function renderProductProgress(allRows, selectedProduct) {
  const products = [...new Set(allRows.map((r) => r.product))].sort();
  const show = selectedProduct === "ALL" ? products : [selectedProduct];

  dom.productProgress.innerHTML = show
    .map((p) => {
      const rows = allRows.filter((r) => r.product === p);
      const progress = avgProgress(rows);
      return `<div class="progress-row" data-product="${escapeHtml(p)}">
        <div class="progress-top"><strong>${escapeHtml(p)}</strong><span>${progress.toFixed(1)}%</span></div>
        <div class="track"><div class="fill" style="width:${Math.max(0, Math.min(progress, 100)).toFixed(1)}%"></div></div>
      </div>`;
    })
    .join("");
}

// ── Capability Tooltip ─────────────────────────────────────────────────────
let _cttFadeTimer = null;

function showCapabilityTooltip(productName, anchorEl) {
  const tip = dom.capabilityTooltip;
  if (!tip) return;

  // Count items by status group for this product
  const items = (roadmapRows || []).filter((r) => r.product === productName);
  const total = items.length;
  const done = items.filter((r) => DONE_SET.has((r.status || "").toLowerCase())).length;
  const inProgress = items.filter((r) => PROGRESS_SET.has((r.status || "").toLowerCase())).length;
  const notStarted = items.filter((r) => TODO_SET.has((r.status || "").toLowerCase())).length;

  tip.innerHTML = `
    <div class="ctt-title">${escapeHtml(productName)}</div>
    <div class="ctt-stat-row">
      <span class="ctt-stat-label">Total Items</span>
      <span class="ctt-stat-val total">${total}</span>
    </div>
    <div class="ctt-stat-row">
      <span class="ctt-dot done"></span>
      <span class="ctt-stat-label">Done</span>
      <span class="ctt-stat-val done">${done}</span>
    </div>
    <div class="ctt-stat-row">
      <span class="ctt-dot progress"></span>
      <span class="ctt-stat-label">In Progress / At Risk</span>
      <span class="ctt-stat-val progress">${inProgress}</span>
    </div>
    <div class="ctt-stat-row">
      <span class="ctt-dot todo"></span>
      <span class="ctt-stat-label">Not Started / Backlog</span>
      <span class="ctt-stat-val todo">${notStarted}</span>
    </div>
  `;

  // Position near the anchor element
  const rect = anchorEl.getBoundingClientRect();
  tip.classList.remove("hidden", "fading");
  tip.removeAttribute("aria-hidden");

  // Initially position offscreen to measure height
  tip.style.top = "-9999px";
  tip.style.left = "-9999px";

  // Position: to the right of the row, or left if no room
  const tipW = 280;
  const tipH = tip.offsetHeight;
  let left = rect.right + 12;
  let top = rect.top + (rect.height / 2) - (tipH / 2);

  if (left + tipW > window.innerWidth - 12) {
    left = rect.left - tipW - 12;
  }
  if (top < 8) top = 8;
  if (top + tipH > window.innerHeight - 8) top = window.innerHeight - tipH - 8;

  tip.style.top = `${top}px`;
  tip.style.left = `${left}px`;
}

function hideCapabilityTooltip() {
  const tip = dom.capabilityTooltip;
  if (!tip || tip.classList.contains("hidden")) return;

  // Start 1-second fade then hide
  tip.classList.add("fading");
  _cttFadeTimer = setTimeout(() => {
    tip.classList.add("hidden");
    tip.setAttribute("aria-hidden", "true");
    tip.classList.remove("fading");
  }, 1000);
}

// Tooltip listeners are wired inside init() below alongside other listeners.

function renderQuarterMatrix(allRows, selectedProduct) {
  const products = selectedProduct === "ALL"
    ? [...new Set(allRows.map((r) => r.product))].sort()
    : [selectedProduct];

  const rowFor = (name, rows) => {
    const tds = QUARTERS.map((q) => {
      const qRows = rows.filter((r) => r.quarter === q);
      const v = qRows.length ? `${avgProgress(qRows).toFixed(1)}%` : "-";
      return `<td>${v}</td>`;
    }).join("");
    const annual = rows.length ? `${avgProgress(rows).toFixed(1)}%` : "-";
    return `<tr><td><strong>${escapeHtml(name)}</strong></td>${tds}<td><strong>${annual}</strong></td></tr>`;
  };

  const body = products.map((p) => rowFor(p, allRows.filter((r) => r.product === p))).join("");
  const orgRows = selectedProduct === "ALL" ? rowFor("ORG", allRows) : "";

  dom.quarterMatrix.innerHTML = `
    <thead>
      <tr><th>Scope</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th>Unassigned</th><th>Annual</th></tr>
    </thead>
    <tbody>${body}${orgRows}</tbody>
  `;
}

function renderDrilldown(rows, product, quarter, status) {
  const meta = `${rows.length} items | Product: ${product === "ALL" ? "All" : product} | Quarter: ${quarter} | Status: ${status}`;
  dom.drilldownMeta.textContent = meta;

  if (!rows.length) {
    dom.drilldown.innerHTML = '<p class="sub" style="padding: 4px 2px 8px;">No items match the current filters.</p>';
    return;
  }

  const sorted = getSortedRoadmapRows(rows, product);
  const isReorderEnabled = product !== "ALL" && currentPermissions.can_edit;

  dom.drilldown.innerHTML = `
    <div class="table-wrap roadmap-list-wrap">
      <table>
        <thead>
          <tr>
            <th>Order</th>
            <th>Seq</th>
            <th>Stack Rank</th>
            <th>Summary</th>
            <th>Description</th>
            <th>Product</th>
            <th>Hierarchy</th>
            <th>Theme</th>
            <th>AOP Goal</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Owner</th>
            <th>Quarter</th>
            <th>Prod Date</th>
            <th>Old Prod Date</th>
            <th>Customer Facing Date</th>
            <th>Timeline</th>
            <th>Moved From Top Ranked</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map((item, idx) => itemRow(item, idx, isReorderEnabled, item.roadmap_item_id === lastMovedRowId)).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function getCurrentDrillRows() {
  const selectedProduct = dom.productFilter.value;
  const selectedQuarter = dom.quarterFilter.value;
  const selectedStatuses = getTopSelectedStatuses();
  const roadmapProduct = dom.roadmapProductFilter.value;
  const roadmapQuarter = dom.roadmapQuarterFilter.value;
  const roadmapStatusesSelected = getRoadmapSelectedStatuses();
  const roadmapTheme = dom.roadmapThemeFilter.value;
  const roadmapOwner = dom.roadmapOwnerFilter.value;
  const roadmapMoved = dom.roadmapMovedFilter.value;
  const roadmapSearch = (dom.roadmapSearch.value || "").trim().toLowerCase();

  const scopeRows = roadmapRows.filter((r) => {
    const productOk = selectedProduct === "ALL" || r.product === selectedProduct;
    const quarterOk = selectedQuarter === "ALL" || r.quarter === selectedQuarter;
    const rowStatus = String(r.status_raw || "").trim();
    const statusOk = !selectedStatuses.length
      || selectedStatuses.includes(rowStatus)
      || (selectedStatuses.includes(BLANK_STATUS_VALUE) && !rowStatus);
    return productOk && quarterOk && statusOk;
  });

  const drillRows = scopeRows.filter((r) => {
    const productOk = roadmapProduct === "ALL" || r.product === roadmapProduct;
    const quarterOk = roadmapQuarter === "ALL" || r.quarter === roadmapQuarter;
    const rowStatus = String(r.status_raw || "").trim();
    const statusOk = !roadmapStatusesSelected.length
      || roadmapStatusesSelected.includes(rowStatus)
      || (roadmapStatusesSelected.includes(BLANK_STATUS_VALUE) && !rowStatus);
    const themeOk = roadmapTheme === "ALL" || (r.theme || "") === roadmapTheme;
    const ownerOk = roadmapOwner === "ALL" || (r.owner || "") === roadmapOwner;
    const moved = String(r.source_system || "").toLowerCase() === "semantic cluster";
    const movedOk = roadmapMoved === "ALL" || (roadmapMoved === "MOVED" ? moved : !moved);
    const searchOk = !roadmapSearch || rowMatchesKeyword(r, roadmapSearch);
    return productOk && quarterOk && statusOk && themeOk && ownerOk && movedOk && searchOk;
  });

  return { drillRows, roadmapProduct };
}

function itemRow(item, idx, isReorderEnabled, isHighlighted = false) {
  const status = (item.status || "").toLowerCase();
  const statusClass = DONE_SET.has(status) ? "done" : PROGRESS_SET.has(status) ? "progress" : "todo";
  const timeline = formatTimeline(item.start_date, item.end_date, item.quarter);
  const summary = item.title || "Untitled";
  const description = (item.description || "").trim();
  const prdDone = isTruthy(item.prd_generated);
  const prdLabel = prdDone ? "PRD Already Generated" : "Generate PRD";
  const movedFromTopRanked = String(item.source_system || "").toLowerCase() === "semantic cluster";
  const movedTag = movedFromTopRanked ? `Yes (${item.source_key || "-"})` : "-";
  const canEdit = !!currentPermissions.can_edit;
  const canDelete = currentUserEmail === "aditya.jaiswal@clear.in" && !!currentPermissions.can_delete;
  const actionOptions = ['<option value="">Options</option>'];
  if (canEdit) actionOptions.push('<option value="edit">Edit</option>');
  if (canEdit) actionOptions.push(`<option value="prd">${escapeHtml(prdLabel)}</option>`);
  if (canDelete) actionOptions.push('<option value="delete">Delete Item</option>');

  return `<tr data-row-id="${escapeHtml(item.roadmap_item_id || "")}" class="${isHighlighted ? "row-highlight" : ""}">
    <td>
      <div class="row-actions">
        <button class="move-btn" data-move="up" data-row-id="${escapeHtml(item.roadmap_item_id || "")}" ${isReorderEnabled ? "" : "disabled"}>&uarr;</button>
        <button class="move-btn" data-move="down" data-row-id="${escapeHtml(item.roadmap_item_id || "")}" ${isReorderEnabled ? "" : "disabled"}>&darr;</button>
      </div>
    </td>
    <td>${idx + 1}</td>
    <td>${escapeHtml(item.stack_rank || "")}</td>
    <td class="wide-cell">${escapeHtml(summary)}</td>
    <td class="wide-cell">${escapeHtml(description)}</td>
    <td>${escapeHtml(item.product || "")}</td>
    <td>${escapeHtml(item.hierarchy_level || "")}</td>
    <td>${escapeHtml(item.theme || "")}</td>
    <td>${escapeHtml(item.aop_goal || "")}</td>
    <td>${escapeHtml(item.priority || "")}</td>
    <td><span class="badge ${statusClass}">${escapeHtml(item.status_raw || "Not Started")}</span></td>
    <td>${escapeHtml(item.owner || "Unassigned")}</td>
    <td>${escapeHtml(item.quarter || "Unassigned")}</td>
    <td>${escapeHtml(item.prod_date_projected || "")}</td>
    <td>${escapeHtml(item.old_prod_date_projected || "")}</td>
    <td>${escapeHtml(item.customer_facing_date || "")}</td>
    <td>${escapeHtml(timeline)}</td>
    <td>${escapeHtml(movedTag)}</td>
    <td>
      <div class="row-actions-inline">
        <select class="row-option-select" data-row-option="${escapeHtml(item.roadmap_item_id || "")}">
          ${actionOptions.join("")}
        </select>
      </div>
    </td>
  </tr>`;
}

function getSortedRoadmapRows(rows, roadmapProduct) {
  const items = rows.slice();
  if (roadmapProduct !== "ALL") {
    const order = customOrderByProduct[roadmapProduct];
    if (order && order.length) {
      const idxById = new Map(order.map((id, idx) => [id, idx]));
      items.sort((a, b) => (idxById.get(a.roadmap_item_id) ?? 999999) - (idxById.get(b.roadmap_item_id) ?? 999999));
      return items;
    }
  }
  items.sort((a, b) => {
    const pa = stackRankValue(a.stack_rank);
    const pb = stackRankValue(b.stack_rank);
    if (pa !== pb) return pa - pb;
    return Number(b.progress || 0) - Number(a.progress || 0);
  });
  return items;
}

function stackRankValue(value) {
  const n = Number(value);
  if (Number.isFinite(n)) return n;
  return 999999;
}

function onRoadmapTableClick(event) {
  const btn = event.target.closest("button[data-move]");
  if (!btn) return;
  if (!currentPermissions.can_edit) return;

  const selectedProduct = dom.roadmapProductFilter.value;
  if (selectedProduct === "ALL") return;

  const rowId = btn.dataset.rowId;
  const direction = btn.dataset.move === "up" ? -1 : 1;
  moveRoadmapRow(rowId, direction, selectedProduct);
  persistProductRanks(selectedProduct);
  renderDashboard();
}

async function onRoadmapTableChange(event) {
  const select = event.target.closest("select[data-row-option]");
  if (!select) return;
  const rowId = select.dataset.rowOption || "";
  const action = select.value;
  select.value = "";
  if (!rowId || !action) return;
  if (action === "edit") {
    if (!currentPermissions.can_edit) return;
    openEditModal(rowId);
    return;
  }
  if (action === "prd") {
    if (!currentPermissions.can_edit) return;
    openPrdInputModal(rowId);
    return;
  }
  if (action === "delete") {
    if (!(currentUserEmail === "aditya.jaiswal@clear.in" && currentPermissions.can_delete)) {
      window.alert("Only aditya.jaiswal@clear.in can delete roadmap items.");
      return;
    }
    await deleteRoadmapRow(rowId);
  }
}

function openEditModal(rowId) {
  const row = roadmapRows.find((r) => r.roadmap_item_id === rowId);
  if (!row) return;

  activeEditRowId = rowId;
  dom.editModalTitle.textContent = "Edit Roadmap Item";
  dom.editProduct.value = row.product || "";
  dom.editHierarchy.value = row.hierarchy_level || "";
  dom.editStackRank.value = row.stack_rank || "";
  dom.editStatus.value = row.status_raw || "";
  dom.editOwner.value = row.owner || "";
  dom.editQuarter.value = row.quarter || "Unassigned";
  dom.editTheme.value = row.theme || "";
  dom.editPriority.value = row.priority || "";
  dom.editProdDate.value = row.prod_date_projected || "";
  dom.editOldProdDate.value = row.old_prod_date_projected || "";
  dom.editCustomerDate.value = row.customer_facing_date || "";
  dom.editAopGoal.value = row.aop_goal || "";
  dom.editTitle.value = row.title || "";
  dom.editDescription.value = row.description || "";

  dom.editModal.classList.remove("hidden");
  dom.editModal.setAttribute("aria-hidden", "false");
}

function openAddModal() {
  if (!currentPermissions.can_add) {
    window.alert("You do not have permission to add roadmap items.");
    return;
  }
  activeEditRowId = null;
  dom.editModalTitle.textContent = "Add Roadmap Item";
  dom.editProduct.value = dom.roadmapProductFilter.value !== "ALL" ? dom.roadmapProductFilter.value : "";
  dom.editHierarchy.value = "Initiative";
  dom.editStackRank.value = "";
  dom.editStatus.value = "";
  dom.editOwner.value = "";
  dom.editQuarter.value = "Unassigned";
  dom.editTheme.value = "";
  dom.editPriority.value = "";
  dom.editProdDate.value = "";
  dom.editOldProdDate.value = "";
  dom.editCustomerDate.value = "";
  dom.editAopGoal.value = "";
  dom.editTitle.value = "";
  dom.editDescription.value = "";
  dom.editModal.classList.remove("hidden");
  dom.editModal.setAttribute("aria-hidden", "false");
}

function closeEditModal() {
  activeEditRowId = null;
  dom.editModal.classList.add("hidden");
  dom.editModal.setAttribute("aria-hidden", "true");
}

async function saveEditModal() {
  if (!currentPermissions.can_edit) {
    window.alert("You do not have permission to edit roadmap items.");
    return;
  }
  const payload = {
    product: String(dom.editProduct.value || "").trim(),
    hierarchy_level: String(dom.editHierarchy.value || "").trim(),
    stack_rank: String(dom.editStackRank.value || "").trim(),
    status_raw: String(dom.editStatus.value || "").trim(),
    owner: String(dom.editOwner.value || "").trim(),
    quarter: String(dom.editQuarter.value || "Unassigned").trim(),
    theme: String(dom.editTheme.value || "").trim(),
    priority: String(dom.editPriority.value || "").trim(),
    prod_date_projected: String(dom.editProdDate.value || "").trim(),
    old_prod_date_projected: String(dom.editOldProdDate.value || "").trim(),
    customer_facing_date: String(dom.editCustomerDate.value || "").trim(),
    aop_goal: String(dom.editAopGoal.value || "").trim(),
    title: String(dom.editTitle.value || "").trim(),
    description: String(dom.editDescription.value || "").trim(),
  };

  if (!payload.product || !payload.title) {
    window.alert("Product and Summary are required.");
    return;
  }

  if (activeEditRowId) {
    const row = roadmapRows.find((r) => r.roadmap_item_id === activeEditRowId);
    if (!row) return;
    Object.assign(row, payload);
    row.status = (row.status_raw || "").toLowerCase();
    if (DONE_SET.has(row.status)) row.progress = 100;
    else if (PROGRESS_SET.has(row.status)) row.progress = 50;
    else if (TODO_SET.has(row.status)) row.progress = 0;
    else row.progress = 25;
    delete customOrderByProduct[row.product];
    await persistRowEdit(row.roadmap_item_id, payload);
  } else {
    await addRoadmapRow(payload);
  }

  await reloadRoadmapRows();
  closeEditModal();
  renderDashboard();
}

async function persistRowEdit(rowId, fields) {
  try {
    await fetch("/api/roadmap/save-row", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ row_id: rowId, fields }),
    });
  } catch (_err) {
    // Ignore transient failures; UI state still updates.
  }
}

async function persistProductRanks(product) {
  const items = roadmapRows
    .filter((r) => r.product === product)
    .map((r) => ({ row_id: r.roadmap_item_id, fields: { stack_rank: r.stack_rank } }));
  try {
    await fetch("/api/roadmap/save-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
  } catch (_err) {
    // Ignore transient failures; UI state still updates.
  }
}

async function addRoadmapRow(fields) {
  const res = await fetch("/api/roadmap/add-row", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  const body = await res.json();
  if (!res.ok || !body.ok) {
    throw new Error(body.error || "Failed to add roadmap item");
  }
  return body;
}

async function deleteRoadmapRow(rowId) {
  const row = roadmapRows.find((r) => r.roadmap_item_id === rowId);
  const title = row?.title || rowId;
  const ok = window.confirm(`Delete this roadmap item?\n\n${title}`);
  if (!ok) return;
  try {
    const res = await fetch("/api/roadmap/delete-row", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ row_id: rowId }),
    });
    const body = await res.json();
    if (!res.ok || !body.ok) {
      throw new Error(body.error || "Delete failed");
    }
    await reloadRoadmapRows();
    renderDashboard();
    await loadNotifications();
  } catch (err) {
    window.alert(String(err.message || err || "Delete failed"));
  }
}

function moveRoadmapRow(rowId, direction, product) {
  const productRows = roadmapRows.filter((r) => r.product === product);
  if (!productRows.length) return;

  let sequence = customOrderByProduct[product];
  if (!sequence || !sequence.length) {
    sequence = productRows
      .slice()
      .sort((a, b) => stackRankValue(a.stack_rank) - stackRankValue(b.stack_rank))
      .map((r) => r.roadmap_item_id);
  } else {
    sequence = sequence.slice();
  }

  const idx = sequence.indexOf(rowId);
  if (idx < 0) return;
  const targetIdx = idx + direction;
  if (targetIdx < 0 || targetIdx >= sequence.length) return;

  const temp = sequence[idx];
  sequence[idx] = sequence[targetIdx];
  sequence[targetIdx] = temp;
  customOrderByProduct[product] = sequence;

  sequence.forEach((id, i) => {
    const row = roadmapRows.find((r) => r.roadmap_item_id === id);
    if (row) row.stack_rank = String(i + 1);
  });
}

function exportRoadmapExcel() {
  const { drillRows, roadmapProduct } = getCurrentDrillRows();
  const sorted = getSortedRoadmapRows(drillRows, roadmapProduct);
  if (!sorted.length) {
    window.alert("No roadmap items to export for current filters.");
    return;
  }

  const headers = [
    "Seq",
    "Stack Rank",
    "Summary",
    "Description",
    "Product",
    "Hierarchy",
    "Theme",
    "AOP Goal",
    "Priority",
    "Status",
    "Owner",
    "Quarter",
    "Prod Date",
    "Old Prod Date",
    "Customer Facing Date",
    "Timeline",
    "Roadmap Item ID",
  ];

  const headerHtml = headers.map((h) => `<th>${escapeExcelHtml(h)}</th>`).join("");
  const rowsHtml = sorted.map((item, idx) => {
    const cells = [
      idx + 1,
      item.stack_rank || "",
      item.title || "",
      item.description || "",
      item.product || "",
      item.hierarchy_level || "",
      item.theme || "",
      item.aop_goal || "",
      item.priority || "",
      item.status_raw || "",
      item.owner || "",
      item.quarter || "",
      item.prod_date_projected || "",
      item.old_prod_date_projected || "",
      item.customer_facing_date || "",
      formatTimeline(item.start_date, item.end_date, item.quarter),
      item.roadmap_item_id || "",
    ].map((v) => `<td>${escapeExcelHtml(v)}</td>`).join("");
    return `<tr>${cells}</tr>`;
  }).join("");

  const content = [
    "<html><head><meta charset=\"utf-8\"></head><body>",
    "<table border=\"1\">",
    `<thead><tr>${headerHtml}</tr></thead>`,
    `<tbody>${rowsHtml}</tbody>`,
    "</table>",
    "</body></html>",
  ].join("");
  const blob = new Blob([content], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const a = document.createElement("a");
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  a.href = URL.createObjectURL(blob);
  a.download = `ccc_roadmap_${stamp}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

function renderCombinedClusterTable(clusterItems, shippedItems) {
  const movedClusterIds = new Set(
    (roadmapRows || [])
      .filter((r) => String(r.source_system || "").toLowerCase() === "semantic cluster")
      .map((r) => String(r.source_key || "").trim())
      .filter(Boolean),
  );
  renderedClusterRows = clusterItems.slice();
  dom.clusterMeta.textContent = `${clusterItems.length} clusters`;
  if (!clusterItems.length) {
    dom.combinedClusterTable.innerHTML = "<tbody><tr><td>No semantic cluster file found. Run scripts/semantic_cluster_llm.py</td></tr></tbody>";
    return;
  }

  const shippedById = new Map();
  const shippedByLabel = new Map();
  for (const s of shippedItems || []) {
    if (s.cluster_id) shippedById.set(String(s.cluster_id), s);
    if (s.cluster_label) shippedByLabel.set(String(s.cluster_label), s);
  }

  const badgeFor = (decision) => {
    const d = (decision || "").toUpperCase();
    if (d === "SHIPPED") return "shipped";
    if (d === "POSSIBLY_SHIPPED") return "possible";
    return "notshipped";
  };

  const priorityClass = (label) => {
    switch ((label || "").toLowerCase()) {
      case "critical": return "p-critical";
      case "high":     return "p-high";
      case "medium":   return "p-medium";
      default:         return "p-low";
    }
  };

  dom.combinedClusterTable.innerHTML = `
    <thead>
      <tr>
        <th>Rank</th><th>Cluster</th><th>Product</th>
        <th>Customers</th><th>Tickets</th><th>Account Active ARR</th>
        <th>Priority</th><th>Score</th>
        <th>Verdict</th><th>Confidence</th><th>Citation</th><th>Analysis</th><th>Action</th>
      </tr>
    </thead>
    <tbody>
      ${clusterItems.map((r) => {
        const moved = movedClusterIds.has(String(r.cluster_id || ""));
        const shipped = shippedById.get(String(r.cluster_id || "")) || shippedByLabel.get(String(r.cluster_label || "")) || {};
        const analysis = shipped.reason || shipped.verification_notes || "No additional analysis.";
        const section = shipped.section_1 || "";
        const citation = shipped.citation_1 || "";
        const citationHtml = citation
          ? `<a href="${escapeHtml(citation)}" target="_blank" rel="noreferrer">${section ? escapeHtml(section) : "source"}</a>`
          : "-";
        const analysisText = section ? `Section matched: ${section}. ${analysis}` : analysis;
        const canAdd = !!currentPermissions.can_add;
        const clusterLabelText = moved ? `${r.cluster_label || ""} [Moved]` : (r.cluster_label || "");
        const priorityLabel = r.priority_label || "";
        const descriptionSnippet = (r.cluster_description || "").slice(0, 80) + ((r.cluster_description || "").length > 80 ? "…" : "");
        const clusterCellHtml = descriptionSnippet
          ? `<strong>${escapeHtml(clusterLabelText)}</strong><br><small style="color:#6b7280">${escapeHtml(descriptionSnippet)}</small>`
          : escapeHtml(clusterLabelText);
        return `<tr data-cluster-id="${escapeHtml(String(r.cluster_id || ""))}">
          <td>${escapeHtml(String(r.rank || "-"))}</td>
          <td style="max-width:260px">${clusterCellHtml}</td>
          <td>${escapeHtml(r.product || "")}</td>
          <td>${escapeHtml(String(r.customer_count || "0"))}</td>
          <td>${escapeHtml(String(r.ticket_count_total || "0"))}</td>
          <td>${escapeHtml(formatCurrency(r.account_active_arr_total || "0"))}</td>
          <td>${priorityLabel ? `<span class="badge ${priorityClass(priorityLabel)}">${escapeHtml(priorityLabel)}</span>` : "-"}</td>
          <td>${escapeHtml(String(r.rank_score || "0"))}</td>
          <td><span class="badge ${badgeFor(shipped.decision)}">${escapeHtml(shipped.decision || "N/A")}</span></td>
          <td>${escapeHtml(String(shipped.confidence || "-"))}</td>
          <td>${citationHtml}</td>
          <td class="wide-cell">${escapeHtml(analysisText)}</td>
          <td style="white-space:nowrap">
            ${canAdd ? (moved
              ? `<span class="badge done">Moved</span>`
              : `<button class="move-btn" data-cluster-action="move" data-cluster-id="${escapeHtml(String(r.cluster_id || ""))}">Move to Roadmap</button>`)
              : ""}
            ${canAdd ? `<button class="move-btn cluster-delete-btn" data-cluster-action="delete" data-cluster-id="${escapeHtml(String(r.cluster_id || ""))}" title="Delete this cluster item" style="margin-left:4px;background:#fee2e2;color:#b91c1c;border-color:#fca5a5">Delete</button>` : ""}
            ${!canAdd ? "-" : ""}
          </td>
        </tr>`;
      }).join("")}
    </tbody>
  `;
}

function onCombinedClusterTableClick(event) {
  const actionBtn = event.target.closest("button[data-cluster-action]");
  if (actionBtn) {
    const clusterId = actionBtn.dataset.clusterId || "";
    const action = actionBtn.dataset.clusterAction || "";
    if (action === "move" && clusterId) {
      void moveClusterToRoadmap(clusterId);
    }
    if (action === "delete" && clusterId) {
      void deleteClusterRow(clusterId);
    }
    return;
  }
  if (event.target.closest("a, button")) return;
  const rowEl = event.target.closest("tr[data-cluster-id]");
  if (!rowEl) return;
  const clusterId = rowEl.dataset.clusterId || "";
  const row = renderedClusterRows.find((r) => String(r.cluster_id || "") === clusterId);
  if (!row) return;
  openClusterDetailModal(row);
}

async function moveClusterToRoadmap(clusterId) {
  if (!currentPermissions.can_add) {
    window.alert("You do not have permission to add roadmap items.");
    return;
  }
  const cluster = renderedClusterRows.find((r) => String(r.cluster_id || "") === String(clusterId));
  if (!cluster) return;
  const title = String(cluster.cluster_label || "").trim() || `Requirement ${clusterId}`;
  const examples = String(cluster.representative_examples || "").trim();
  const customers = String(cluster.customer_count || "0");
  const tickets = String(cluster.ticket_count_total || "0");
  const arr = formatCurrency(cluster.account_active_arr_total || "0");
  const descriptionParts = [
    `Moved from Feature request raised on salesforce cluster ${clusterId}.`,
    `Customers impacted: ${customers}. Tickets: ${tickets}. Account Active ARR: ${arr}.`,
    examples ? `Representative asks: ${examples}` : "",
  ].filter(Boolean);
  const payload = {
    product: String(cluster.product || "").trim() || "Unknown",
    hierarchy_level: "Initiative",
    stack_rank: "",
    status_raw: "Not Started",
    owner: "",
    quarter: "Unassigned",
    theme: "Customer Requirement",
    priority: "P2",
    prod_date_projected: "",
    old_prod_date_projected: "",
    customer_facing_date: "",
    aop_goal: "Customer Ask",
    title,
    description: descriptionParts.join(" "),
    source_system: "Semantic Cluster",
    source_key: String(cluster.cluster_id || ""),
    source_file: "Feature request raised on salesforce",
  };
  try {
    const added = await addRoadmapRow(payload);
    const newRowId = String(added.row_id || "");
    await reloadRoadmapRows();
    focusMovedRoadmapItem(payload.product, newRowId);
    renderFilteredClusters();
    renderDashboard();
    window.alert("Moved to roadmap successfully.");
  } catch (err) {
    window.alert(String(err.message || err || "Failed to move item to roadmap"));
  }
}

// ── Add / Delete Cluster Item ────────────────────────────────────────────

function openAddClusterModal() {
  if (!currentPermissions.can_add) {
    window.alert("You do not have permission to add items.");
    return;
  }
  // Populate product dropdown from existing cluster products
  const products = [...new Set((clusterRowsAll || []).map((r) => r.product).filter(Boolean))].sort();
  dom.acProduct.innerHTML = [
    '<option value="">— Select —</option>',
    ...products.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`),
  ].join("");
  // Pre-select product filter if set
  if (dom.clusterProductFilter.value !== "ALL") dom.acProduct.value = dom.clusterProductFilter.value;
  dom.acLabel.value = "";
  dom.acPriority.value = "";
  dom.acCustomerCount.value = "";
  dom.acTicketCount.value = "";
  dom.acArr.value = "";
  dom.acCustomerNames.value = "";
  dom.acDescription.value = "";
  dom.acExamples.value = "";
  dom.addClusterModal.classList.remove("hidden");
  dom.addClusterModal.setAttribute("aria-hidden", "false");
  dom.acLabel.focus();
}

function closeAddClusterModal() {
  dom.addClusterModal.classList.add("hidden");
  dom.addClusterModal.setAttribute("aria-hidden", "true");
}

async function saveAddClusterModal() {
  const label = dom.acLabel.value.trim();
  const product = dom.acProduct.value.trim();
  if (!label || !product) {
    window.alert("Requirement Title and Product are required.");
    return;
  }
  const fields = {
    cluster_label: label,
    product,
    priority_label: dom.acPriority.value.trim(),
    customer_count: dom.acCustomerCount.value.trim() || "0",
    ticket_count_total: dom.acTicketCount.value.trim() || "0",
    account_active_arr_total: dom.acArr.value.trim() || "0",
    customer_names: dom.acCustomerNames.value.trim(),
    cluster_description: dom.acDescription.value.trim(),
    representative_examples: dom.acExamples.value.trim(),
    rank: "",
    rank_score: "0",
    jira_ticket_count: "0",
  };
  try {
    dom.addClusterModalSave.disabled = true;
    dom.addClusterModalSave.textContent = "Adding…";
    const res = await fetch("/api/clusters/add-row", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
    const body = await res.json();
    if (!res.ok || !body.ok) throw new Error(body.error || "Failed to add item");
    closeAddClusterModal();
    // Reload clusters from server
    const clusterRes = await fetchJson("/api/clusters?limit=9999");
    clusterRowsAll = clusterRes.items || clusterRowsAll;
    renderFilteredClusters();
  } catch (err) {
    window.alert(String(err.message || err || "Failed to add item"));
  } finally {
    dom.addClusterModalSave.disabled = false;
    dom.addClusterModalSave.textContent = "Add to Top Ranked";
  }
}

async function deleteClusterRow(clusterId) {
  if (!currentPermissions.can_add) {
    window.alert("You do not have permission to delete items.");
    return;
  }
  const row = renderedClusterRows.find((r) => String(r.cluster_id || "") === String(clusterId));
  const label = row?.cluster_label || clusterId;
  if (!window.confirm(`Delete this cluster item?\n\n${label}`)) return;
  try {
    const res = await fetch("/api/clusters/delete-row", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cluster_id: clusterId }),
    });
    const body = await res.json();
    if (!res.ok || !body.ok) throw new Error(body.error || "Delete failed");
    const clusterRes = await fetchJson("/api/clusters?limit=9999");
    clusterRowsAll = clusterRes.items || clusterRowsAll;
    renderFilteredClusters();
  } catch (err) {
    window.alert(String(err.message || err || "Delete failed"));
  }
}

function focusMovedRoadmapItem(product, rowId) {
  lastMovedRowId = rowId || "";
  dom.productFilter.value = product || "ALL";
  dom.quarterFilter.value = "ALL";
  Array.from(dom.statusFilter.options || []).forEach((o) => {
    o.selected = o.value === "ALL";
  });
  dom.roadmapProductFilter.value = product || "ALL";
  dom.roadmapQuarterFilter.value = "ALL";
  dom.roadmapStatusFilter.value = "ALL";
  dom.roadmapThemeFilter.value = "ALL";
  dom.roadmapOwnerFilter.value = "ALL";
  dom.roadmapSearch.value = "";
  if (dom.roadmapSectionCollapse) dom.roadmapSectionCollapse.open = true;
  setTimeout(() => {
    const row = document.querySelector(`tr[data-row-id="${CSS.escape(rowId || "")}"]`);
    if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 40);
}

async function openClusterDetailModal(clusterRow) {
  const shipped = (shippedRowsAll || []).find(
    (s) =>
      String(s.cluster_id || "") === String(clusterRow.cluster_id || "") ||
      String(s.cluster_label || "") === String(clusterRow.cluster_label || ""),
  ) || {};

  const priority = clusterRow.priority_label || "";
  const verdict = shipped.decision || "";

  // ── Header ──────────────────────────────────────────────────────────────
  if (dom.cdetLabel) dom.cdetLabel.textContent = clusterRow.cluster_label || "-";
  if (dom.cdetId) dom.cdetId.textContent = clusterRow.cluster_id || "";

  if (dom.cdetProduct) {
    dom.cdetProduct.textContent = clusterRow.product || "";
    dom.cdetProduct.style.display = clusterRow.product ? "" : "none";
  }

  if (dom.cdetPriority) {
    const pCls = { Critical: "p-critical", High: "p-high", Medium: "p-medium", Low: "p-low" };
    dom.cdetPriority.textContent = priority || "";
    dom.cdetPriority.className = `cdet-priority-badge ${pCls[priority] || ""}`;
    dom.cdetPriority.style.display = priority ? "" : "none";
  }

  if (dom.cdetVerdict) {
    const vCls = { SHIPPED: "verdict-shipped", POSSIBLY_SHIPPED: "verdict-possible", NOT_SHIPPED: "verdict-not" };
    const vLabel = { SHIPPED: "Shipped", POSSIBLY_SHIPPED: "Possibly Shipped", NOT_SHIPPED: "Not Shipped" };
    dom.cdetVerdict.textContent = vLabel[verdict] || verdict || "";
    dom.cdetVerdict.className = `cdet-verdict-badge ${vCls[verdict] || ""}`;
    dom.cdetVerdict.style.display = verdict ? "" : "none";
  }

  // ── What customers are asking ────────────────────────────────────────────
  if (dom.cdetDesc) {
    const desc = (clusterRow.cluster_description || "").trim();
    dom.cdetDesc.textContent = desc || "No description available.";
  }

  // ── Impact stat chips ───────────────────────────────────────────────────
  if (dom.cdetStats) {
    const reasoning = (clusterRow.priority_reasoning || "").trim();
    const stats = [
      { label: "Customers", value: clusterRow.customer_count || "0" },
      { label: "Tickets", value: clusterRow.ticket_count_total || "0" },
      { label: "Account Active ARR", value: `₹${formatCurrency(clusterRow.account_active_arr_total || "0")}` },
      { label: "Open Tickets", value: `${clusterRow.open_count || "0"} / ${clusterRow.ticket_count_total || "0"}` },
      { label: "JIRA Linked", value: clusterRow.jira_ticket_count || "0" },
      { label: "Score", value: clusterRow.rank_score || "0" },
    ];
    dom.cdetStats.innerHTML = stats
      .map((s) => `<div class="cdet-stat-chip"><span class="cdet-stat-label">${escapeHtml(s.label)}</span><span class="cdet-stat-value">${escapeHtml(String(s.value))}</span></div>`)
      .join("");
    if (reasoning) {
      dom.cdetStats.insertAdjacentHTML("afterend",
        `<p class="cdet-reasoning"><strong>Priority Rationale:</strong> ${escapeHtml(reasoning)}</p>`);
      // remove previous rationale to avoid duplication
      const prev = dom.cdetStats.nextElementSibling;
      if (prev && prev.classList.contains("cdet-reasoning")) {
        prev.remove();
        dom.cdetStats.insertAdjacentHTML("afterend",
          `<p class="cdet-reasoning"><strong>Priority Rationale:</strong> ${escapeHtml(reasoning)}</p>`);
      }
    } else {
      const prev = dom.cdetStats.nextElementSibling;
      if (prev && prev.classList.contains("cdet-reasoning")) prev.remove();
    }
  }

  // ── Customers affected ───────────────────────────────────────────────────
  if (dom.cdetCustomers) {
    const names = (clusterRow.top_customers || clusterRow.customer_names || "")
      .split("|").map((x) => x.trim()).filter(Boolean);
    dom.cdetCustomers.innerHTML = names.length
      ? names.map((n) => `<span class="cdet-customer-chip">${escapeHtml(n)}</span>`).join("")
      : '<span class="cdet-no-data">No customer names available.</span>';
  }

  // Show modal immediately — tickets load async below
  dom.clusterDetailModal.classList.remove("hidden");
  dom.clusterDetailModal.setAttribute("aria-hidden", "false");

  // ── Individual tickets (async) ───────────────────────────────────────────
  if (dom.clusterDetailTicketsCount) dom.clusterDetailTicketsCount.textContent = "";
  if (dom.clusterDetailTicketsList) {
    dom.clusterDetailTicketsList.innerHTML = '<p class="cluster-tickets-loading">Loading tickets…</p>';
  }

  if (clusterRow.cluster_id && dom.clusterDetailTicketsList) {
    try {
      const data = await fetchJson(`/api/clusters/${encodeURIComponent(clusterRow.cluster_id)}/items`);
      const tickets = data.items || [];
      if (dom.clusterDetailTicketsCount) {
        dom.clusterDetailTicketsCount.textContent = `(${tickets.length} ticket${tickets.length !== 1 ? "s" : ""})`;
      }
      dom.clusterDetailTicketsList.innerHTML = tickets.length
        ? tickets.map((t) => renderTicketCard(t)).join("")
        : '<p class="cluster-tickets-empty">No individual ticket details available.</p>';
    } catch (_) {
      dom.clusterDetailTicketsList.innerHTML = '<p class="cluster-tickets-empty">Could not load ticket details.</p>';
    }
  }
}

function renderTicketCard(t) {
  const status = (t.status || "").trim();
  const isOpen = /open|pending/i.test(status);
  const statusCls = isOpen ? "ticket-status-open" : "ticket-status-closed";
  const issueTypes = [t.issue_type_1, t.issue_type_2].filter(Boolean).join(" › ");
  const desc = (t.description || "").trim();
  const dateStr = t.created_date ? `<span class="ticket-date">${escapeHtml(t.created_date.slice(0, 10))}</span>` : "";
  const severityBadge = t.severity ? `<span class="ticket-severity">Sev: ${escapeHtml(t.severity)}</span>` : "";
  const issueBadge = issueTypes ? `<span class="ticket-issue-type">${escapeHtml(issueTypes)}</span>` : "";

  return `<div class="ticket-card">
    <div class="ticket-card-header">
      <span class="ticket-id">${escapeHtml(t.case_number || t.request_id || "")}</span>
      <span class="ticket-customer">${escapeHtml(t.account_name || "")}</span>
      <span class="ticket-status ${statusCls}">${escapeHtml(status)}</span>
      ${issueBadge}${severityBadge}${dateStr}
    </div>
    <div class="ticket-title">${escapeHtml(t.title || "")}</div>
    ${desc ? `<div class="ticket-desc">${escapeHtml(desc)}</div>` : ""}
  </div>`;
}

function closeClusterDetailModal() {
  dom.clusterDetailModal.classList.add("hidden");
  dom.clusterDetailModal.setAttribute("aria-hidden", "true");
}

// ── PRD file helpers ──────────────────────────────────────────────────────

// File-type icon map (emoji fallbacks, always visible without extra assets)
const FILE_ICONS = {
  pdf: "📄", doc: "📝", docx: "📝",
  xls: "📊", xlsx: "📊", csv: "📊",
  ppt: "📑", pptx: "📑",
  txt: "📋", md: "📋", rst: "📋",
};

function fileExt(name) {
  return (name || "").split(".").pop().toLowerCase();
}

function fileIcon(name, isImage) {
  if (isImage) return "🖼️";
  return FILE_ICONS[fileExt(name)] || "📎";
}

async function extractDocumentText(dataUrl, filename, mimeType) {
  try {
    const res = await fetch("/api/extract-document", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, mime_type: mimeType, data_b64: dataUrl }),
    });
    if (!res.ok) return "";
    const json = await res.json();
    return (json.text || "").trim();
  } catch {
    return "";
  }
}

function addPrdImages(files) {
  const tasks = Array.from(files)
    .filter((f) => f)
    .map((file) =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const dataUrl = e.target.result;
          const isImage = file.type.startsWith("image/");
          let extractedText = "";
          if (!isImage) {
            // Extract text from document via backend
            extractedText = await extractDocumentText(dataUrl, file.name, file.type);
          }
          prdImages.push({ name: file.name, dataUrl, type: file.type, isImage, extractedText });
          resolve();
        };
        reader.readAsDataURL(file);
      })
    );
  Promise.all(tasks).then(renderPrdImagePreviews);
}

function renderPrdImagePreviews() {
  if (!dom.prdImagePreviews) return;
  dom.prdImagePreviews.innerHTML = prdImages
    .map((file, i) => {
      const shortName = file.name.length > 22 ? file.name.slice(0, 20) + "…" : file.name;
      const hasText = file.extractedText && file.extractedText.length > 0;
      const badge = hasText
        ? `<span class="prd-file-text-badge" title="Text extracted">✓ text read</span>`
        : (file.isImage ? "" : `<span class="prd-file-text-badge prd-file-text-badge--warn" title="Could not extract text">no text</span>`);
      if (file.isImage) {
        return `
          <div class="prd-image-thumb-wrap">
            <img class="prd-image-thumb" src="${file.dataUrl}" alt="${escapeHtml(file.name)}" title="${escapeHtml(file.name)}" />
            <button type="button" class="prd-image-delete" data-img-idx="${i}" title="Remove">✕</button>
            <span class="prd-image-name">${escapeHtml(shortName)}</span>
          </div>`;
      }
      return `
        <div class="prd-image-thumb-wrap prd-file-thumb-wrap">
          <span class="prd-file-icon">${fileIcon(file.name, false)}</span>
          <button type="button" class="prd-image-delete" data-img-idx="${i}" title="Remove">✕</button>
          <span class="prd-image-name">${escapeHtml(shortName)}</span>
          ${badge}
        </div>`;
    })
    .join("");
}

function openPrdInputModal(rowId) {
  const row = roadmapRows.find((r) => r.roadmap_item_id === rowId);
  if (!row) return;
  activePrdRowId = rowId;
  dom.prdInputDescription.value = row.prd_description || "";
  dom.prdInputVideoLink.value = row.prd_video_link || "";
  dom.prdInputDocLink.value = row.prd_customer_doc_link || "";
  dom.prdInputUseFallback.checked = isTruthy(row.prd_use_doc_inference);
  dom.prdInputGenerate.textContent = isTruthy(row.prd_generated) ? "Regenerate PRD" : "Generate PRD";
  // Restore previously saved images
  prdImages = [];
  try {
    const saved = row.prd_images ? JSON.parse(row.prd_images) : [];
    prdImages = Array.isArray(saved) ? saved : [];
  } catch { prdImages = []; }
  renderPrdImagePreviews();
  dom.prdInputModal.classList.remove("hidden");
  dom.prdInputModal.setAttribute("aria-hidden", "false");
}

function closePrdInputModal() {
  activePrdRowId = null;
  prdImages = [];
  if (dom.prdImagePreviews) dom.prdImagePreviews.innerHTML = "";
  dom.prdInputModal.classList.add("hidden");
  dom.prdInputModal.setAttribute("aria-hidden", "true");
}

async function generatePrdFromInputs() {
  const row = roadmapRows.find((r) => r.roadmap_item_id === activePrdRowId);
  if (!row) return;
  const prdDescription = String(dom.prdInputDescription.value || "").trim();
  const prdVideoLink = String(dom.prdInputVideoLink.value || "").trim();
  const prdDocLink = String(dom.prdInputDocLink.value || "").trim();
  const useFallback = Boolean(dom.prdInputUseFallback.checked);

  if (!prdDescription && !prdVideoLink && !prdDocLink && !useFallback && !prdImages.length) {
    window.alert("Add PRD Description, images, Video Link, or Customer Requirement PDF link. Or enable fallback to generate from guides/release notes.");
    return;
  }

  // Collect extracted text from uploaded documents
  const docTexts = prdImages
    .filter((f) => !f.isImage && f.extractedText)
    .map((f) => `[From: ${f.name}]\n${f.extractedText}`)
    .join("\n\n---\n\n");

  const prdContent = buildPrdDocument(row, {
    prdDescription,
    prdVideoLink,
    prdDocLink,
    useFallback,
    docTexts,
    attachmentNames: prdImages.map((f) => f.name),
  });
  const fields = {
    prd_generated: "true",
    prd_description: prdDescription,
    prd_video_link: prdVideoLink,
    prd_customer_doc_link: prdDocLink,
    prd_use_doc_inference: useFallback ? "true" : "false",
    prd_generated_at: new Date().toISOString(),
    prd_content: prdContent,
    prd_images: JSON.stringify(prdImages),
  };
  Object.assign(row, fields);
  await persistRowEdit(row.roadmap_item_id, fields);
  await reloadRoadmapRows();
  closePrdInputModal();
  openPrdModal(row.roadmap_item_id);
  renderDashboard();
}

function openPrdModal(rowId) {
  const row = roadmapRows.find((r) => r.roadmap_item_id === rowId);
  if (!row) return;
  dom.prdContent.value = String(row.prd_content || "").trim() || buildPrdDocument(row, {
    prdDescription: row.prd_description || "",
    prdVideoLink: row.prd_video_link || "",
    prdDocLink: row.prd_customer_doc_link || "",
    useFallback: isTruthy(row.prd_use_doc_inference),
  });
  // Show attachments in the view modal (images + documents)
  let viewFiles = [];
  try { viewFiles = row.prd_images ? JSON.parse(row.prd_images) : []; } catch { viewFiles = []; }
  if (dom.prdViewImages && dom.prdViewImageGrid) {
    if (viewFiles.length) {
      dom.prdViewImageGrid.innerHTML = viewFiles
        .map((f) => {
          const shortName = (f.name || "").length > 22 ? f.name.slice(0, 20) + "…" : (f.name || "file");
          if (f.isImage !== false) {
            // Image
            return `
              <div class="prd-image-thumb-wrap">
                <a href="${f.dataUrl}" target="_blank">
                  <img class="prd-image-thumb" src="${f.dataUrl}" alt="${escapeHtml(f.name)}" title="Click to view full size" />
                </a>
                <span class="prd-image-name">${escapeHtml(shortName)}</span>
              </div>`;
          }
          // Document file — show as download link
          return `
            <div class="prd-image-thumb-wrap prd-file-thumb-wrap">
              <a href="${f.dataUrl}" download="${escapeHtml(f.name)}" title="Download ${escapeHtml(f.name)}">
                <span class="prd-file-icon">${fileIcon(f.name, false)}</span>
              </a>
              <span class="prd-image-name">${escapeHtml(shortName)}</span>
            </div>`;
        })
        .join("");
      dom.prdViewImages.style.display = "";
    } else {
      dom.prdViewImages.style.display = "none";
      dom.prdViewImageGrid.innerHTML = "";
    }
  }
  dom.prdModal.classList.remove("hidden");
  dom.prdModal.setAttribute("aria-hidden", "false");
}

function closePrdModal() {
  dom.prdModal.classList.add("hidden");
  dom.prdModal.setAttribute("aria-hidden", "true");
}

function buildPrdDocument(row, input = {}) {
  const title = row.title || "Untitled Requirement";
  const product = row.product || "Unknown Product";
  const quarter = row.quarter || "Unassigned";
  const owner = row.owner || "Unassigned";
  const status = row.status_raw || "Not Started";
  const theme = row.theme || "Uncategorized";
  const priority = row.priority || "TBD";
  const prodDate = row.prod_date_projected || "TBD";
  const customerDate = row.customer_facing_date || "TBD";
  const desc = row.description || "No detailed description provided in roadmap source.";
  const userDesc = String(input.prdDescription || "").trim();
  const videoLink = String(input.prdVideoLink || "").trim();
  const docLink = String(input.prdDocLink || "").trim();
  const fallbackMode = Boolean(input.useFallback);
  const docTexts = String(input.docTexts || "").trim();
  const attachmentNames = Array.isArray(input.attachmentNames) ? input.attachmentNames : [];
  const aop = row.aop_goal || "Not specified";
  const timeline = formatTimeline(row.start_date, row.end_date, quarter);
  const problemStatement = userDesc || desc;

  return [
    `# PRD: ${title}`,
    "",
    "## 1. Problem Statement",
    `${problemStatement}`,
    "",
    "## 2. Users / Personas",
    `- Primary: Product users of ${product}`,
    `- Secondary: Internal operations, support, and implementation teams`,
    "",
    "## 3. Scope",
    `- In Scope: ${title}`,
    `- Product: ${product}`,
    `- Theme: ${theme}`,
    `- AOP Goal: ${aop}`,
    "",
    "## 4. Non-Goals",
    "- Major platform re-architecture beyond this roadmap item",
    "- Out-of-scope feature expansion not tied to this requirement",
    "",
    "## 5. Functional Requirements",
    `- Deliver the roadmap item: ${title}`,
    `- Implement behavior described as: ${problemStatement}`,
    `- Ensure production readiness by ${prodDate}`,
    "",
    "## 6. UX Notes",
    "- Use existing product UX patterns unless PM/Design specifies changes",
    "- Keep workflow discoverable and reduce manual steps where possible",
    "",
    "## 7. Acceptance Criteria",
    `- Item status can move to Done with measurable outcome for "${title}"`,
    "- Core use case is validated in QA/UAT",
    "- No critical defects at release cutoff",
    "",
    "## 8. Dependencies",
    `- Owner: ${owner}`,
    `- Priority: ${priority}`,
    `- Timeline: ${timeline}`,
    "",
    "## 9. Rollout Plan",
    `- Target Quarter: ${quarter}`,
    `- Projected Production Date: ${prodDate}`,
    `- Customer Facing Date: ${customerDate}`,
    "",
    "## 10. Metrics / Success Criteria",
    `- Roadmap status progression from "${status}" to "Done"`,
    "- Reduction in escalations / tickets linked to this problem area",
    "- Positive stakeholder and customer validation after release",
    "",
    "## 11. Traceability",
    `- Roadmap Item ID: ${row.roadmap_item_id || "-"}`,
    `- Stack Rank: ${row.stack_rank || "-"}`,
    `- Quarter: ${quarter}`,
    "",
    "## 12. Input Evidence",
    `- PRD Description Provided: ${userDesc ? "Yes" : "No"}`,
    `- Video Link: ${videoLink || "Not provided"}`,
    `- Customer Requirement Document: ${docLink || "Not provided"}`,
    `- Attached Files: ${attachmentNames.length ? attachmentNames.join(", ") : "None"}`,
    `- Guide/Release-Note fallback mode: ${fallbackMode ? "Enabled" : "Disabled"}`,
    "",
    "## 13. Guide/Release-Note Derived Possibilities",
    fallbackMode
      ? `- Possible PRD generated using existing roadmap context plus product guides/release notes for ${product}; PM validation required before engineering commitment.`
      : "- Fallback inference not requested.",
    ...(docTexts ? [
      "",
      "## 14. Requirements Extracted from Uploaded Documents",
      docTexts,
    ] : []),
  ].join("\n");
}

async function downloadSalesForceData() {
  const btn = dom.downloadSFDataBtn;
  if (!btn) return;
  
  // Disable button during download
  btn.disabled = true;
  btn.textContent = "Downloading...";
  
  try {
    // Step 1: Call the proxy API to generate the Excel file
    const generateResponse = await fetch("/api/sf-proxy/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "case_record_type__c": ["B2B Enterprise"],
        "customer_segment__c": ["B2B-Enterprise"],
        "type": [],
        "last_n_months": 6
      })
    });
    
    if (!generateResponse.ok) {
      let detail = "";
      try {
        const errBody = await generateResponse.json();
        detail = errBody?.error ? `: ${errBody.error}` : "";
      } catch (_err) {
        detail = "";
      }
      throw new Error(`Failed to generate Excel file (${generateResponse.status})${detail}`);
    }
    
    const generateData = await generateResponse.json();
    
    if (generateData.error) {
      throw new Error(generateData.error);
    }
    
    if (!generateData.downloadUrl) {
      throw new Error("No download URL received from server");
    }

    // Step 2: Download the file using the proxy URL
    const downloadResponse = await fetch(generateData.downloadUrl);

    if (!downloadResponse.ok) {
      throw new Error(`Failed to download file: ${downloadResponse.status}`);
    }

    // Step 3: Create a blob and trigger download
    const blob = await downloadResponse.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = generateData.fileName || "salesforce_data.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    // Show success or warning message
    const rowCount = generateData.rowCount;
    if (rowCount != null && rowCount === 0) {
      window.alert(
        `No data to download yet.\n\n` +
        `To populate this file:\n` +
        `1. Download the Excel from your Athena / Java backend client\n` +
        `2. Click "Upload SF Data" to upload that Excel here\n` +
        `3. Wait for processing to complete\n` +
        `4. Then "Download SF Data" will contain your Salesforce rows.`
      );
    } else {
      const rowInfo = rowCount != null ? `\nRows: ${rowCount}` : "";
      const warnInfo = generateData.warning ? `\nNote: ${generateData.warning}` : "";
      window.alert(`Downloaded: ${generateData.fileName}${rowInfo}${warnInfo}`);
    }
    
  } catch (error) {
    console.error("Error downloading Salesforce data:", error);
    window.alert(`Failed to download Salesforce data: ${error.message}`);
  } finally {
    // Re-enable button
    btn.disabled = false;
    btn.textContent = "Download SF Data";
  }
}

async function handleSFDataUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const btn = dom.uploadSFDataBtn;
  if (!btn) return;

  // Validate file type
  if (!file.name.match(/\.(xlsx|xls)$/i)) {
    window.alert("Please upload an Excel file (.xlsx or .xls)");
    event.target.value = "";
    return;
  }

  // Disable button during upload
  btn.disabled = true;
  btn.textContent = "Uploading...";

  try {
    // Create FormData to send the file
    const formData = new FormData();
    formData.append("file", file);

    // Upload the file
    const uploadResponse = await fetch("/api/sf-data/upload", {
      method: "POST",
      body: formData
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({}));
      throw new Error(errorData.error || `Upload failed: ${uploadResponse.status}`);
    }

    const uploadData = await uploadResponse.json();

    if (uploadData.error) {
      throw new Error(uploadData.error);
    }

    // Show success message
    window.alert(`File uploaded successfully!\n\nProcessing Salesforce data and updating Feature request raised on salesforce...\n\nThis may take a few minutes. You will see the updated data once processing is complete.`);

    // Trigger LLM processing
    btn.textContent = "Processing...";
    const processResponse = await fetch("/api/sf-data/process", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ filename: uploadData.filename })
    });

    if (!processResponse.ok) {
      const errorData = await processResponse.json().catch(() => ({}));
      throw new Error(errorData.error || `Processing failed: ${processResponse.status}`);
    }

    const processData = await processResponse.json();

    if (processData.error) {
      throw new Error(processData.error);
    }

    // Reload cluster data
    const clusterRes = await fetchJson("/api/clusters?limit=10000");
    clusterRowsAll = clusterRes.items || [];
    renderFilteredClusters();

    window.alert(`Processing complete!\n\n${processData.message || "Feature request raised on salesforce have been updated."}`);

  } catch (error) {
    console.error("Error uploading Salesforce data:", error);
    window.alert(`Failed to upload/process Salesforce data: ${error.message}`);
  } finally {
    // Re-enable button and reset file input
    btn.disabled = false;
    btn.textContent = "Upload SF Data";
    event.target.value = "";
  }
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}

function isTruthy(value) {
  const v = String(value || "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function avgProgress(rows) {
  if (!rows.length) return 0;
  const total = rows.reduce((sum, r) => sum + Number(r.progress || 0), 0);
  return total / rows.length;
}

function formatTimeline(startDate, endDate, quarter) {
  const s = (startDate || "").trim();
  const e = (endDate || "").trim();
  if (s && e) return `${s} to ${e}`;
  if (e) return `By ${e}`;
  if (s) return `From ${s}`;
  return quarter || "TBD";
}

function rowMatchesKeyword(row, keyword) {
  const blob = [
    row.stack_rank,
    row.title,
    row.description,
    row.product,
    row.hierarchy_level,
    row.theme,
    row.aop_goal,
    row.priority,
    row.status_raw,
    row.owner,
    row.quarter,
    row.prod_date_projected,
    row.old_prod_date_projected,
    row.customer_facing_date,
    row.start_date,
    row.end_date,
  ]
    .map((x) => String(x || "").toLowerCase())
    .join(" ");
  return blob.includes(keyword);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatCurrency(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

function sanitizeExcelCell(value) {
  return String(value ?? "")
    .replaceAll("\t", " ")
    .replaceAll("\r", " ")
    .replaceAll("\n", " ")
    .trim();
}

function escapeExcelHtml(value) {
  return sanitizeExcelCell(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatEpoch(ts) {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return "";
  return new Date(n * 1000).toLocaleString();
}

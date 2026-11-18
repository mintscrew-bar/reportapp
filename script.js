// jsPDF 전역 객체 할당
const { jsPDF } = window.jspdf;

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sanitizeFilenamePart(value) {
  return String(value || "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/[. ]+$/g, "")
    .slice(0, 80) || "미입력";
}

function appendInputRow(tbody, fields) {
  const row = tbody.insertRow();
  fields.forEach(field => {
    const cell = row.insertCell();
    const input = document.createElement("input");
    input.type = field.type || "text";
    input.className = field.className || "table-input";
    input.value = field.value ?? "";
    if (field.placeholder) input.placeholder = field.placeholder;
    if (field.min !== undefined) input.min = field.min;
    if (field.step !== undefined) input.step = field.step;
    cell.appendChild(input);
  });
  return row;
}

function focusAfterRender(element) {
  window.requestAnimationFrame(() => {
    if (!element?.isConnected || typeof element.focus !== "function") return;
    element.focus({ preventScroll: true });
  });
}

function focusFirstEditable(root) {
  const element = root?.querySelector(
    'input:not([type="hidden"]):not([type="file"]):not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled]), select:not([disabled])'
  );
  focusAfterRender(element);
}

function confirmInApp(message) {
  document.querySelector(".modal-overlay.confirm-dialog")?.remove();
  const previouslyFocused = document.activeElement;

  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay confirm-dialog active";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "확인");

    const content = document.createElement("div");
    content.className = "modal-content";
    const text = document.createElement("p");
    text.textContent = message;

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "btn btn-secondary";
    cancelButton.textContent = "취소";
    const confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.className = "btn btn-warning";
    confirmButton.textContent = "확인";
    actions.append(cancelButton, confirmButton);
    content.append(text, actions);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    let closed = false;
    const close = confirmed => {
      if (closed) return;
      closed = true;
      document.removeEventListener("keydown", handleKeydown);
      overlay.remove();
      if (!confirmed) focusAfterRender(previouslyFocused);
      resolve(confirmed);
    };
    const handleKeydown = event => {
      if (event.key === "Escape") close(false);
      if (event.key === "Enter") close(true);
    };

    cancelButton.addEventListener("click", () => close(false));
    confirmButton.addEventListener("click", () => close(true));
    overlay.addEventListener("click", event => {
      if (event.target === overlay) close(false);
    });
    document.addEventListener("keydown", handleKeydown);
    focusAfterRender(confirmButton);
  });
}

function normalizeReceiptItem(item = {}) {
  return {
    ...item,
    category: item.category || "",
    description: item.description ?? item.item ?? "",
    amount: item.amount ?? item.price ?? "",
    includeInPdf: item.includeInPdf !== false,
  };
}

function hideInputPlaceholdersForExport(root) {
  const placeholders = Array.from(root.querySelectorAll("input[placeholder]"))
    .map(input => ({ input, placeholder: input.placeholder }));
  placeholders.forEach(({ input }) => { input.placeholder = ""; });
  return () => placeholders.forEach(({ input, placeholder }) => { input.placeholder = placeholder; });
}

function showExportPreview({ title, description, sourceElement, confirmLabel, onConfirm, preparePreview }) {
  document.querySelector(".export-preview-overlay")?.remove();

  const overlay = document.createElement("div");
  overlay.className = "export-preview-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", title);

  const modal = document.createElement("div");
  modal.className = "export-preview-modal";

  const header = document.createElement("div");
  header.className = "export-preview-header";
  const headingGroup = document.createElement("div");
  const heading = document.createElement("h2");
  heading.textContent = title;
  const guide = document.createElement("p");
  guide.textContent = description;
  headingGroup.append(heading, guide);
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "export-preview-close";
  closeButton.setAttribute("aria-label", "미리보기 닫기");
  closeButton.textContent = "×";
  header.append(headingGroup, closeButton);

  const viewport = document.createElement("div");
  viewport.className = "export-preview-viewport";
  const page = document.createElement("div");
  page.className = "export-preview-page";
  const preview = sourceElement.cloneNode(true);
  preview.classList.add("export-preview-document");
  if (preparePreview) preparePreview(preview);

  const sourceControls = sourceElement.querySelectorAll("input, textarea, select");
  const previewControls = preview.querySelectorAll("input, textarea, select");
  previewControls.forEach((control, index) => {
    const sourceControl = sourceControls[index];
    if (!sourceControl || sourceControl.type === "file" || sourceControl.type === "hidden") {
      control.remove();
      return;
    }
    const preparedValue = control.dataset.exportValue;
    const value = preparedValue !== undefined
      ? preparedValue
      : sourceControl.tagName === "SELECT"
        ? sourceControl.options[sourceControl.selectedIndex]?.text || ""
        : sourceControl.value || "";
    const field = document.createElement("div");
    field.className = control.tagName === "TEXTAREA" ? "export-preview-textarea" : "export-preview-field";
    field.textContent = value;
    control.replaceWith(field);
  });

  preview.querySelectorAll(".table-controls, .receipt-attach-btn, .receipt-remove-image-btn")
    .forEach(element => element.remove());
  preview.querySelectorAll("[id]").forEach(element => element.removeAttribute("id"));
  preview.querySelectorAll("[for]").forEach(element => element.removeAttribute("for"));
  page.appendChild(preview);
  viewport.appendChild(page);

  const footer = document.createElement("div");
  footer.className = "export-preview-footer";
  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "btn btn-secondary";
  cancelButton.textContent = "취소";
  const confirmButton = document.createElement("button");
  confirmButton.type = "button";
  confirmButton.className = "btn btn-primary";
  confirmButton.textContent = confirmLabel;
  footer.append(cancelButton, confirmButton);

  modal.append(header, viewport, footer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  document.body.classList.add("preview-open");

  const close = () => {
    document.removeEventListener("keydown", handleKeydown);
    document.body.classList.remove("preview-open");
    overlay.remove();
  };
  const handleKeydown = event => {
    if (event.key === "Escape") close();
  };
  closeButton.addEventListener("click", close);
  cancelButton.addEventListener("click", close);
  overlay.addEventListener("click", event => {
    if (event.target === overlay) close();
  });
  confirmButton.addEventListener("click", () => {
    close();
    Promise.resolve(onConfirm()).catch(error => console.error("내보내기 오류:", error));
  });
  document.addEventListener("keydown", handleKeydown);
  closeButton.focus();
}

class ExpenseStore {
  constructor() {
    this.records = {};
    this.ready = this.initialize();
  }

  async initialize() {
    const result = await window.electronAPI.loadExpenses();
    this.records = result?.data || {};
    return result;
  }

  generateId() {
    return `expense-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }

  getByReport(reportId) {
    return Object.values(this.records)
      .filter(record => record.sourceReportId === reportId)
      .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
  }

  getByMonth(date) {
    const month = String(date || "").slice(0, 7);
    if (!month) return [];
    return Object.values(this.records)
      .filter(record => String(record.date || "").startsWith(month))
      .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  }

  normalizeRecord(expense, defaults = {}) {
    const id = expense.id || this.generateId();
    const existing = this.records[id] || {};
    return {
      ...existing,
      ...defaults,
      id,
      date: expense.date || defaults.date || existing.date || getLocalDateString(),
      category: expense.category || existing.category || "기타",
      description: expense.description ?? expense.item ?? existing.description ?? "",
      quantity: Number(expense.quantity ?? existing.quantity) || 1,
      amount: Number(expense.amount ?? expense.price ?? existing.amount) || 0,
      note: expense.note ?? existing.note ?? "",
      receiptImage: expense.receiptImage ?? existing.receiptImage ?? "",
      createdAt: existing.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async syncReport(reportId, date, expenses) {
    const incomingIds = new Set();
    const normalized = expenses.map(expense => {
      const record = this.normalizeRecord(expense, { sourceReportId: reportId, date });
      incomingIds.add(record.id);
      this.records[record.id] = record;
      return record;
    });

    Object.values(this.records).forEach(record => {
      if (record.sourceReportId === reportId && !incomingIds.has(record.id)) delete this.records[record.id];
    });
    await this.save();
    return normalized;
  }

  async replaceRecords(previousIds, expenses) {
    const incomingIds = new Set();
    const normalized = expenses.map(expense => {
      const record = this.normalizeRecord(expense);
      incomingIds.add(record.id);
      this.records[record.id] = record;
      return record;
    });
    previousIds.forEach(id => {
      if (!incomingIds.has(id)) delete this.records[id];
    });
    await this.save();
    return normalized;
  }

  async migrateReports(reports) {
    let changed = false;
    Object.values(reports).forEach(report => {
      if (!report?.id) return;
      let sharedExpenses = this.getByReport(report.id);
      if (sharedExpenses.length === 0) {
        (report.dailyExpenses || []).forEach(expense => {
          const record = this.normalizeRecord(expense, {
            sourceReportId: report.id,
            date: report.date,
          });
          this.records[record.id] = record;
          changed = true;
        });
        sharedExpenses = this.getByReport(report.id);
      }
      if (!Array.isArray(report.expenseIds)) {
        report.expenseIds = sharedExpenses.map(expense => expense.id);
        changed = true;
      }
    });
    if (changed) await this.save();
    return changed;
  }

  async migrateReceipts(receipts) {
    let changed = false;
    Object.values(receipts).forEach(receipt => {
      if (!receipt?.id || Object.values(this.records).some(record => record.sourceReceiptId === receipt.id)) return;
      (receipt.items || []).forEach(item => {
        if (!item.category && !item.item && !item.description && !item.amount && !item.price && !item.note) return;
        const record = this.normalizeRecord({
          date: item.date || receipt.date,
          category: item.category,
          description: item.description ?? item.item,
          quantity: item.quantity,
          amount: item.amount ?? item.price,
          note: item.note,
          receiptImage: item.receiptImage,
        }, { sourceReceiptId: receipt.id });
        this.records[record.id] = record;
        changed = true;
      });
    });
    if (changed) await this.save();
  }

  save() {
    return window.electronAPI.saveExpenses(this.records);
  }
}

class DraftStore {
  constructor() {
    this.data = {};
    this.ready = this.initialize();
  }

  async initialize() {
    const result = await window.electronAPI.loadDrafts();
    this.data = result?.data || {};
  }

  get(key) {
    return this.data[key] || null;
  }

  async set(key, value) {
    this.data[key] = { ...value, savedAt: new Date().toISOString() };
    return window.electronAPI.saveDrafts(this.data);
  }

  async clear(key) {
    delete this.data[key];
    return window.electronAPI.saveDrafts(this.data);
  }
}

// =================================
// 탭 전환 관리
// =================================
function initTabNavigation() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;

      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById(`${tabName}-tab`).classList.add('active');

      document.querySelectorAll('.sidebar-content').forEach(s => s.classList.remove('active'));
      document.getElementById(`${tabName}-sidebar`).classList.add('active');

      document.querySelectorAll('.daily-report-btn').forEach(b => {
        b.style.display = tabName === 'daily-report' ? '' : 'none';
      });
      document.querySelectorAll('.receipt-btn').forEach(b => {
        b.style.display = tabName === 'receipt' ? '' : 'none';
      });

      if (tabName === 'receipt' && !draftStore.get("receipt")) {
        receiptApp.loadMonthExpenses();
      }

      focusFirstEditable(document.getElementById(`${tabName}-tab`));
    });
  });
}

// =================================
// 일일업무보고서 앱
// =================================
class DailyReportApp {
  constructor(expenseStore, draftStore) {
    this.messages = {
      saveSuccess: "보고서가 성공적으로 저장되었습니다.",
      saveFailure: "보고서를 저장하지 못했습니다. 다시 시도해주세요.",
      saveError: "날짜와 작성자는 필수 항목입니다.",
      loadSuccess: "보고서를 불러왔습니다.",
      deleteConfirm: "정말로 이 보고서를 삭제하시겠습니까?",
      deleteSuccess: "보고서가 삭제되었습니다.",
      clearConfirm: "모든 입력 내용을 초기화하시겠습니까?",
      clearSuccess: "폼이 초기화되었습니다.",
      exportError: "내보낼 데이터가 없습니다. 필수 항목을 입력해주세요.",
      exportExcelSuccess: "Excel 파일로 내보내기가 완료되었습니다.",
      exportPdfProgress: "PDF 파일을 생성하고 있습니다.",
      exportPdfSuccess: "PDF 파일로 내보내기가 완료되었습니다.",
      noSavedReports: "저장된 보고서가 없습니다.",
      minRowError: "최소 1개의 행은 유지해야 합니다.",
    };

    this.reports = {};
    this.currentReportId = null;
    this.expenseStore = expenseStore;
    this.draftStore = draftStore;
    this.autosaveTimer = null;

    this.initializeApp();
  }

  async initializeApp() {
    await Promise.all([this.expenseStore.ready, this.draftStore.ready]);
    this.reports = await this.loadReportsFromStorage();
    const reportsMigrated = await this.expenseStore.migrateReports(this.reports);
    if (reportsMigrated) await this.saveReportsToStorage();
    this.setInitialDate();
    this.attachEventListeners();
    this.initializeTables();
    this.restoreDraft();
    this.displayReportList();
  }

  setInitialDate() {
    document.getElementById("reportDate").value = getLocalDateString();
  }

  initializeTables() {
    if (document.getElementById("dailyWorkTableBody").rows.length === 0) this.addDailyWorkRow();
    if (document.getElementById("dailyExpenseTableBody").rows.length === 0) this.addExpenseRow();
    if (document.getElementById("weeklyPlanTableBody").rows.length === 0) this.addWeeklyPlanRow();
    if (document.getElementById("monthlyPlanTableBody").rows.length === 0) this.addMonthlyPlanRow();
  }

  attachEventListeners() {
    document.getElementById("saveBtn").addEventListener("click", () => this.saveReport());
    document.getElementById("clearBtn").addEventListener("click", () => this.clearForm());
    document.getElementById("exportExcelBtn").addEventListener("click", () => this.previewExport("excel"));
    document.getElementById("exportPdfBtn").addEventListener("click", () => this.previewExport("pdf"));

    document.getElementById("addDailyRow").addEventListener("click", () => {
      const row = this.addDailyWorkRow();
      focusFirstEditable(row);
      this.scheduleAutosave();
    });
    document.getElementById("removeDailyRow").addEventListener("click", () => {
      this.removeDailyWorkRow();
      this.scheduleAutosave();
    });
    document.getElementById("addExpenseRow").addEventListener("click", () => {
      const row = this.addExpenseRow();
      focusFirstEditable(row);
      this.scheduleAutosave();
    });
    document.getElementById("removeExpenseRow").addEventListener("click", () => {
      this.removeExpenseRow();
      this.scheduleAutosave();
    });
    document.getElementById("dailyExpenseTableBody").addEventListener("input", event => {
      if (event.target.classList.contains("expense-amount-input")) this.updateExpenseTotal();
    });
    document.getElementById("addWeeklyRow").addEventListener("click", () => {
      const row = this.addWeeklyPlanRow();
      focusFirstEditable(row);
      this.scheduleAutosave();
    });
    document.getElementById("removeWeeklyRow").addEventListener("click", () => {
      this.removeWeeklyPlanRow();
      this.scheduleAutosave();
    });
    document.getElementById("addMonthlyRow").addEventListener("click", () => {
      const row = this.addMonthlyPlanRow();
      focusFirstEditable(row);
      this.scheduleAutosave();
    });
    document.getElementById("removeMonthlyRow").addEventListener("click", () => {
      this.removeMonthlyPlanRow();
      this.scheduleAutosave();
    });

    const reportDocument = document.querySelector("#daily-report-tab .document");
    reportDocument.addEventListener("input", () => this.scheduleAutosave());
    reportDocument.addEventListener("change", () => this.scheduleAutosave());
  }

  async loadReportsFromStorage() {
    const result = await window.electronAPI.loadData();
    if (result?.warning) this.showNotification(result.warning, "error");
    return result?.data || {};
  }

  saveReportsToStorage() {
    return window.electronAPI.saveData(this.reports);
  }

  getFormData() {
    const dailyWorkData = Array.from(document.querySelectorAll("#dailyWorkTableBody tr")).map(row => {
      const inputs = row.querySelectorAll("input");
      return { time: inputs[0].value, work: inputs[1].value, note: inputs[2].value };
    }).filter(item => item.time || item.work || item.note);
    const dailyExpenseData = Array.from(document.querySelectorAll("#dailyExpenseTableBody tr")).map(row => {
      const inputs = row.querySelectorAll("input");
      return {
        id: row.dataset.expenseId || "",
        category: inputs[0].value,
        description: inputs[1].value,
        amount: Number(inputs[2].value) || 0,
        note: inputs[3].value,
      };
    }).filter(item => item.category || item.description || item.amount || item.note);
    const weeklyPlanData = Array.from(document.querySelectorAll("#weeklyPlanTableBody input"))
      .map(input => input.value.trim())
      .filter(Boolean);
    const monthlyPlanData = Array.from(document.querySelectorAll("#monthlyPlanTableBody input"))
      .map(input => input.value.trim())
      .filter(Boolean);

    return {
      date: document.getElementById("reportDate").value,
      reporter: document.getElementById("reporter").value,
      instructions: document.getElementById("instructions").value,
      otherReports: document.getElementById("otherReports").value,
      dailyWork: dailyWorkData,
      dailyExpenses: dailyExpenseData,
      weeklyPlan: weeklyPlanData,
      monthlyPlan: monthlyPlanData,
    };
  }

  setFormData(data) {
    document.getElementById("reportDate").value = data.date || "";
    document.getElementById("reporter").value = data.reporter || "";
    document.getElementById("instructions").value = data.instructions || "";
    document.getElementById("otherReports").value = data.otherReports || "";

    this.setTableData("dailyWorkTableBody", data.dailyWork || [], this.addDailyWorkRow);
    this.setExpenseTableData(data.dailyExpenses || []);
    this.setTableData("weeklyPlanTableBody", data.weeklyPlan || [], this.addWeeklyPlanRow);
    this.setTableData("monthlyPlanTableBody", data.monthlyPlan || [], this.addMonthlyPlanRow);
  }

  setExpenseTableData(expenses) {
    const tbody = document.getElementById("dailyExpenseTableBody");
    tbody.innerHTML = "";
    if (!expenses || expenses.length === 0) {
      this.addExpenseRow();
      return;
    }
    expenses.forEach(expense => this.addExpenseRow(expense));
    this.updateExpenseTotal();
  }

  restoreDraft() {
    const draft = this.draftStore.get("dailyReport");
    if (!draft) return;
    const hasContent = draft.reporter || draft.instructions || draft.otherReports
      || draft.dailyWork?.length || draft.dailyExpenses?.length
      || draft.weeklyPlan?.length || draft.monthlyPlan?.length;
    if (!hasContent) return;
    this.setFormData(draft);
    this.currentReportId = draft.currentReportId || null;
    this.setAutosaveStatus("이전 자동저장 내용을 복원했습니다.");
  }

  scheduleAutosave() {
    clearTimeout(this.autosaveTimer);
    this.setAutosaveStatus("입력 내용 저장 중…");
    this.autosaveTimer = setTimeout(() => this.saveDraft(), 700);
  }

  async saveDraft() {
    try {
      await this.draftStore.set("dailyReport", {
        ...this.getFormData(),
        currentReportId: this.currentReportId,
      });
      this.setAutosaveStatus("자동 저장됨");
    } catch (error) {
      console.error("보고서 자동저장 오류:", error);
      this.setAutosaveStatus("자동 저장 실패", true);
    }
  }

  setAutosaveStatus(message, isError = false) {
    const status = document.getElementById("autosaveStatus");
    status.textContent = message;
    status.classList.toggle("error", isError);
  }

  setTableData(tbodyId, data, addRowFn) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = "";
    if (!data || data.length === 0) {
      addRowFn.call(this);
      return;
    }
    data.forEach(item => addRowFn.call(this, item));
  }

  async saveReport() {
    const formData = this.getFormData();
    if (!formData.date || !formData.reporter) {
      this.showNotification(this.messages.saveError, "error");
      return;
    }
    const reportId = this.currentReportId || this.generateId();
    formData.id = reportId;

    const previousReport = this.reports[reportId];
    try {
      const expenses = await this.expenseStore.syncReport(reportId, formData.date, formData.dailyExpenses);
      formData.dailyExpenses = expenses.map(expense => ({
        id: expense.id,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        note: expense.note,
      }));
      formData.expenseIds = expenses.map(expense => expense.id);
      this.reports[reportId] = formData;
      await this.saveReportsToStorage();
      this.currentReportId = reportId;
      await this.draftStore.clear("dailyReport");
      this.setAutosaveStatus("저장 완료");
      this.showNotification(this.messages.saveSuccess, "success");
      this.displayReportList();
    } catch (error) {
      if (previousReport) this.reports[reportId] = previousReport;
      else delete this.reports[reportId];
      console.error("보고서 저장 오류:", error);
      this.showNotification(this.messages.saveFailure, "error");
    }
  }

  loadReport(reportId) {
    const report = this.reports[reportId];
    if (report) {
      const sharedExpenses = this.expenseStore.getByReport(reportId);
      this.setFormData({
        ...report,
        dailyExpenses: Array.isArray(report.expenseIds) ? sharedExpenses : (report.dailyExpenses || []),
      });
      this.currentReportId = reportId;
      focusAfterRender(document.getElementById("reporter"));
      this.showNotification(this.messages.loadSuccess, "success");
    }
  }

  deleteReport(reportId) {
    this.showConfirm(this.messages.deleteConfirm, async () => {
      const deletedReport = this.reports[reportId];
      delete this.reports[reportId];
      try {
        await this.saveReportsToStorage();
        await this.expenseStore.syncReport(reportId, deletedReport?.date, []);
        this.displayReportList();
        if (this.currentReportId === reportId) this._clearFormContents();
        this.showNotification(this.messages.deleteSuccess, "success");
      } catch (error) {
        this.reports[reportId] = deletedReport;
        console.error("보고서 삭제 오류:", error);
        this.showNotification(this.messages.saveFailure, "error");
      }
    });
  }

  clearForm() {
    this.showConfirm(this.messages.clearConfirm, () => {
      this._clearFormContents();
      this.showNotification(this.messages.clearSuccess, "success");
    });
  }

  _clearFormContents() {
    clearTimeout(this.autosaveTimer);
    this.autosaveTimer = null;
    this.setInitialDate();
    document.getElementById("reporter").value = "";
    document.getElementById("instructions").value = "";
    document.getElementById("otherReports").value = "";

    document.getElementById("dailyWorkTableBody").innerHTML = '';
    document.getElementById("dailyExpenseTableBody").innerHTML = '';
    document.getElementById("weeklyPlanTableBody").innerHTML = '';
    document.getElementById("monthlyPlanTableBody").innerHTML = '';
    this.initializeTables();
    this.currentReportId = null;
    this.draftStore.clear("dailyReport").catch(error => console.error("초안 삭제 오류:", error));
    this.setAutosaveStatus("");
    focusAfterRender(document.getElementById("reporter"));
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  addDailyWorkRow(item = {}) {
    const tbody = document.getElementById("dailyWorkTableBody");
    return appendInputRow(tbody, [
      { value: item.time || "", placeholder: "09:00" },
      { value: item.work || "", placeholder: "업무 내용을 입력하세요" },
      { value: item.note || "", placeholder: "비고사항" },
    ]);
  }
  removeDailyWorkRow() {
    const tbody = document.getElementById("dailyWorkTableBody");
    if (tbody.rows.length > 1) {
      tbody.deleteRow(-1);
      focusFirstEditable(tbody.rows[tbody.rows.length - 1]);
    }
    else this.showNotification(this.messages.minRowError, "error");
  }

  addExpenseRow(expense = {}) {
    const tbody = document.getElementById("dailyExpenseTableBody");
    const fields = [
      { type: "text", className: "table-input", value: expense.category || "", placeholder: "예: 교통비" },
      { type: "text", className: "table-input", value: expense.description || "", placeholder: "사용처 또는 지출 내용을 입력하세요" },
      { type: "number", className: "table-input expense-amount-input", value: expense.amount || "", placeholder: "0", min: "0", step: "1" },
      { type: "text", className: "table-input", value: expense.note || "", placeholder: "비고사항" },
    ];

    const row = appendInputRow(tbody, fields);
    row.dataset.expenseId = expense.id || "";
    this.updateExpenseTotal();
    return row;
  }

  removeExpenseRow() {
    const tbody = document.getElementById("dailyExpenseTableBody");
    if (tbody.rows.length > 1) {
      tbody.deleteRow(-1);
      this.updateExpenseTotal();
      focusFirstEditable(tbody.rows[tbody.rows.length - 1]);
    } else {
      this.showNotification(this.messages.minRowError, "error");
    }
  }

  updateExpenseTotal() {
    const total = Array.from(document.querySelectorAll("#dailyExpenseTableBody .expense-amount-input"))
      .reduce((sum, input) => sum + (Number(input.value) || 0), 0);
    document.getElementById("dailyExpenseTotal").textContent = `${total.toLocaleString("ko-KR")}원`;
  }

  addWeeklyPlanRow(value = "") {
    const tbody = document.getElementById("weeklyPlanTableBody");
    return appendInputRow(tbody, [{ value, placeholder: "주간 업무 계획을 입력하세요" }]);
  }
  removeWeeklyPlanRow() {
    const tbody = document.getElementById("weeklyPlanTableBody");
    if (tbody.rows.length > 1) {
      tbody.deleteRow(-1);
      focusFirstEditable(tbody.rows[tbody.rows.length - 1]);
    }
    else this.showNotification(this.messages.minRowError, "error");
  }
  addMonthlyPlanRow(value = "") {
    const tbody = document.getElementById("monthlyPlanTableBody");
    return appendInputRow(tbody, [{ value, placeholder: "월간 업무 계획을 입력하세요" }]);
  }
  removeMonthlyPlanRow() {
    const tbody = document.getElementById("monthlyPlanTableBody");
    if (tbody.rows.length > 1) {
      tbody.deleteRow(-1);
      focusFirstEditable(tbody.rows[tbody.rows.length - 1]);
    }
    else this.showNotification(this.messages.minRowError, "error");
  }

  displayReportList() {
    const reportList = document.getElementById("reportList");
    reportList.innerHTML = "";
    const sortedReports = Object.values(this.reports).sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sortedReports.length === 0) {
      reportList.innerHTML = `<div class="empty-state">${this.messages.noSavedReports}</div>`;
      return;
    }

    sortedReports.forEach(report => {
      const item = document.createElement("div");
      item.className = "report-item";

      const heading = document.createElement("h4");
      heading.textContent = `${report.date || "날짜 없음"} `;
      const reporter = document.createElement("span");
      reporter.textContent = `(${report.reporter || "작성자 없음"})`;
      heading.appendChild(reporter);

      const workSummary = document.createElement("p");
      const workLabel = document.createElement("strong");
      workLabel.textContent = "일일 업무: ";
      workSummary.append(workLabel, `${report.dailyWork ? report.dailyWork.filter(t => t.work).length : 0}건`);

      const sharedExpenses = this.expenseStore.getByReport(report.id);
      const expenses = Array.isArray(report.expenseIds) ? sharedExpenses : (report.dailyExpenses || []);
      const expenseTotal = expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
      const expenseSummary = document.createElement("p");
      const expenseLabel = document.createElement("strong");
      expenseLabel.textContent = "금일 지출: ";
      expenseSummary.append(expenseLabel, `${expenseTotal.toLocaleString("ko-KR")}원`);

      const actions = document.createElement("div");
      actions.className = "report-actions";
      const loadButton = document.createElement("button");
      loadButton.className = "btn btn-primary btn-small btn-load";
      loadButton.textContent = "불러오기";
      const deleteButton = document.createElement("button");
      deleteButton.className = "btn btn-warning btn-small btn-delete";
      deleteButton.textContent = "삭제";
      actions.append(loadButton, deleteButton);

      item.append(heading, workSummary, expenseSummary, actions);
      loadButton.addEventListener("click", () => this.loadReport(report.id));
      deleteButton.addEventListener("click", () => this.deleteReport(report.id));
      reportList.appendChild(item);
    });
  }

  showNotification(message, type = "success") {
    const existing = document.querySelector(".notification");
    if (existing) existing.remove();
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  showConfirm(message, onConfirm) {
    confirmInApp(message)
      .then(confirmed => confirmed && onConfirm())
      .catch(error => console.error("확인 작업 오류:", error));
  }

  previewExport(format) {
    const formData = this.getFormData();
    if (!formData.date || !formData.reporter) {
      this.showNotification(this.messages.exportError, "error");
      return;
    }
    const isExcel = format === "excel";
    showExportPreview({
      title: isExcel ? "Excel 내보내기 미리보기" : "PDF 내보내기 미리보기",
      description: isExcel
        ? "화면의 기본정보, 일일업무, 금일지출, 주간·월간 계획이 시트별로 저장됩니다."
        : "아래 문서 모습으로 PDF가 생성됩니다. 빈 입력란의 안내 문구는 출력되지 않습니다.",
      sourceElement: document.querySelector("#daily-report-tab .document"),
      confirmLabel: isExcel ? "Excel 파일 만들기" : "PDF 파일 만들기",
      onConfirm: () => isExcel ? this.exportToExcel() : this.exportToPDF(),
    });
  }

  exportToExcel() {
    const formData = this.getFormData();
    if (!formData.date || !formData.reporter) {
      this.showNotification(this.messages.exportError, "error");
      return;
    }
    const wb = XLSX.utils.book_new();
    const basicWs = XLSX.utils.aoa_to_sheet([
      ["일일업무보고서"], [""],
      ["보고서 날짜", formData.date], ["작성자", formData.reporter], [""],
      ["지시 및 이행사항", formData.instructions], [""], ["기타 보고사항", formData.otherReports]
    ]);
    basicWs["!cols"] = [{ width: 20 }, { width: 50 }];
    XLSX.utils.book_append_sheet(wb, basicWs, "기본정보");

    const dailyWs = XLSX.utils.aoa_to_sheet([
      ["시간", "업무내용", "비고"],
      ...formData.dailyWork.map(item => [item.time, item.work, item.note])
    ]);
    dailyWs["!cols"] = [{ width: 15 }, { width: 50 }, { width: 25 }];
    XLSX.utils.book_append_sheet(wb, dailyWs, "일일업무");

    const expenseTotal = formData.dailyExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const expenseWs = XLSX.utils.aoa_to_sheet([
      ["항목", "사용처 / 내용", "금액", "비고"],
      ...formData.dailyExpenses.map(item => [item.category, item.description, item.amount, item.note]),
      ["", "합계", expenseTotal, ""]
    ]);
    expenseWs["!cols"] = [{ width: 18 }, { width: 45 }, { width: 18 }, { width: 25 }];
    XLSX.utils.book_append_sheet(wb, expenseWs, "금일지출");

    const weeklyWs = XLSX.utils.aoa_to_sheet([
      ["주간 주요 업무 계획"],
      ...formData.weeklyPlan.map(plan => [plan])
    ]);
    weeklyWs["!cols"] = [{ width: 80 }];
    XLSX.utils.book_append_sheet(wb, weeklyWs, "주간계획");

    const monthlyWs = XLSX.utils.aoa_to_sheet([
      ["월간 주요 업무 계획"],
      ...formData.monthlyPlan.map(plan => [plan])
    ]);
    monthlyWs["!cols"] = [{ width: 80 }];
    XLSX.utils.book_append_sheet(wb, monthlyWs, "월간계획");

    XLSX.writeFile(wb, `일일업무보고서_${sanitizeFilenamePart(formData.date)}_${sanitizeFilenamePart(formData.reporter)}.xlsx`);
    this.showNotification(this.messages.exportExcelSuccess, "success");
  }

  async exportToPDF() {
    const formData = this.getFormData();
    if (!formData.date || !formData.reporter) {
      this.showNotification(this.messages.exportError, "error");
      return;
    }
    this.showNotification(this.messages.exportPdfProgress, "success");

    const reportElement = document.querySelector("#daily-report-tab .document");
    const container = document.body;
    const tempElements = [];
    const restorePlaceholders = hideInputPlaceholdersForExport(reportElement);

    container.classList.add("pdf-export-mode");

    const textareas = reportElement.querySelectorAll('textarea');
    textareas.forEach(textarea => {
      const div = document.createElement('div');
      div.className = 'temp-pdf-div';
      div.innerText = textarea.value || '';
      textarea.style.display = 'none';
      textarea.parentNode.insertBefore(div, textarea);
      tempElements.push({ original: textarea, temp: div });
    });

    const inputsToReplace = reportElement.querySelectorAll('.date-input, .text-input');
    inputsToReplace.forEach(input => {
      const div = document.createElement('div');
      div.className = 'temp-pdf-input-div';
      div.innerText = input.value || '';
      input.style.display = 'none';
      input.parentNode.insertBefore(div, input);
      tempElements.push({ original: input, temp: div });
    });

    try {
      const canvas = await html2canvas(reportElement, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const margin = 10;
      const pdfWidth = pdf.internal.pageSize.getWidth() - margin * 2;
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", margin, margin, pdfWidth, imgHeight);
      heightLeft -= (pdfHeight - margin);

      while (heightLeft > 0) {
        position -= (pdfHeight - margin * 2);
        pdf.addPage();
        pdf.addImage(imgData, "PNG", margin, position, pdfWidth, imgHeight);
        heightLeft -= (pdfHeight - margin);
      }

      pdf.save(`일일업무보고서_${sanitizeFilenamePart(formData.date)}_${sanitizeFilenamePart(formData.reporter)}.pdf`);
      this.showNotification(this.messages.exportPdfSuccess, "success");
    } catch (err) {
      console.error("PDF 생성 오류:", err);
      this.showNotification("PDF 생성 중 오류가 발생했습니다.", "error");
    } finally {
      container.classList.remove("pdf-export-mode");
      restorePlaceholders();
      tempElements.forEach(({ original, temp }) => {
        original.style.display = '';
        if (temp.parentNode) temp.parentNode.removeChild(temp);
      });
    }
  }
}

// =================================
// 영수증 앱
// =================================
class ReceiptApp {
  constructor(expenseStore, draftStore) {
    this.messages = {
      saveSuccess: "영수증이 저장되었습니다.",
      saveFailure: "영수증을 저장하지 못했습니다. 다시 시도해주세요.",
      saveError: "날짜는 필수 항목입니다.",
      loadSuccess: "영수증을 불러왔습니다.",
      deleteConfirm: "정말로 이 영수증을 삭제하시겠습니까?",
      deleteSuccess: "영수증이 삭제되었습니다.",
      clearConfirm: "모든 입력 내용을 초기화하시겠습니까?",
      clearSuccess: "폼이 초기화되었습니다.",
      exportError: "내보낼 데이터가 없습니다. 날짜를 입력해주세요.",
      exportExcelSuccess: "Excel 파일로 내보내기가 완료되었습니다.",
      exportPdfProgress: "PDF 파일을 생성하고 있습니다.",
      exportPdfSuccess: "PDF 파일로 내보내기가 완료되었습니다.",
      noSavedReceipts: "저장된 영수증이 없습니다.",
      minRowError: "최소 1개의 행은 유지해야 합니다.",
    };

    this.receipts = {};
    this.currentReceiptId = null;
    this.expenseStore = expenseStore;
    this.draftStore = draftStore;
    this.loadedExpenseIds = new Set();
    this.autosaveTimer = null;

    this.initializeApp();
  }

  async initializeApp() {
    await Promise.all([this.expenseStore.ready, this.draftStore.ready]);
    this.receipts = await this.loadReceiptsFromStorage();
    await this.expenseStore.migrateReceipts(this.receipts);
    this.setInitialDate();
    this.attachEventListeners();
    if (!this.restoreDraft()) this.loadMonthExpenses();
    this.displayReceiptList();
  }

  setInitialDate() {
    document.getElementById("receiptDate").value = getLocalDateString();
  }

  initializeTable() {
    if (document.getElementById("bill_log_tableBody").rows.length === 0) this.addBillLogRow();
  }

  attachEventListeners() {
    document.getElementById("saveReceiptBtn").addEventListener("click", () => this.saveReceipt());
    document.getElementById("clearReceiptBtn").addEventListener("click", () => this.clearForm());
    document.getElementById("exportReceiptExcelBtn").addEventListener("click", () => this.previewExport("excel"));
    document.getElementById("exportReceiptPdfBtn").addEventListener("click", () => this.previewExport("pdf"));
    document.getElementById("addBillLogRow").addEventListener("click", () => {
      const row = this.addBillLogRow({ date: document.getElementById("receiptDate").value });
      focusAfterRender(row.querySelectorAll("input")[1]);
      this.scheduleAutosave();
    });
    document.getElementById("removeBillLogRow").addEventListener("click", () => this.removeBillLogRow());

    // 금액 입력 시 합계 자동 계산
    document.getElementById("bill_log_tableBody").addEventListener("input", () => {
      this.updateTotalAmount();
      this.scheduleAutosave();
    });
    document.getElementById("receiptDate").addEventListener("change", () => {
      this.loadMonthExpenses();
      this.scheduleAutosave();
    });
  }

  async loadReceiptsFromStorage() {
    const result = await window.electronAPI.loadReceipts();
    if (result?.warning) this.showNotification(result.warning, "error");
    return result?.data || {};
  }

  saveReceiptsToStorage() {
    return window.electronAPI.saveReceipts(this.receipts);
  }

  getFormData() {
    const rows = Array.from(document.querySelectorAll("#bill_log_tableBody tr"));
    const items = rows.map(row => {
      const inputs = row.querySelectorAll("input");
      return {
        id: row.dataset.expenseId || "",
        sourceReportId: row.dataset.sourceReportId || "",
        date: inputs[0].value,
        category: inputs[1].value,
        description: inputs[2].value,
        amount: inputs[3].value,
        note: inputs[4].value,
        receiptImage: row.dataset.receiptImage || "",
        includeInPdf: row.dataset.includeInPdf !== "false",
      };
    }).filter(item => item.date || item.category || item.description || item.amount || item.note);

    return {
      date: document.getElementById("receiptDate").value,
      totalAmount: document.getElementById("receiptAmount").value,
      items,
    };
  }

  setFormData(data) {
    document.getElementById("receiptDate").value = data.date || "";
    document.getElementById("receiptAmount").value = data.totalAmount || "";

    const tbody = document.getElementById("bill_log_tableBody");
    tbody.innerHTML = "";
    const items = (data.items || []).map(normalizeReceiptItem);
    this.loadedExpenseIds = new Set(items.map(item => item.id).filter(Boolean));
    if (items.length === 0) {
      this.addBillLogRow();
    } else {
      items.forEach(item => this.addBillLogRow(item));
    }
    this.updateMonthlyStats(items);
  }

  loadMonthExpenses() {
    const selectedDate = document.getElementById("receiptDate").value || getLocalDateString();
    const records = this.expenseStore.getByMonth(selectedDate);
    this.setFormData({
      date: selectedDate,
      totalAmount: records.reduce((sum, record) => sum + (Number(record.amount) || 0), 0),
      items: records.map(record => ({
        id: record.id,
        sourceReportId: record.sourceReportId || "",
        date: record.date,
        category: record.category,
        description: record.description,
        amount: record.amount,
        note: record.note,
        receiptImage: record.receiptImage,
      })),
    });
  }

  restoreDraft() {
    const draft = this.draftStore.get("receipt");
    if (!draft) return false;
    const hasContent = draft.items?.length || draft.totalAmount;
    if (!hasContent) return false;
    this.setFormData(draft);
    this.currentReceiptId = draft.currentReceiptId || null;
    this.setAutosaveStatus("영수증 자동저장 내용을 복원했습니다.");
    return true;
  }

  scheduleAutosave() {
    clearTimeout(this.autosaveTimer);
    this.setAutosaveStatus("입력 내용 저장 중…");
    this.autosaveTimer = setTimeout(() => this.saveDraft(), 700);
  }

  async saveDraft() {
    try {
      await this.draftStore.set("receipt", {
        ...this.getFormData(),
        currentReceiptId: this.currentReceiptId,
      });
      this.setAutosaveStatus("자동 저장됨");
    } catch (error) {
      console.error("영수증 자동저장 오류:", error);
      this.setAutosaveStatus("자동 저장 실패", true);
    }
  }

  setAutosaveStatus(message, isError = false) {
    const status = document.getElementById("autosaveStatus");
    status.textContent = message;
    status.classList.toggle("error", isError);
  }

  addBillLogRow(item = {}) {
    item = normalizeReceiptItem(item);
    const tbody = document.getElementById("bill_log_tableBody");
    const row = appendInputRow(tbody, [
      { type: "date", value: item.date || "" },
      { value: item.category || "", placeholder: "예: 교통비" },
      { value: item.description || "", placeholder: "사용처 또는 지출 내용을 입력하세요" },
      { type: "number", value: item.amount || "", placeholder: "0", min: "0", step: "1" },
      { value: item.note || "", placeholder: "비고" },
    ]);
    row.dataset.expenseId = item.id || "";
    row.dataset.sourceReportId = item.sourceReportId || "";
    row.dataset.receiptImage = item.receiptImage || "";
    row.dataset.includeInPdf = item.includeInPdf ? "true" : "false";

    const includeCell = row.insertCell();
    includeCell.className = "pdf-include-cell pdf-include-col";
    const includeCheckbox = document.createElement("input");
    includeCheckbox.type = "checkbox";
    includeCheckbox.className = "pdf-include-checkbox";
    includeCheckbox.checked = item.includeInPdf;
    includeCheckbox.setAttribute("aria-label", "PDF에 이 항목 포함");
    includeCheckbox.addEventListener("change", () => {
      row.dataset.includeInPdf = includeCheckbox.checked ? "true" : "false";
      this.scheduleAutosave();
    });
    includeCell.appendChild(includeCheckbox);

    const imageCell = row.insertCell();
    imageCell.className = "receipt-image-cell";
    this.renderReceiptImageCell(imageCell, row);
    return row;
  }

  renderReceiptImageCell(cell, row) {
    cell.replaceChildren();
    const imageData = row.dataset.receiptImage;
    if (imageData) {
      const preview = document.createElement("img");
      preview.className = "receipt-thumbnail";
      preview.src = imageData;
      preview.alt = "영수증 증빙 미리보기";
      preview.addEventListener("click", () => this.openReceiptImage(imageData));
      cell.appendChild(preview);
    }

    const attachLabel = document.createElement("label");
    attachLabel.className = "receipt-attach-btn";
    attachLabel.textContent = imageData ? "교체" : "첨부";
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.hidden = true;
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        row.dataset.receiptImage = await this.compressReceiptImage(file);
        this.renderReceiptImageCell(cell, row);
        this.scheduleAutosave();
      } catch (error) {
        console.error("영수증 이미지 처리 오류:", error);
        this.showNotification("이미지를 첨부하지 못했습니다.", "error");
      }
    });
    attachLabel.appendChild(fileInput);
    cell.appendChild(attachLabel);

    if (imageData) {
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "receipt-remove-image-btn";
      removeButton.textContent = "삭제";
      removeButton.addEventListener("click", () => {
        row.dataset.receiptImage = "";
        this.renderReceiptImageCell(cell, row);
        this.scheduleAutosave();
      });
      cell.appendChild(removeButton);
    }
  }

  compressReceiptImage(file) {
    if (!file.type.startsWith("image/")) return Promise.reject(new Error("이미지 파일이 아닙니다."));
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("이미지를 읽을 수 없습니다."));
        image.onload = () => {
          const maxSize = 1280;
          const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.78));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  openReceiptImage(imageData) {
    const overlay = document.createElement("div");
    overlay.className = "receipt-preview-overlay";
    const image = document.createElement("img");
    image.src = imageData;
    image.alt = "영수증 증빙 이미지";
    overlay.appendChild(image);
    overlay.addEventListener("click", () => overlay.remove());
    document.body.appendChild(overlay);
  }

  removeBillLogRow() {
    const tbody = document.getElementById("bill_log_tableBody");
    if (tbody.rows.length > 1) {
      tbody.deleteRow(-1);
      this.updateTotalAmount();
      this.scheduleAutosave();
      focusAfterRender(tbody.rows[tbody.rows.length - 1].querySelectorAll("input")[1]);
    } else {
      this.showNotification(this.messages.minRowError, "error");
    }
  }

  updateTotalAmount() {
    const rows = Array.from(document.querySelectorAll("#bill_log_tableBody tr"));
    const total = rows.reduce((sum, row) => {
      const amountInput = row.querySelectorAll("input")[3];
      return sum + (parseFloat(amountInput?.value) || 0);
    }, 0);
    document.getElementById("receiptAmount").value = total || "";

    const items = rows.map(row => {
      const inputs = row.querySelectorAll("input");
      return {
        date: inputs[0].value,
        category: inputs[1].value,
        description: inputs[2].value,
        amount: inputs[3].value,
        note: inputs[4].value,
      };
    });
    this.updateMonthlyStats(items);
  }

  updateMonthlyStats(items) {
    const statsContainer = document.getElementById("monthlyStats");
    this.renderMonthlyStats(statsContainer, items);
  }

  renderMonthlyStats(statsContainer, items) {
    if (!statsContainer) return;
    const validItems = (items || []).filter(i => i.category || i.description);
    statsContainer.innerHTML = "";

    if (validItems.length === 0) {
      const emptyState = document.createElement("div");
      emptyState.className = "empty-state";
      emptyState.textContent = "항목을 입력하면 통계가 표시됩니다.";
      statsContainer.appendChild(emptyState);
      return;
    }

    const total = validItems.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);

    // 항목별 합계
    const byItem = {};
    validItems.forEach(i => {
      const category = i.category || "기타";
      if (!byItem[category]) byItem[category] = 0;
      byItem[category] += parseFloat(i.amount) || 0;
    });

    const summary = document.createElement("div");
    summary.className = "stat-summary";
    [["총 건수", `${validItems.length}건`], ["총 금액", `${total.toLocaleString("ko-KR")}원`]]
      .forEach(([label, value]) => {
        const card = document.createElement("div");
        card.className = "stat-card";
        const cardLabel = document.createElement("div");
        cardLabel.className = "stat-card-label";
        cardLabel.textContent = label;
        const cardValue = document.createElement("div");
        cardValue.className = "stat-card-value";
        cardValue.textContent = value;
        card.append(cardLabel, cardValue);
        summary.appendChild(card);
      });

    const breakdown = document.createElement("div");
    breakdown.className = "stat-breakdown";
    const breakdownTitle = document.createElement("h4");
    breakdownTitle.textContent = "항목별 합계";
    breakdown.appendChild(breakdownTitle);
    Object.entries(byItem)
      .sort((a, b) => b[1] - a[1])
      .forEach(([name, amount]) => {
        const statItem = document.createElement("div");
        statItem.className = "stat-item";
        const statLabel = document.createElement("span");
        statLabel.className = "stat-label";
        statLabel.textContent = name;
        const statValue = document.createElement("span");
        statValue.className = "stat-value";
        statValue.textContent = `${amount.toLocaleString("ko-KR")}원`;
        statItem.append(statLabel, statValue);
        breakdown.appendChild(statItem);
      });
    statsContainer.append(summary, breakdown);
  }

  async saveReceipt() {
    const formData = this.getFormData();
    if (!formData.date) {
      this.showNotification(this.messages.saveError, "error");
      return;
    }
    const receiptId = this.currentReceiptId || this.generateId();
    formData.id = receiptId;

    const previousReceipt = this.receipts[receiptId];
    try {
      const records = await this.expenseStore.replaceRecords(this.loadedExpenseIds, formData.items);
      this.loadedExpenseIds = new Set(records.map(record => record.id));
      const submittedItems = formData.items;
      formData.items = records.map((record, index) => ({
        id: record.id,
        sourceReportId: record.sourceReportId || "",
        date: record.date,
        category: record.category,
        description: record.description,
        amount: record.amount,
        note: record.note,
        includeInPdf: submittedItems[index]?.includeInPdf !== false,
      }));
      formData.totalAmount = records.reduce((sum, record) => sum + (Number(record.amount) || 0), 0);
      this.receipts[receiptId] = formData;
      await this.saveReceiptsToStorage();
      this.currentReceiptId = receiptId;
      await this.draftStore.clear("receipt");
      this.setAutosaveStatus("저장 완료");
      this.showNotification(this.messages.saveSuccess, "success");
      this.displayReceiptList();
    } catch (error) {
      if (previousReceipt) this.receipts[receiptId] = previousReceipt;
      else delete this.receipts[receiptId];
      console.error("영수증 저장 오류:", error);
      this.showNotification(this.messages.saveFailure, "error");
    }
  }

  loadReceipt(receiptId) {
    const receipt = this.receipts[receiptId];
    if (receipt) {
      const items = (receipt.items || []).map(item => {
        const record = item.id ? this.expenseStore.records[item.id] : null;
        return record ? {
          id: record.id,
          sourceReportId: record.sourceReportId || "",
          date: record.date,
          category: record.category,
          description: record.description,
          amount: record.amount,
          note: record.note,
          receiptImage: record.receiptImage,
          includeInPdf: item.includeInPdf !== false,
        } : item;
      });
      this.setFormData({ ...receipt, items });
      this.currentReceiptId = receiptId;
      focusAfterRender(document.querySelector("#bill_log_tableBody tr")?.querySelectorAll("input")[1]);
      this.showNotification(this.messages.loadSuccess, "success");
    }
  }

  deleteReceipt(receiptId) {
    this.showConfirm(this.messages.deleteConfirm, async () => {
      const deletedReceipt = this.receipts[receiptId];
      delete this.receipts[receiptId];
      try {
        await this.saveReceiptsToStorage();
        this.displayReceiptList();
        if (this.currentReceiptId === receiptId) this._clearFormContents();
        this.showNotification(this.messages.deleteSuccess, "success");
      } catch (error) {
        this.receipts[receiptId] = deletedReceipt;
        console.error("영수증 삭제 오류:", error);
        this.showNotification(this.messages.saveFailure, "error");
      }
    });
  }

  clearForm() {
    this.showConfirm(this.messages.clearConfirm, () => {
      this._clearFormContents();
      this.showNotification(this.messages.clearSuccess, "success");
    });
  }

  _clearFormContents() {
    clearTimeout(this.autosaveTimer);
    this.autosaveTimer = null;
    this.setInitialDate();
    document.getElementById("receiptAmount").value = "";
    document.getElementById("bill_log_tableBody").innerHTML = "";
    this.initializeTable();
    document.getElementById("monthlyStats").innerHTML = "";
    this.currentReceiptId = null;
    this.loadedExpenseIds = new Set();
    this.draftStore.clear("receipt").catch(error => console.error("초안 삭제 오류:", error));
    this.setAutosaveStatus("");
    const firstRow = document.querySelector("#bill_log_tableBody tr");
    focusAfterRender(firstRow?.querySelectorAll("input")[1] || document.getElementById("receiptDate"));
  }

  displayReceiptList() {
    const receiptList = document.getElementById("receiptList");
    receiptList.innerHTML = "";
    const sorted = Object.values(this.receipts).sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sorted.length === 0) {
      receiptList.innerHTML = `<div class="empty-state">${this.messages.noSavedReceipts}</div>`;
      return;
    }

    sorted.forEach(receipt => {
      const item = document.createElement("div");
      item.className = "report-item";
      const total = parseFloat(receipt.totalAmount) || 0;
      const count = receipt.items ? receipt.items.filter(i => i.category || i.description || i.item).length : 0;

      const heading = document.createElement("h4");
      heading.textContent = receipt.date || "날짜 없음";
      const totalSummary = document.createElement("p");
      const totalLabel = document.createElement("strong");
      totalLabel.textContent = "총 금액: ";
      totalSummary.append(totalLabel, `${total.toLocaleString("ko-KR")}원`);
      const countSummary = document.createElement("p");
      const countLabel = document.createElement("strong");
      countLabel.textContent = "항목 수: ";
      countSummary.append(countLabel, `${count}건`);

      const actions = document.createElement("div");
      actions.className = "report-actions";
      const loadButton = document.createElement("button");
      loadButton.className = "btn btn-primary btn-small btn-load";
      loadButton.textContent = "불러오기";
      const deleteButton = document.createElement("button");
      deleteButton.className = "btn btn-warning btn-small btn-delete";
      deleteButton.textContent = "삭제";
      actions.append(loadButton, deleteButton);

      item.append(heading, totalSummary, countSummary, actions);
      loadButton.addEventListener("click", () => this.loadReceipt(receipt.id));
      deleteButton.addEventListener("click", () => this.deleteReceipt(receipt.id));
      receiptList.appendChild(item);
    });
  }

  preparePdfDocument(root) {
    const rows = Array.from(root.querySelectorAll("#bill_log_tableBody tr"));
    const hiddenRows = [];
    const selectedItems = [];

    rows.forEach(row => {
      const inputs = row.querySelectorAll("input");
      if (row.dataset.includeInPdf === "false") {
        hiddenRows.push({ row, display: row.style.display });
        row.style.display = "none";
        return;
      }
      selectedItems.push({
        category: inputs[1]?.value || "",
        description: inputs[2]?.value || "",
        amount: inputs[3]?.value || "",
      });
    });

    const hiddenColumns = Array.from(root.querySelectorAll(".pdf-include-col"))
      .map(element => ({ element, display: element.style.display }));
    hiddenColumns.forEach(({ element }) => { element.style.display = "none"; });

    const totalInput = root.querySelector("#receiptAmount");
    const previousTotal = totalInput?.value;
    const previousExportValue = totalInput?.dataset.exportValue;
    const selectedTotal = selectedItems.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0
    );
    if (totalInput) {
      totalInput.value = String(selectedTotal);
      totalInput.dataset.exportValue = String(selectedTotal);
    }

    const statsContainer = root.querySelector("#monthlyStats");
    const previousStats = statsContainer?.innerHTML;
    this.renderMonthlyStats(statsContainer, selectedItems);

    return () => {
      hiddenRows.forEach(({ row, display }) => { row.style.display = display; });
      hiddenColumns.forEach(({ element, display }) => { element.style.display = display; });
      if (totalInput) {
        totalInput.value = previousTotal;
        if (previousExportValue === undefined) delete totalInput.dataset.exportValue;
        else totalInput.dataset.exportValue = previousExportValue;
      }
      if (statsContainer) statsContainer.innerHTML = previousStats;
    };
  }

  previewExport(format) {
    const formData = this.getFormData();
    if (!formData.date) {
      this.showNotification(this.messages.exportError, "error");
      return;
    }
    const isExcel = format === "excel";
    if (!isExcel && !formData.items.some(item => item.includeInPdf)) {
      this.showNotification("PDF에 포함할 항목을 하나 이상 선택해주세요.", "error");
      return;
    }
    showExportPreview({
      title: isExcel ? "Excel 내보내기 미리보기" : "PDF 내보내기 미리보기",
      description: isExcel
        ? "날짜, 항목, 사용처 / 내용, 금액, 비고가 영수증 시트로 저장됩니다."
        : "아래 월간 지출·영수증 문서 모습으로 PDF가 생성됩니다.",
      sourceElement: document.querySelector("#receipt-tab .document"),
      confirmLabel: isExcel ? "Excel 파일 만들기" : "PDF 파일 만들기",
      onConfirm: () => isExcel ? this.exportToExcel() : this.exportToPDF(),
      preparePreview: isExcel ? undefined : preview => this.preparePdfDocument(preview),
    });
  }

  exportToExcel() {
    const formData = this.getFormData();
    if (!formData.date) {
      this.showNotification(this.messages.exportError, "error");
      return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["월간 영수증 정리"],
      [""],
      ["제출 날짜", formData.date],
      ["총 금액", `${parseFloat(formData.totalAmount || 0).toLocaleString()}원`],
      [""],
      ["날짜", "항목", "사용처 / 내용", "금액", "비고"],
      ...formData.items.map(i => [i.date, i.category, i.description, i.amount, i.note])
    ]);
    ws["!cols"] = [{ width: 15 }, { width: 18 }, { width: 32 }, { width: 15 }, { width: 25 }];
    XLSX.utils.book_append_sheet(wb, ws, "영수증");
    XLSX.writeFile(wb, `영수증_${sanitizeFilenamePart(formData.date)}.xlsx`);
    this.showNotification(this.messages.exportExcelSuccess, "success");
  }

  async exportToPDF() {
    const formData = this.getFormData();
    if (!formData.date) {
      this.showNotification(this.messages.exportError, "error");
      return;
    }
    if (!formData.items.some(item => item.includeInPdf)) {
      this.showNotification("PDF에 포함할 항목을 하나 이상 선택해주세요.", "error");
      return;
    }
    this.showNotification(this.messages.exportPdfProgress, "success");

    const reportElement = document.querySelector("#receipt-tab .document");
    const restorePdfDocument = this.preparePdfDocument(reportElement);
    const container = document.body;
    const tempElements = [];
    const restorePlaceholders = hideInputPlaceholdersForExport(reportElement);

    container.classList.add("pdf-export-mode");

    const inputsToReplace = reportElement.querySelectorAll('.date-input, .text-input');
    inputsToReplace.forEach(input => {
      const div = document.createElement('div');
      div.className = 'temp-pdf-input-div';
      div.innerText = input.value || '';
      input.style.display = 'none';
      input.parentNode.insertBefore(div, input);
      tempElements.push({ original: input, temp: div });
    });

    try {
      const canvas = await html2canvas(reportElement, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const margin = 10;
      const pdfWidth = pdf.internal.pageSize.getWidth() - margin * 2;
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", margin, margin, pdfWidth, imgHeight);
      heightLeft -= (pdfHeight - margin);

      while (heightLeft > 0) {
        position -= (pdfHeight - margin * 2);
        pdf.addPage();
        pdf.addImage(imgData, "PNG", margin, position, pdfWidth, imgHeight);
        heightLeft -= (pdfHeight - margin);
      }

      pdf.save(`영수증_${sanitizeFilenamePart(formData.date)}.pdf`);
      this.showNotification(this.messages.exportPdfSuccess, "success");
    } catch (err) {
      console.error("PDF 생성 오류:", err);
      this.showNotification("PDF 생성 중 오류가 발생했습니다.", "error");
    } finally {
      container.classList.remove("pdf-export-mode");
      restorePlaceholders();
      tempElements.forEach(({ original, temp }) => {
        original.style.display = '';
        if (temp.parentNode) temp.parentNode.removeChild(temp);
      });
      restorePdfDocument();
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  showNotification(message, type = "success") {
    const existing = document.querySelector(".notification");
    if (existing) existing.remove();
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  showConfirm(message, onConfirm) {
    confirmInApp(message)
      .then(confirmed => confirmed && onConfirm())
      .catch(error => console.error("확인 작업 오류:", error));
  }
}

// =================================
// 앱 초기화
// =================================
function initDataManagement(dailyApp, receiptApp, expenseStore, draftStore) {
  document.getElementById("backupBtn").addEventListener("click", async () => {
    try {
      const result = await window.electronAPI.exportBackup({
        format: "daily-report-backup",
        version: 2,
        exportedAt: new Date().toISOString(),
        data: {
          reports: dailyApp.reports,
          receipts: receiptApp.receipts,
          expenses: expenseStore.records,
        },
      });
      if (!result.canceled) dailyApp.showNotification("전체 데이터 백업이 완료되었습니다.", "success");
    } catch (error) {
      console.error("백업 오류:", error);
      dailyApp.showNotification("데이터를 백업하지 못했습니다.", "error");
    }
  });

  document.getElementById("restoreBtn").addEventListener("click", async () => {
    try {
      const result = await window.electronAPI.importBackup();
      if (result.canceled) return;
      if (!await confirmInApp("현재 데이터를 백업 파일의 내용으로 교체하시겠습니까?")) return;
      const data = result.backup.data;
      await Promise.all([
        window.electronAPI.saveData(data.reports || {}),
        window.electronAPI.saveReceipts(data.receipts || {}),
        window.electronAPI.saveExpenses(data.expenses || {}),
        window.electronAPI.saveDrafts({}),
      ]);
      draftStore.data = {};
      window.location.reload();
    } catch (error) {
      console.error("복원 오류:", error);
      dailyApp.showNotification("백업 파일을 복원하지 못했습니다.", "error");
    }
  });
}

const expenseStore = new ExpenseStore();
const draftStore = new DraftStore();
const app = new DailyReportApp(expenseStore, draftStore);
const receiptApp = new ReceiptApp(expenseStore, draftStore);
initTabNavigation();
initDataManagement(app, receiptApp, expenseStore, draftStore);
window.electronAPI.getAppVersion().then(version => {
  document.getElementById("appVersion").textContent = `v${version}`;
});

if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(error => {
      console.warn("Service Worker 등록 실패:", error);
    });
  });
}

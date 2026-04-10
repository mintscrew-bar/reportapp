// jsPDF 전역 객체 할당
const { jsPDF } = window.jspdf;

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
    });
  });
}

// =================================
// 일일업무보고서 앱
// =================================
class DailyReportApp {
  constructor() {
    this.messages = {
      saveSuccess: "보고서가 성공적으로 저장되었습니다.",
      saveError: "날짜와 작성자는 필수 항목입니다.",
      loadSuccess: "보고서를 불러왔습니다.",
      deleteConfirm: "정말로 이 보고서를 삭제하시겠습니까?",
      deleteSuccess: "보고서가 삭제되었습니다.",
      clearConfirm: "모든 입력 내용을 초기화하시겠습니까?",
      clearSuccess: "폼이 초기화되었습니다.",
      exportError: "내보낼 데이터가 없습니다. 필수 항목을 입력해주세요.",
      exportExcelSuccess: "Excel 파일로 내보내기가 완료되었습니다.",
      exportPdfSuccess: "PDF 파일 생성이 시작되었습니다.",
      noSavedReports: "저장된 보고서가 없습니다.",
      minRowError: "최소 1개의 행은 유지해야 합니다.",
    };

    this.reports = {};
    this.currentReportId = null;

    this.initializeApp();
  }

  async initializeApp() {
    this.reports = await this.loadReportsFromStorage();
    this.setInitialDate();
    this.attachEventListeners();
    this.initializeTables();
    this.displayReportList();
  }

  setInitialDate() {
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("reportDate").value = today;
  }

  initializeTables() {
    if (document.getElementById("dailyWorkTableBody").rows.length === 0) this.addDailyWorkRow();
    if (document.getElementById("weeklyPlanTableBody").rows.length === 0) this.addWeeklyPlanRow();
    if (document.getElementById("monthlyPlanTableBody").rows.length === 0) this.addMonthlyPlanRow();
  }

  attachEventListeners() {
    document.getElementById("saveBtn").addEventListener("click", () => this.saveReport());
    document.getElementById("clearBtn").addEventListener("click", () => this.clearForm());
    document.getElementById("exportExcelBtn").addEventListener("click", () => this.exportToExcel());
    document.getElementById("exportPdfBtn").addEventListener("click", () => this.exportToPDF());

    document.getElementById("addDailyRow").addEventListener("click", () => this.addDailyWorkRow());
    document.getElementById("removeDailyRow").addEventListener("click", () => this.removeDailyWorkRow());
    document.getElementById("addWeeklyRow").addEventListener("click", () => this.addWeeklyPlanRow());
    document.getElementById("removeWeeklyRow").addEventListener("click", () => this.removeWeeklyPlanRow());
    document.getElementById("addMonthlyRow").addEventListener("click", () => this.addMonthlyPlanRow());
    document.getElementById("removeMonthlyRow").addEventListener("click", () => this.removeMonthlyPlanRow());
  }

  async loadReportsFromStorage() {
    const data = await window.electronAPI.loadData();
    return data ? JSON.parse(data) : {};
  }

  saveReportsToStorage() {
    window.electronAPI.saveData(this.reports);
  }

  getFormData() {
    const dailyWorkData = Array.from(document.querySelectorAll("#dailyWorkTableBody tr")).map(row => {
      const inputs = row.querySelectorAll("input");
      return { time: inputs[0].value, work: inputs[1].value, note: inputs[2].value };
    });
    const weeklyPlanData = Array.from(document.querySelectorAll("#weeklyPlanTableBody input")).map(input => input.value);
    const monthlyPlanData = Array.from(document.querySelectorAll("#monthlyPlanTableBody input")).map(input => input.value);

    return {
      date: document.getElementById("reportDate").value,
      reporter: document.getElementById("reporter").value,
      instructions: document.getElementById("instructions").value,
      otherReports: document.getElementById("otherReports").value,
      dailyWork: dailyWorkData,
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
    this.setTableData("weeklyPlanTableBody", data.weeklyPlan || [], this.addWeeklyPlanRow);
    this.setTableData("monthlyPlanTableBody", data.monthlyPlan || [], this.addMonthlyPlanRow);
  }

  setTableData(tbodyId, data, addRowFn) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = "";
    if (!data || data.length === 0) {
      addRowFn.call(this);
      return;
    }
    data.forEach(item => {
      const row = tbody.insertRow();
      if (typeof item === 'object') {
        row.innerHTML = `
          <td><input type="text" class="table-input" value="${item.time || ""}" placeholder="09:00" /></td>
          <td><input type="text" class="table-input" value="${item.work || ""}" placeholder="업무 내용을 입력하세요" /></td>
          <td><input type="text" class="table-input" value="${item.note || ""}" placeholder="비고사항" /></td>
        `;
      } else {
        row.innerHTML = `<td><input type="text" class="table-input" value="${item || ""}" placeholder="업무 계획을 입력하세요" /></td>`;
      }
    });
  }

  saveReport() {
    const formData = this.getFormData();
    if (!formData.date || !formData.reporter) {
      this.showNotification(this.messages.saveError, "error");
      return;
    }
    const reportId = this.currentReportId || this.generateId();
    formData.id = reportId;

    this.reports[reportId] = formData;
    this.saveReportsToStorage();
    this.currentReportId = reportId;

    this.showNotification(this.messages.saveSuccess, "success");
    this.displayReportList();
  }

  loadReport(reportId) {
    const report = this.reports[reportId];
    if (report) {
      this.setFormData(report);
      this.currentReportId = reportId;
      this.showNotification(this.messages.loadSuccess, "success");
    }
  }

  deleteReport(reportId) {
    this.showConfirm(this.messages.deleteConfirm, () => {
      delete this.reports[reportId];
      this.saveReportsToStorage();
      this.displayReportList();
      if (this.currentReportId === reportId) {
        this._clearFormContents();
      }
      this.showNotification(this.messages.deleteSuccess, "success");
    });
  }

  clearForm() {
    this.showConfirm(this.messages.clearConfirm, () => {
      this._clearFormContents();
      this.showNotification(this.messages.clearSuccess, "success");
    });
  }

  _clearFormContents() {
    this.setInitialDate();
    document.getElementById("reporter").value = "";
    document.getElementById("instructions").value = "";
    document.getElementById("otherReports").value = "";

    document.getElementById("dailyWorkTableBody").innerHTML = '';
    document.getElementById("weeklyPlanTableBody").innerHTML = '';
    document.getElementById("monthlyPlanTableBody").innerHTML = '';
    this.initializeTables();
    this.currentReportId = null;
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  addDailyWorkRow() {
    const tbody = document.getElementById("dailyWorkTableBody");
    const row = tbody.insertRow();
    row.innerHTML = `
      <td><input type="text" class="table-input" placeholder="09:00" /></td>
      <td><input type="text" class="table-input" placeholder="업무 내용을 입력하세요" /></td>
      <td><input type="text" class="table-input" placeholder="비고사항" /></td>
    `;
  }
  removeDailyWorkRow() {
    const tbody = document.getElementById("dailyWorkTableBody");
    if (tbody.rows.length > 1) tbody.deleteRow(-1);
    else this.showNotification(this.messages.minRowError, "error");
  }

  addWeeklyPlanRow() {
    const tbody = document.getElementById("weeklyPlanTableBody");
    const row = tbody.insertRow();
    row.innerHTML = `<td><input type="text" class="table-input" placeholder="주간 업무 계획을 입력하세요" /></td>`;
  }
  removeWeeklyPlanRow() {
    const tbody = document.getElementById("weeklyPlanTableBody");
    if (tbody.rows.length > 1) tbody.deleteRow(-1);
    else this.showNotification(this.messages.minRowError, "error");
  }
  addMonthlyPlanRow() {
    const tbody = document.getElementById("monthlyPlanTableBody");
    const row = tbody.insertRow();
    row.innerHTML = `<td><input type="text" class="table-input" placeholder="월간 업무 계획을 입력하세요" /></td>`;
  }
  removeMonthlyPlanRow() {
    const tbody = document.getElementById("monthlyPlanTableBody");
    if (tbody.rows.length > 1) tbody.deleteRow(-1);
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
      item.innerHTML = `
        <h4>${report.date} <span>(${report.reporter})</span></h4>
        <p><strong>일일 업무:</strong> ${report.dailyWork ? report.dailyWork.filter(t => t.work).length : 0}건</p>
        <div class="report-actions">
          <button class="btn btn-primary btn-small btn-load">불러오기</button>
          <button class="btn btn-warning btn-small btn-delete">삭제</button>
        </div>
      `;
      item.querySelector(".btn-load").addEventListener("click", () => this.loadReport(report.id));
      item.querySelector(".btn-delete").addEventListener("click", () => this.deleteReport(report.id));
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
    if (confirm(message)) onConfirm();
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

    XLSX.writeFile(wb, `일일업무보고서_${formData.date}_${formData.reporter}.xlsx`);
    this.showNotification(this.messages.exportExcelSuccess, "success");
  }

  async exportToPDF() {
    const formData = this.getFormData();
    if (!formData.date || !formData.reporter) {
      this.showNotification(this.messages.exportError, "error");
      return;
    }
    this.showNotification(this.messages.exportPdfSuccess, "success");

    const reportElement = document.querySelector("#daily-report-tab .document");
    const container = document.body;
    const tempElements = [];

    container.classList.add("pdf-export-mode");

    const textareas = reportElement.querySelectorAll('textarea');
    textareas.forEach(textarea => {
      const div = document.createElement('div');
      div.className = 'temp-pdf-div';
      div.innerText = textarea.value || textarea.placeholder;
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

      pdf.save(`일일업무보고서_${formData.date}_${formData.reporter}.pdf`);
    } catch (err) {
      console.error("PDF 생성 오류:", err);
      this.showNotification("PDF 생성 중 오류가 발생했습니다.", "error");
    } finally {
      container.classList.remove("pdf-export-mode");
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
  constructor() {
    this.messages = {
      saveSuccess: "영수증이 저장되었습니다.",
      saveError: "날짜는 필수 항목입니다.",
      loadSuccess: "영수증을 불러왔습니다.",
      deleteConfirm: "정말로 이 영수증을 삭제하시겠습니까?",
      deleteSuccess: "영수증이 삭제되었습니다.",
      clearConfirm: "모든 입력 내용을 초기화하시겠습니까?",
      clearSuccess: "폼이 초기화되었습니다.",
      exportError: "내보낼 데이터가 없습니다. 날짜를 입력해주세요.",
      exportExcelSuccess: "Excel 파일로 내보내기가 완료되었습니다.",
      exportPdfSuccess: "PDF 파일 생성이 시작되었습니다.",
      noSavedReceipts: "저장된 영수증이 없습니다.",
      minRowError: "최소 1개의 행은 유지해야 합니다.",
    };

    this.receipts = {};
    this.currentReceiptId = null;

    this.initializeApp();
  }

  async initializeApp() {
    this.receipts = await this.loadReceiptsFromStorage();
    this.setInitialDate();
    this.attachEventListeners();
    this.initializeTable();
    this.displayReceiptList();
  }

  setInitialDate() {
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("receiptDate").value = today;
  }

  initializeTable() {
    if (document.getElementById("bill_log_tableBody").rows.length === 0) this.addBillLogRow();
  }

  attachEventListeners() {
    document.getElementById("saveReceiptBtn").addEventListener("click", () => this.saveReceipt());
    document.getElementById("clearReceiptBtn").addEventListener("click", () => this.clearForm());
    document.getElementById("exportReceiptExcelBtn").addEventListener("click", () => this.exportToExcel());
    document.getElementById("exportReceiptPdfBtn").addEventListener("click", () => this.exportToPDF());
    document.getElementById("addBillLogRow").addEventListener("click", () => this.addBillLogRow());
    document.getElementById("removeBillLogRow").addEventListener("click", () => this.removeBillLogRow());

    // 금액 입력 시 합계 자동 계산
    document.getElementById("bill_log_tableBody").addEventListener("input", () => this.updateTotalAmount());
  }

  async loadReceiptsFromStorage() {
    const data = await window.electronAPI.loadReceipts();
    return data ? JSON.parse(data) : {};
  }

  saveReceiptsToStorage() {
    window.electronAPI.saveReceipts(this.receipts);
  }

  getFormData() {
    const rows = Array.from(document.querySelectorAll("#bill_log_tableBody tr"));
    const items = rows.map(row => {
      const inputs = row.querySelectorAll("input");
      return {
        date: inputs[0].value,
        item: inputs[1].value,
        quantity: inputs[2].value,
        price: inputs[3].value,
        note: inputs[4].value,
      };
    });

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
    const items = data.items || [];
    if (items.length === 0) {
      this.addBillLogRow();
    } else {
      items.forEach(item => {
        const row = tbody.insertRow();
        row.innerHTML = this._createRowHTML(item);
      });
    }
    this.updateMonthlyStats(items);
  }

  _createRowHTML(item = {}) {
    return `
      <td><input type="date" class="table-input" value="${item.date || ''}" /></td>
      <td><input type="text" class="table-input" value="${item.item || ''}" placeholder="품목명" /></td>
      <td><input type="number" class="table-input" value="${item.quantity || ''}" placeholder="0" /></td>
      <td><input type="number" class="table-input" value="${item.price || ''}" placeholder="0" /></td>
      <td><input type="text" class="table-input" value="${item.note || ''}" placeholder="비고" /></td>
    `;
  }

  addBillLogRow() {
    const tbody = document.getElementById("bill_log_tableBody");
    const row = tbody.insertRow();
    row.innerHTML = this._createRowHTML();
  }

  removeBillLogRow() {
    const tbody = document.getElementById("bill_log_tableBody");
    if (tbody.rows.length > 1) {
      tbody.deleteRow(-1);
      this.updateTotalAmount();
    } else {
      this.showNotification(this.messages.minRowError, "error");
    }
  }

  updateTotalAmount() {
    const rows = Array.from(document.querySelectorAll("#bill_log_tableBody tr"));
    const total = rows.reduce((sum, row) => {
      const priceInput = row.querySelectorAll("input")[3];
      return sum + (parseFloat(priceInput?.value) || 0);
    }, 0);
    document.getElementById("receiptAmount").value = total || "";

    const items = rows.map(row => {
      const inputs = row.querySelectorAll("input");
      return {
        date: inputs[0].value,
        item: inputs[1].value,
        quantity: inputs[2].value,
        price: inputs[3].value,
        note: inputs[4].value,
      };
    });
    this.updateMonthlyStats(items);
  }

  updateMonthlyStats(items) {
    const statsContainer = document.getElementById("monthlyStats");
    const validItems = (items || []).filter(i => i.item);

    if (validItems.length === 0) {
      statsContainer.innerHTML = '<div class="empty-state">항목을 입력하면 통계가 표시됩니다.</div>';
      return;
    }

    const total = validItems.reduce((sum, i) => sum + (parseFloat(i.price) || 0), 0);

    // 품목별 합계
    const byItem = {};
    validItems.forEach(i => {
      if (!byItem[i.item]) byItem[i.item] = 0;
      byItem[i.item] += parseFloat(i.price) || 0;
    });

    const itemRows = Object.entries(byItem)
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => `
        <div class="stat-item">
          <span class="stat-label">${name}</span>
          <span class="stat-value">${amount.toLocaleString()}원</span>
        </div>
      `).join('');

    statsContainer.innerHTML = `
      <div class="stat-summary">
        <div class="stat-card">
          <div class="stat-card-label">총 건수</div>
          <div class="stat-card-value">${validItems.length}건</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-label">총 금액</div>
          <div class="stat-card-value">${total.toLocaleString()}원</div>
        </div>
      </div>
      <div class="stat-breakdown">
        <h4>품목별 합계</h4>
        ${itemRows}
      </div>
    `;
  }

  saveReceipt() {
    const formData = this.getFormData();
    if (!formData.date) {
      this.showNotification(this.messages.saveError, "error");
      return;
    }
    const receiptId = this.currentReceiptId || this.generateId();
    formData.id = receiptId;

    this.receipts[receiptId] = formData;
    this.saveReceiptsToStorage();
    this.currentReceiptId = receiptId;

    this.showNotification(this.messages.saveSuccess, "success");
    this.displayReceiptList();
  }

  loadReceipt(receiptId) {
    const receipt = this.receipts[receiptId];
    if (receipt) {
      this.setFormData(receipt);
      this.currentReceiptId = receiptId;
      this.showNotification(this.messages.loadSuccess, "success");
    }
  }

  deleteReceipt(receiptId) {
    this.showConfirm(this.messages.deleteConfirm, () => {
      delete this.receipts[receiptId];
      this.saveReceiptsToStorage();
      this.displayReceiptList();
      if (this.currentReceiptId === receiptId) {
        this._clearFormContents();
      }
      this.showNotification(this.messages.deleteSuccess, "success");
    });
  }

  clearForm() {
    this.showConfirm(this.messages.clearConfirm, () => {
      this._clearFormContents();
      this.showNotification(this.messages.clearSuccess, "success");
    });
  }

  _clearFormContents() {
    this.setInitialDate();
    document.getElementById("receiptAmount").value = "";
    document.getElementById("bill_log_tableBody").innerHTML = "";
    this.initializeTable();
    document.getElementById("monthlyStats").innerHTML = "";
    this.currentReceiptId = null;
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
      const count = receipt.items ? receipt.items.filter(i => i.item).length : 0;
      item.innerHTML = `
        <h4>${receipt.date}</h4>
        <p><strong>총 금액:</strong> ${total.toLocaleString()}원</p>
        <p><strong>항목 수:</strong> ${count}건</p>
        <div class="report-actions">
          <button class="btn btn-primary btn-small btn-load">불러오기</button>
          <button class="btn btn-warning btn-small btn-delete">삭제</button>
        </div>
      `;
      item.querySelector(".btn-load").addEventListener("click", () => this.loadReceipt(receipt.id));
      item.querySelector(".btn-delete").addEventListener("click", () => this.deleteReceipt(receipt.id));
      receiptList.appendChild(item);
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
      ["날짜", "품목", "수량", "금액", "비고"],
      ...formData.items.map(i => [i.date, i.item, i.quantity, i.price, i.note])
    ]);
    ws["!cols"] = [{ width: 15 }, { width: 25 }, { width: 10 }, { width: 15 }, { width: 25 }];
    XLSX.utils.book_append_sheet(wb, ws, "영수증");
    XLSX.writeFile(wb, `영수증_${formData.date}.xlsx`);
    this.showNotification(this.messages.exportExcelSuccess, "success");
  }

  async exportToPDF() {
    const formData = this.getFormData();
    if (!formData.date) {
      this.showNotification(this.messages.exportError, "error");
      return;
    }
    this.showNotification(this.messages.exportPdfSuccess, "success");

    const reportElement = document.querySelector("#receipt-tab .document");
    const container = document.body;
    const tempElements = [];

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

      pdf.save(`영수증_${formData.date}.pdf`);
    } catch (err) {
      console.error("PDF 생성 오류:", err);
      this.showNotification("PDF 생성 중 오류가 발생했습니다.", "error");
    } finally {
      container.classList.remove("pdf-export-mode");
      tempElements.forEach(({ original, temp }) => {
        original.style.display = '';
        if (temp.parentNode) temp.parentNode.removeChild(temp);
      });
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
    if (confirm(message)) onConfirm();
  }
}

// =================================
// 앱 초기화
// =================================
const app = new DailyReportApp();
const receiptApp = new ReceiptApp();
initTabNavigation();

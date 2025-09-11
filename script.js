// jsPDF 전역 객체 할당
const { jsPDF } = window.jspdf;

class DailyReportApp {
  constructor() {
    // 설정 및 상수
    this.config = {
      storageKey: "dailyReports",
      tempStorageKey: "tempDailyReport",
      autoSaveInterval: 10000,
    };

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

    // 상태
    this.reports = this.loadReportsFromStorage();
    this.currentReportId = null;
    this.autoSaveTimer = null;

    this.initializeApp();
  }

  // =================================
  // 초기화
  // =================================
  initializeApp() {
    this.setInitialDate();
    this.attachEventListeners();
    this.initializeTables();
    this.displayReportList();
    this.loadTemporaryReport();
    this.startAutoSave();
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

  // =================================
  // 이벤트 리스너
  // =================================
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

    document.querySelector(".document").addEventListener("input", () => this.handleAutoSave());
  }

  // =================================
  // 데이터 관리 (Get/Set/Save/Load)
  // =================================
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
    this.clearTemporaryReport();
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
      if(this.currentReportId === reportId) {
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

  // =================================
  // UI 렌더링 및 컨트롤
  // =================================
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
    const existingModal = document.querySelector(".modal-overlay");
    if (existingModal) existingModal.remove();
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-content">
        <p>${message}</p>
        <div class="modal-actions">
          <button id="confirmBtn" class="btn btn-primary">확인</button>
          <button id="cancelBtn" class="btn btn-secondary">취소</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const closeModal = () => {
      modal.classList.remove("active");
      setTimeout(() => modal.remove(), 300);
    };
    modal.querySelector("#confirmBtn").onclick = () => { onConfirm(); closeModal(); };
    modal.querySelector("#cancelBtn").onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };
    setTimeout(() => modal.classList.add("active"), 10);
  }

  // =================================
  // 내보내기 기능
  // =================================
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

 // =================================
  // 내보내기 기능
  // =================================
  exportToExcel() {
    // ... (기존과 동일)
  }

  async exportToPDF() {
    const formData = this.getFormData();
    if (!formData.date || !formData.reporter) {
      this.showNotification(this.messages.exportError, "error");
      return;
    }
    this.showNotification(this.messages.exportPdfSuccess, "success");

    const reportElement = document.querySelector(".document");
    const container = document.body;
    const tempElements = [];

    // PDF 변환 준비
    container.classList.add("pdf-export-mode");

    // 1. Textarea를 div로 교체
    const textareas = reportElement.querySelectorAll('textarea');
    textareas.forEach(textarea => {
      const div = document.createElement('div');
      div.className = 'temp-pdf-div';
      div.innerText = textarea.value || textarea.placeholder;
      textarea.style.display = 'none';
      textarea.parentNode.insertBefore(div, textarea);
      tempElements.push({ original: textarea, temp: div });
    });

    // ✨ 최종 수정: Input을 잘리지 않는 div로 교체
    const inputsToReplace = reportElement.querySelectorAll('.date-input, .text-input');
    inputsToReplace.forEach(input => {
      const div = document.createElement('div');
      div.className = 'temp-pdf-input-div'; // 새로운 클래스 적용
      div.innerText = input.value || '';
      input.style.display = 'none';
      input.parentNode.insertBefore(div, input);
      tempElements.push({ original: input, temp: div });
    });
    
    try {
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
      });

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
      // PDF 생성 후 모든 임시 요소를 원래 요소로 복구
      container.classList.remove("pdf-export-mode");
      tempElements.forEach(({ original, temp }) => {
        original.style.display = '';
        if (temp.parentNode) {
            temp.parentNode.removeChild(temp);
        }
      });
    }
  }
  
  // =================================
  // 유틸리티 및 스토리지
  // =================================
  generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }
  loadReportsFromStorage() { return JSON.parse(localStorage.getItem(this.config.storageKey)) || {}; }
  saveReportsToStorage() { localStorage.setItem(this.config.storageKey, JSON.stringify(this.reports)); }
  
  // =================================
  // 자동 저장
  // =================================
  startAutoSave() {
    this.autoSaveTimer = setInterval(() => this.saveTemporaryReport(), this.config.autoSaveInterval);
  }

  handleAutoSave() { this.saveTemporaryReport(); }

  saveTemporaryReport() {
    const formData = this.getFormData();
    if (formData.reporter || formData.dailyWork.some(item => item.work)) {
        localStorage.setItem(this.config.tempStorageKey, JSON.stringify(formData));
    }
  }

  loadTemporaryReport() {
    const tempData = localStorage.getItem(this.config.tempStorageKey);
    if (tempData) {
        if (confirm("이전에 작성하던 내용이 있습니다. 불러오시겠습니까?")) {
            this.setFormData(JSON.parse(tempData));
        }
    }
  }

  clearTemporaryReport() {
      localStorage.removeItem(this.config.tempStorageKey);
  }
}

// 앱 초기화
const app = new DailyReportApp();
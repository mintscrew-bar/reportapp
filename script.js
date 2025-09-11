class DailyReportApp {
  constructor() {
    this.reports = this.loadReportsFromStorage();
    this.currentReportId = null;
    this.initializeApp();
  }

  initializeApp() {
    // 오늘 날짜로 초기화
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("reportDate").value = today;

    // 이벤트 리스너 등록
    this.attachEventListeners();

    // 테이블 초기화
    this.initializeTables();

    // 저장된 보고서 목록 표시
    this.displayReportList();
  }

  initializeTables() {
    // 일일 업무 테이블 초기화
    this.addDailyWorkRow();

    // 주간 계획 테이블 초기화
    this.addWeeklyPlanRow();

    // 월간 계획 테이블 초기화
    this.addMonthlyPlanRow();
  }

  attachEventListeners() {
    document
      .getElementById("saveBtn")
      .addEventListener("click", () => this.saveReport());
    document
      .getElementById("loadBtn")
      .addEventListener("click", () => this.showLoadDialog());
    document
      .getElementById("clearBtn")
      .addEventListener("click", () => this.clearForm());
    document
      .getElementById("exportExcelBtn")
      .addEventListener("click", () => this.exportToExcel());
    document
      .getElementById("exportPdfBtn")
      .addEventListener("click", () => this.exportToPDF());

    // 테이블 행 추가/제거 버튼
    document
      .getElementById("addDailyRow")
      .addEventListener("click", () => this.addDailyWorkRow());
    document
      .getElementById("removeDailyRow")
      .addEventListener("click", () => this.removeDailyWorkRow());
    document
      .getElementById("addWeeklyRow")
      .addEventListener("click", () => this.addWeeklyPlanRow());
    document
      .getElementById("removeWeeklyRow")
      .addEventListener("click", () => this.removeWeeklyPlanRow());
    document
      .getElementById("addMonthlyRow")
      .addEventListener("click", () => this.addMonthlyPlanRow());
    document
      .getElementById("removeMonthlyRow")
      .addEventListener("click", () => this.removeMonthlyPlanRow());
  }

  addDailyWorkRow() {
    const tbody = document.getElementById("dailyWorkTableBody");
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input type="text" class="table-input" placeholder="09:00" /></td>
      <td><input type="text" class="table-input" placeholder="업무 내용을 입력하세요" /></td>
      <td><input type="text" class="table-input" placeholder="비고사항" /></td>
    `;
    tbody.appendChild(row);
  }

  removeDailyWorkRow() {
    const tbody = document.getElementById("dailyWorkTableBody");
    const rows = tbody.querySelectorAll("tr");
    if (rows.length > 1) {
      tbody.removeChild(rows[rows.length - 1]);
    } else {
      this.showNotification("최소 1개의 행은 유지해야 합니다.", "error");
    }
  }

  addWeeklyPlanRow() {
    const tbody = document.getElementById("weeklyPlanTableBody");
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input type="text" class="table-input" placeholder="주간 업무 계획을 입력하세요" /></td>
    `;
    tbody.appendChild(row);
  }

  addMonthlyPlanRow() {
    const tbody = document.getElementById("monthlyPlanTableBody");
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input type="text" class="table-input" placeholder="월간 업무 계획을 입력하세요" /></td>
    `;
    tbody.appendChild(row);
  }

  removeWeeklyPlanRow() {
    const tbody = document.getElementById("weeklyPlanTableBody");
    const rows = tbody.querySelectorAll("tr");
    if (rows.length > 1) {
      tbody.removeChild(rows[rows.length - 1]);
    } else {
      this.showNotification("최소 1개의 행은 유지해야 합니다.", "error");
    }
  }

  removeMonthlyPlanRow() {
    const tbody = document.getElementById("monthlyPlanTableBody");
    const rows = tbody.querySelectorAll("tr");
    if (rows.length > 1) {
      tbody.removeChild(rows[rows.length - 1]);
    } else {
      this.showNotification("최소 1개의 행은 유지해야 합니다.", "error");
    }
  }

  getFormData() {
    // 기본 정보
    const basicInfo = {
      date: document.getElementById("reportDate").value,
      reporter: document.getElementById("reporter").value,
      instructions: document.getElementById("instructions").value,
      otherReports: document.getElementById("otherReports").value,
      createdAt: new Date().toISOString(),
    };

    // 일일 업무 테이블 데이터
    const dailyWorkData = [];
    const dailyWorkRows = document.querySelectorAll("#dailyWorkTableBody tr");
    dailyWorkRows.forEach((row) => {
      const inputs = row.querySelectorAll("input");
      if (inputs.length >= 3) {
        dailyWorkData.push({
          time: inputs[0].value,
          work: inputs[1].value,
          note: inputs[2].value,
        });
      }
    });

    // 주간 계획 테이블 데이터
    const weeklyPlanData = [];
    const weeklyPlanRows = document.querySelectorAll("#weeklyPlanTableBody tr");
    weeklyPlanRows.forEach((row) => {
      const input = row.querySelector("input");
      if (input && input.value.trim()) {
        weeklyPlanData.push(input.value);
      }
    });

    // 월간 계획 테이블 데이터
    const monthlyPlanData = [];
    const monthlyPlanRows = document.querySelectorAll(
      "#monthlyPlanTableBody tr"
    );
    monthlyPlanRows.forEach((row) => {
      const input = row.querySelector("input");
      if (input && input.value.trim()) {
        monthlyPlanData.push(input.value);
      }
    });

    return {
      ...basicInfo,
      dailyWork: dailyWorkData,
      weeklyPlan: weeklyPlanData,
      monthlyPlan: monthlyPlanData,
    };
  }

  setFormData(data) {
    // 기본 정보 설정
    document.getElementById("reportDate").value = data.date || "";
    document.getElementById("reporter").value = data.reporter || "";
    document.getElementById("instructions").value = data.instructions || "";
    document.getElementById("otherReports").value = data.otherReports || "";

    // 일일 업무 테이블 설정 - 기존 데이터 구조 호환성 처리
    let dailyWorkData = data.dailyWork || [];
    if (data.workSummary || data.completedTasks || data.ongoingTasks) {
      // 기존 구조의 데이터를 새로운 구조로 변환
      dailyWorkData = [];
      if (data.workSummary) {
        dailyWorkData.push({ time: "", work: data.workSummary, note: "" });
      }
      if (data.completedTasks) {
        dailyWorkData.push({ time: "", work: data.completedTasks, note: "" });
      }
      if (data.ongoingTasks) {
        dailyWorkData.push({ time: "", work: data.ongoingTasks, note: "" });
      }
    }
    this.setTableData("dailyWorkTableBody", dailyWorkData, 3);

    // 주간 계획 테이블 설정
    this.setTableData("weeklyPlanTableBody", data.weeklyPlan || [], 1);

    // 월간 계획 테이블 설정
    this.setTableData("monthlyPlanTableBody", data.monthlyPlan || [], 1);
  }

  setTableData(tableBodyId, data, inputCount) {
    const tbody = document.getElementById(tableBodyId);
    tbody.innerHTML = "";

    if (data.length === 0) {
      // 데이터가 없으면 빈 행 하나 추가
      if (inputCount === 3) {
        this.addDailyWorkRow();
      } else if (inputCount === 1) {
        if (tableBodyId === "weeklyPlanTableBody") {
          this.addWeeklyPlanRow();
        } else {
          this.addMonthlyPlanRow();
        }
      }
      return;
    }

    data.forEach((item) => {
      const row = document.createElement("tr");

      if (inputCount === 3) {
        // 일일 업무 테이블
        row.innerHTML = `
          <td><input type="text" class="table-input" value="${
            item.time || ""
          }" placeholder="09:00" /></td>
          <td><input type="text" class="table-input" value="${
            item.work || ""
          }" placeholder="업무 내용을 입력하세요" /></td>
          <td><input type="text" class="table-input" value="${
            item.note || ""
          }" placeholder="비고사항" /></td>
        `;
      } else {
        // 계획 테이블
        row.innerHTML = `
          <td><input type="text" class="table-input" value="${item}" placeholder="업무 계획을 입력하세요" /></td>
        `;
      }

      tbody.appendChild(row);
    });
  }

  saveReport() {
    const formData = this.getFormData();

    // 필수 필드 검증
    if (!formData.date || !formData.reporter) {
      this.showNotification("날짜, 작성자는 필수 입력 항목입니다.", "error");
      return;
    }

    // 고유 ID 생성
    const reportId = this.currentReportId || this.generateId();
    formData.id = reportId;

    // 보고서 저장
    this.reports[reportId] = formData;
    this.saveReportsToStorage();
    this.currentReportId = reportId;

    this.showNotification("보고서가 저장되었습니다.", "success");
    this.displayReportList();
  }

  loadReport(reportId) {
    const report = this.reports[reportId];
    if (report) {
      this.setFormData(report);
      this.currentReportId = reportId;
      this.showNotification("보고서를 불러왔습니다.", "success");
    } else {
      this.showNotification("보고서를 찾을 수 없습니다.", "error");
    }
  }

  showLoadDialog() {
    const reportList = document.getElementById("reportList");

    if (Object.keys(this.reports).length === 0) {
      reportList.innerHTML =
        '<div class="empty-state">저장된 보고서가 없습니다.</div>';
      return;
    }

    // 모달 창 생성
    const modal = document.createElement("div");
    modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;

    const modalContent = document.createElement("div");
    modalContent.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 15px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        `;

    modalContent.innerHTML = `
            <h3 style="margin-bottom: 20px; color: #2c3e50;">저장된 보고서 목록</h3>
            <div id="modalReportList"></div>
            <div style="text-align: center; margin-top: 20px;">
                <button id="closeModal" class="btn btn-secondary">닫기</button>
            </div>
        `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // 보고서 목록 표시
    const modalReportList = document.getElementById("modalReportList");
    Object.values(this.reports).forEach((report) => {
      const reportItem = document.createElement("div");
      reportItem.className = "report-item";
      reportItem.innerHTML = `
                <h4>${report.date}</h4>
                <p><strong>작성자:</strong> ${report.reporter}</p>
                <p><strong>일일 업무:</strong> ${
                  report.dailyWork ? report.dailyWork.length + "건" : "0건"
                }</p>
                <div class="report-actions">
                    <button class="btn btn-primary btn-small" onclick="app.loadReport('${
                      report.id
                    }'); app.closeModal();">불러오기</button>
                    <button class="btn btn-warning btn-small" onclick="app.deleteReport('${
                      report.id
                    }'); app.closeModal();">삭제</button>
                </div>
            `;
      modalReportList.appendChild(reportItem);
    });

    // 모달 닫기
    document
      .getElementById("closeModal")
      .addEventListener("click", () => this.closeModal());
    modal.addEventListener("click", (e) => {
      if (e.target === modal) this.closeModal();
    });
  }

  closeModal() {
    const modal = document.querySelector('div[style*="position: fixed"]');
    if (modal) {
      document.body.removeChild(modal);
    }
  }

  deleteReport(reportId) {
    if (confirm("정말로 이 보고서를 삭제하시겠습니까?")) {
      delete this.reports[reportId];
      this.saveReportsToStorage();
      this.displayReportList();
      this.showNotification("보고서가 삭제되었습니다.", "success");
    }
  }

  clearForm() {
    if (confirm("모든 입력 내용을 초기화하시겠습니까?")) {
      document.getElementById("reportDate").value = new Date()
        .toISOString()
        .split("T")[0];
      document.getElementById("reporter").value = "";
      document.getElementById("instructions").value = "";
      document.getElementById("otherReports").value = "";

      // 테이블 초기화
      this.initializeTables();

      this.currentReportId = null;
      this.showNotification("폼이 초기화되었습니다.", "success");
    }
  }

  displayReportList() {
    const reportList = document.getElementById("reportList");

    if (Object.keys(this.reports).length === 0) {
      reportList.innerHTML =
        '<div class="empty-state">저장된 보고서가 없습니다.</div>';
      return;
    }

    reportList.innerHTML = "";
    Object.values(this.reports)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5) // 최근 5개만 표시
      .forEach((report) => {
        const reportItem = document.createElement("div");
        reportItem.className = "report-item";
        reportItem.innerHTML = `
                    <h4>${report.date}</h4>
                    <p><strong>작성자:</strong> ${report.reporter}</p>
                    <p><strong>일일 업무:</strong> ${
                      report.dailyWork ? report.dailyWork.length + "건" : "0건"
                    }</p>
                    <div class="report-actions">
                        <button class="btn btn-primary btn-small" onclick="app.loadReport('${
                          report.id
                        }')">불러오기</button>
                        <button class="btn btn-warning btn-small" onclick="app.deleteReport('${
                          report.id
                        }')">삭제</button>
                    </div>
                `;
        reportList.appendChild(reportItem);
      });
  }

  exportToExcel() {
    const formData = this.getFormData();

    if (!formData.date || !formData.reporter) {
      this.showNotification(
        "내보낼 데이터가 없습니다. 필수 항목을 입력해주세요.",
        "error"
      );
      return;
    }

    const wb = XLSX.utils.book_new();

    // 기본 정보 시트
    const basicData = [
      ["일일업무보고서"],
      [""],
      ["보고서 날짜", formData.date],
      ["작성자", formData.reporter],
      [""],
      ["지시 및 이행사항", formData.instructions],
      [""],
      ["기타 보고사항", formData.otherReports],
      [""],
      ["작성일시", new Date().toLocaleString("ko-KR")],
    ];

    const basicWs = XLSX.utils.aoa_to_sheet(basicData);
    basicWs["!cols"] = [{ width: 20 }, { width: 50 }];
    XLSX.utils.book_append_sheet(wb, basicWs, "기본정보");

    // 일일 업무 시트
    if (formData.dailyWork && formData.dailyWork.length > 0) {
      const dailyData = [
        ["시간", "업무내용", "비고"],
        ...formData.dailyWork.map((item) => [item.time, item.work, item.note]),
      ];
      const dailyWs = XLSX.utils.aoa_to_sheet(dailyData);
      dailyWs["!cols"] = [{ width: 15 }, { width: 50 }, { width: 25 }];
      XLSX.utils.book_append_sheet(wb, dailyWs, "일일업무");
    }

    // 주간 계획 시트
    if (formData.weeklyPlan && formData.weeklyPlan.length > 0) {
      const weeklyData = [
        ["주간 업무 계획"],
        ...formData.weeklyPlan.map((item) => [item]),
      ];
      const weeklyWs = XLSX.utils.aoa_to_sheet(weeklyData);
      weeklyWs["!cols"] = [{ width: 80 }];
      XLSX.utils.book_append_sheet(wb, weeklyWs, "주간계획");
    }

    // 월간 계획 시트
    if (formData.monthlyPlan && formData.monthlyPlan.length > 0) {
      const monthlyData = [
        ["월간 업무 계획"],
        ...formData.monthlyPlan.map((item) => [item]),
      ];
      const monthlyWs = XLSX.utils.aoa_to_sheet(monthlyData);
      monthlyWs["!cols"] = [{ width: 80 }];
      XLSX.utils.book_append_sheet(wb, monthlyWs, "월간계획");
    }

    // 파일명 생성
    const fileName = `일일업무보고서_${formData.date}_${formData.reporter}.xlsx`;

    XLSX.writeFile(wb, fileName);
    this.showNotification("Excel 파일로 내보내기가 완료되었습니다.", "success");
  }

  exportToPDF() {
    const formData = this.getFormData();

    if (!formData.date || !formData.reporter) {
      this.showNotification(
        "내보낼 데이터가 없습니다. 필수 항목을 입력해주세요.",
        "error"
      );
      return;
    }

    // HTML을 PDF로 변환하는 방식 사용
    this.generatePDFFromHTML(formData);
  }

  generatePDFFromHTML(formData) {
    // HTML 내용 생성
    let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
            body {
                font-family: 'Noto Sans KR', sans-serif;
                margin: 20px;
                line-height: 1.6;
                color: #333;
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #333;
                padding-bottom: 20px;
            }
            .header h1 {
                font-size: 24px;
                margin: 0;
                font-weight: bold;
            }
            .info-section {
                margin-bottom: 20px;
            }
            .info-row {
                margin-bottom: 8px;
            }
            .info-label {
                font-weight: bold;
                display: inline-block;
                width: 100px;
            }
            .section {
                margin-bottom: 25px;
            }
            .section h2 {
                font-size: 16px;
                margin-bottom: 10px;
                border-bottom: 1px solid #ccc;
                padding-bottom: 5px;
            }
            .work-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
            }
            .work-table th,
            .work-table td {
                border: 1px solid #333;
                padding: 8px;
                text-align: left;
                vertical-align: top;
            }
            .work-table th {
                background-color: #f5f5f5;
                font-weight: bold;
                text-align: center;
            }
            .time-col { width: 15%; }
            .work-col { width: 50%; }
            .note-col { width: 25%; }
            .plan-list {
                margin: 0;
                padding-left: 20px;
            }
            .plan-list li {
                margin-bottom: 5px;
            }
            .no-data {
                color: #666;
                font-style: italic;
            }
            .footer {
                margin-top: 30px;
                font-size: 12px;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>일일업무보고서</h1>
        </div>

        <div class="info-section">
            <div class="info-row">
                <span class="info-label">보고서 날짜:</span>
                <span>${formData.date}</span>
            </div>
            <div class="info-row">
                <span class="info-label">작성자:</span>
                <span>${formData.reporter}</span>
            </div>
        </div>

        <div class="section">
            <h2>1. 일일 업무</h2>
    `;

    // 일일 업무 테이블
    if (formData.dailyWork && formData.dailyWork.length > 0) {
      htmlContent += `
            <table class="work-table">
                <thead>
                    <tr>
                        <th class="time-col">시간</th>
                        <th class="work-col">업무내용</th>
                        <th class="note-col">비고</th>
                    </tr>
                </thead>
                <tbody>
      `;

      formData.dailyWork.forEach((item) => {
        htmlContent += `
                    <tr>
                        <td>${item.time || ""}</td>
                        <td>${item.work || ""}</td>
                        <td>${item.note || ""}</td>
                    </tr>
        `;
      });

      htmlContent += `
                </tbody>
            </table>
      `;
    } else {
      htmlContent += `<p class="no-data">등록된 업무가 없습니다.</p>`;
    }

    htmlContent += `
        </div>

        <div class="section">
            <h2>2. 지시 및 이행사항</h2>
    `;

    if (formData.instructions && formData.instructions.trim()) {
      htmlContent += `<p>${formData.instructions.replace(/\n/g, "<br>")}</p>`;
    } else {
      htmlContent += `<p class="no-data">없음</p>`;
    }

    htmlContent += `
        </div>

        <div class="section">
            <h2>3. 기타 보고사항</h2>
    `;

    if (formData.otherReports && formData.otherReports.trim()) {
      htmlContent += `<p>${formData.otherReports.replace(/\n/g, "<br>")}</p>`;
    } else {
      htmlContent += `<p class="no-data">없음</p>`;
    }

    htmlContent += `
        </div>

        <div class="section">
            <h2>4. 주간 주요 업무 계획</h2>
    `;

    if (formData.weeklyPlan && formData.weeklyPlan.length > 0) {
      htmlContent += `<ul class="plan-list">`;
      formData.weeklyPlan.forEach((plan) => {
        if (plan && plan.trim()) {
          htmlContent += `<li>${plan}</li>`;
        }
      });
      htmlContent += `</ul>`;
    } else {
      htmlContent += `<p class="no-data">없음</p>`;
    }

    htmlContent += `
        </div>

        <div class="section">
            <h2>5. 월간 주요 업무 계획</h2>
    `;

    if (formData.monthlyPlan && formData.monthlyPlan.length > 0) {
      htmlContent += `<ul class="plan-list">`;
      formData.monthlyPlan.forEach((plan) => {
        if (plan && plan.trim()) {
          htmlContent += `<li>${plan}</li>`;
        }
      });
      htmlContent += `</ul>`;
    } else {
      htmlContent += `<p class="no-data">없음</p>`;
    }

    htmlContent += `
        </div>

        <div class="footer">
            <p>작성일시: ${new Date().toLocaleString("ko-KR")}</p>
        </div>
    </body>
    </html>
    `;

    // 새 창에서 HTML 열기
    const newWindow = window.open("", "_blank");
    newWindow.document.write(htmlContent);
    newWindow.document.close();

    // 인쇄 대화상자 열기
    setTimeout(() => {
      newWindow.print();
    }, 500);

    this.showNotification(
      "PDF 인쇄 창이 열렸습니다. 인쇄 시 PDF로 저장하세요.",
      "success"
    );
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  loadReportsFromStorage() {
    try {
      const stored = localStorage.getItem("dailyReports");
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error("저장된 보고서를 불러오는 중 오류가 발생했습니다:", error);
      return {};
    }
  }

  saveReportsToStorage() {
    try {
      localStorage.setItem("dailyReports", JSON.stringify(this.reports));
    } catch (error) {
      console.error("보고서를 저장하는 중 오류가 발생했습니다:", error);
      this.showNotification("저장 중 오류가 발생했습니다.", "error");
    }
  }

  showNotification(message, type = "success") {
    // 기존 알림 제거
    const existingNotification = document.querySelector(".notification");
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // 3초 후 자동 제거
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }
}

// 앱 초기화
const app = new DailyReportApp();

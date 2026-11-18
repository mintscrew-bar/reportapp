const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// 데이터가 저장될 경로와 파일 이름 설정
const dbPath = path.join(app.getPath('userData'), 'reportsData.json');
const dbPathReceipts = path.join(app.getPath('userData'), 'receiptsData.json');
const dbPathExpenses = path.join(app.getPath('userData'), 'expensesData.json');
const dbPathDrafts = path.join(app.getPath('userData'), 'draftsData.json');

function loadJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return { data: {}, warning: null };

  try {
    const rawData = fs.readFileSync(filePath, 'utf8');
    return { data: rawData ? JSON.parse(rawData) : {}, warning: null };
  } catch (error) {
    const backupPath = `${filePath}.corrupt-${Date.now()}`;
    fs.copyFileSync(filePath, backupPath);
    console.error(`데이터 파일을 읽지 못해 백업했습니다: ${backupPath}`, error);
    return {
      data: {},
      warning: `저장 데이터가 손상되어 백업했습니다. 새 문서로 시작합니다.\n${backupPath}`,
    };
  }
}

function saveJsonFile(filePath, data) {
  const tempPath = `${filePath}.tmp`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
    return { success: true };
  } catch (error) {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    console.error(`데이터 저장 실패: ${filePath}`, error);
    throw error;
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // 웹페이지와 네이티브 기능을 연결하는 다리
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// -- 데이터 처리 로직 --
// 웹페이지로부터 '데이터 로드' 요청을 받으면 실행
ipcMain.handle('load-data', () => {
  return loadJsonFile(dbPath);
});

// 웹페이지로부터 '데이터 저장' 요청을 받으면 실행하고 결과를 반환
ipcMain.handle('save-data', (event, data) => {
  return saveJsonFile(dbPath, data);
});

// 영수증 데이터 처리 로직
ipcMain.handle('load-receipts', () => {
  return loadJsonFile(dbPathReceipts);
});

ipcMain.handle('save-receipts', (event, data) => {
  return saveJsonFile(dbPathReceipts, data);
});

// 업무보고서와 영수증에서 함께 사용하는 지출 데이터
ipcMain.handle('load-expenses', () => loadJsonFile(dbPathExpenses));
ipcMain.handle('save-expenses', (event, data) => saveJsonFile(dbPathExpenses, data));

// 저장 전 입력 내용을 복구하기 위한 자동저장 초안
ipcMain.handle('load-drafts', () => loadJsonFile(dbPathDrafts));
ipcMain.handle('save-drafts', (event, data) => saveJsonFile(dbPathDrafts, data));
ipcMain.handle('get-app-version', () => app.getVersion());

// 전체 데이터 백업 및 복원
ipcMain.handle('export-backup', async (event, data) => {
  const ownerWindow = BrowserWindow.fromWebContents(event.sender);
  const now = new Date();
  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const defaultName = `업무보고서_백업_${localDate}.json`;
  const result = await dialog.showSaveDialog(ownerWindow, {
    title: '업무보고서 데이터 백업',
    defaultPath: path.join(app.getPath('documents'), defaultName),
    filters: [{ name: '업무보고서 백업', extensions: ['json'] }],
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  saveJsonFile(result.filePath, data);
  return { canceled: false, filePath: result.filePath };
});

ipcMain.handle('import-backup', async (event) => {
  const ownerWindow = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(ownerWindow, {
    title: '업무보고서 데이터 복원',
    properties: ['openFile'],
    filters: [{ name: '업무보고서 백업', extensions: ['json'] }],
  });
  if (result.canceled || result.filePaths.length === 0) return { canceled: true };

  const rawData = fs.readFileSync(result.filePaths[0], 'utf8');
  const backup = JSON.parse(rawData);
  if (!backup || typeof backup !== 'object' || !backup.data) {
    throw new Error('올바른 업무보고서 백업 파일이 아닙니다.');
  }
  return { canceled: false, backup, filePath: result.filePaths[0] };
});

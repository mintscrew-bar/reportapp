const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// 데이터가 저장될 경로와 파일 이름 설정
const dbPath = path.join(app.getPath('userData'), 'reportsData.json');
const dbPathReceipts = path.join(app.getPath('userData'), 'receiptsData.json');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js') // 웹페이지와 네이티브 기능을 연결하는 다리
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
  if (fs.existsSync(dbPath)) {
    return fs.readFileSync(dbPath, 'utf8');
  }
  return null; // 파일이 없으면 null 반환
});

// 웹페이지로부터 '데이터 저장' 요청을 받으면 실행
ipcMain.on('save-data', (event, data) => {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
});

// 영수증 데이터 처리 로직
ipcMain.handle('load-receipts', () => {
  if (fs.existsSync(dbPathReceipts)) {
    return fs.readFileSync(dbPathReceipts, 'utf8');
  }
  return null;
});

ipcMain.on('save-receipts', (event, data) => {
  fs.writeFileSync(dbPathReceipts, JSON.stringify(data, null, 2));
});
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  loadData: () => ipcRenderer.invoke('load-data'),
  saveReceipts: (data) => ipcRenderer.invoke('save-receipts', data),
  loadReceipts: () => ipcRenderer.invoke('load-receipts'),
  saveExpenses: (data) => ipcRenderer.invoke('save-expenses', data),
  loadExpenses: () => ipcRenderer.invoke('load-expenses'),
  saveDrafts: (data) => ipcRenderer.invoke('save-drafts', data),
  loadDrafts: () => ipcRenderer.invoke('load-drafts'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  exportBackup: (data) => ipcRenderer.invoke('export-backup', data),
  importBackup: () => ipcRenderer.invoke('import-backup')
});

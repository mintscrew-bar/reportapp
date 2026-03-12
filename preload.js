const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveData: (data) => ipcRenderer.send('save-data', data),
  loadData: () => ipcRenderer.invoke('load-data'),
  saveReceipts: (data) => ipcRenderer.send('save-receipts', data),
  loadReceipts: () => ipcRenderer.invoke('load-receipts')
});
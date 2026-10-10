const { contextBridge, ipcRenderer } = require('electron');

// A minimal, explicit surface — the renderer (stowplan.html) never gets raw Node or IPC
// access, only these specific calls, matching exactly what the app's existing storage
// abstraction needs (get/set/remove) plus native save/open dialogs for backups.
contextBridge.exposeInMainWorld('electronStore', {
  get: (key) => ipcRenderer.invoke('store:get', key),
  set: (key, value) => ipcRenderer.invoke('store:set', key, value),
  remove: (key) => ipcRenderer.invoke('store:remove', key),
  dataDir: () => ipcRenderer.invoke('store:dataDir'),
  saveBackupDialog: (defaultName, contents) => ipcRenderer.invoke('dialog:saveBackup', defaultName, contents),
  openBackupDialog: () => ipcRenderer.invoke('dialog:openBackup'),
  showDataDir: () => ipcRenderer.invoke('shell:showDataDir'),
  claudeMessages: (apiKey, body) => ipcRenderer.invoke('claude:messages', { apiKey, body })
});

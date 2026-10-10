const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// A single JSON file on disk holds every key the app stores — kept in
// ~/Documents/StowPlan so it's a real, visible, backup-able file, not hidden
// app-support data, and never touched by clearing browser data.
const dataDir = path.join(app.getPath('documents'), 'StowPlan');
const dataFile = path.join(dataDir, 'stowplan-data.json');

function ensureDataDir(){ if(!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true }); }

function readStore(){
  try{
    ensureDataDir();
    if(!fs.existsSync(dataFile)) return {};
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  }catch(e){
    // a corrupt file should never crash the app or wipe data silently — keep the bad
    // file around under a different name and start fresh rather than losing it
    try{ fs.copyFileSync(dataFile, dataFile + '.corrupt-' + Date.now()); }catch(e2){}
    return {};
  }
}

let cache = null;
function getCache(){ if(!cache) cache = readStore(); return cache; }

// atomic write: write to a temp file then rename over the real one, so a crash or power
// loss mid-write can never leave a half-written, corrupted data file behind
function writeStoreAtomic(obj){
  ensureDataDir();
  const tmp = dataFile + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(obj));
  fs.renameSync(tmp, dataFile);
}

ipcMain.handle('store:get', (evt, key) => {
  const c = getCache();
  return Object.prototype.hasOwnProperty.call(c, key) ? c[key] : null;
});
ipcMain.handle('store:set', (evt, key, value) => {
  const c = getCache();
  c[key] = value;
  writeStoreAtomic(c);
  return true;
});
ipcMain.handle('store:remove', (evt, key) => {
  const c = getCache();
  delete c[key];
  writeStoreAtomic(c);
  return true;
});
ipcMain.handle('store:dataDir', () => dataDir);

ipcMain.handle('dialog:saveBackup', async (evt, defaultName, contents) => {
  const win = BrowserWindow.getFocusedWindow();
  const res = await dialog.showSaveDialog(win, {
    defaultPath: path.join(app.getPath('documents'), defaultName),
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if(res.canceled || !res.filePath) return { canceled: true };
  fs.writeFileSync(res.filePath, contents);
  return { canceled: false, filePath: res.filePath };
});
ipcMain.handle('dialog:openBackup', async () => {
  const win = BrowserWindow.getFocusedWindow();
  const res = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if(res.canceled || !res.filePaths.length) return { canceled: true };
  const contents = fs.readFileSync(res.filePaths[0], 'utf8');
  return { canceled: false, contents };
});
ipcMain.handle('shell:showDataDir', () => { shell.showItemInFolder(dataFile); });

function createWindow(){
  const win = new BrowserWindow({
    width: 1400, height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'StowPlan'
  });
  win.loadFile(path.join(__dirname, 'app', 'stowplan.html'));
  win.on('page-title-updated', (e)=>e.preventDefault()); // keep "StowPlan" as the title
  // the print sheet opens via a plain window.open() + document.write(), same as it does in
  // a browser — Electron blocks new windows by default unless explicitly allowed here
  win.webContents.setWindowOpenHandler(() => ({
    action: 'allow',
    overrideBrowserWindowOptions: { width: 900, height: 1100, webPreferences: { contextIsolation: true } }
  }));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if(process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if(BrowserWindow.getAllWindows().length===0) createWindow(); });

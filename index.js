// main.js
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const fsPromises = fs.promises;
const axios = require('axios');
const { exec } = require('child_process');

let mainWindow;
const BACKEND_VERSION = 'v2.0';

// Utility: get latest GitHub release tag
async function getLatestVersion() {
  try {
    const res = await axios.head('https://github.com/ModdGodd/NitrogenFork/releases/latest', {
      maxRedirects: 0,
      validateStatus: status => status >= 200 && status < 400
    });
    const finalUrl = res.headers.location || res.request.res.responseUrl;
    const match = /\/tag\/(.+)$/.exec(finalUrl);
    return match ? match[1] : null;
  } catch (err) {
    console.error('Error fetching version:', err);
    return null;
  }
}

// Show update prompt if newer version is available
async function checkForUpdates() {
  const latest = await getLatestVersion();
  if (latest && latest > BACKEND_VERSION) {
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Nitrogen Update Available',
      message: `New version available!\nCurrent: ${BACKEND_VERSION}\nLatest: ${latest}`,
      buttons: ['Install Update', 'Not Now'],
      defaultId: 0
    });
    if (response === 0) {
      exec(
        'curl -fsSL https://raw.githubusercontent.com/ModdGodd/NitrogenFork/refs/heads/main/install.sh | bash',
        (err) => {
          if (err) console.error('Install error:', err);
          dialog
            .showMessageBox(mainWindow, {
              type: 'info',
              title: 'Update Complete',
              message: `Updated to ${latest}. Please restart.`
            })
            .then(() => app.quit());
        }
      );
    }
  }
}

// Create the main BrowserWindow
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.once('ready-to-show', () => checkForUpdates());
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());

// ------- API Class and IPC Handlers -------
class API {
  constructor() {
    this.dir = path.join(os.homedir(), 'Documents', 'Nitrogen');
    this.scriptsDir = path.join(this.dir, 'scripts');
    this.autoDir = path.join(os.homedir(), 'Hydrogen', 'autoexecute');
    this.logRate = 0.5;
    this.logTimer = null;
    [this.dir, this.scriptsDir, this.autoDir].forEach((d) => {
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    });
  }

  async executeScript(content) {
    const START = 6969;
    const END = 7069;
    let port = null;

    for (let p = START; p <= END; p++) {
      try {
        const r = await axios.get(`http://127.0.0.1:${p}/secret`);
        if (r.status === 200 && r.data === '0xdeadbeef') {
          port = p;
          break;
        }
      } catch {
        // ignore
      }
    }

    if (!port) {
      return { status: 'error', message: 'Ports not detected—ensure Roblox + Hydrogen are running.' };
    }

    try {
      const r = await axios.post(
        `http://127.0.0.1:${port}/execute`,
        content,
        { headers: { 'Content-Type': 'text/plain' } }
      );
      if (r.status === 200) {
        return { status: 'success', message: 'Script executed successfully' };
      }
      throw new Error(`HTTP ${r.status}`);
    } catch (e) {
      return { status: 'error', message: e.message };
    }
  }

  async getScripts(query) {
    const base = 'https://scriptblox.com/api/script';
    const url = query
      ? `${base}/search?q=${encodeURIComponent(query)}`
      : `${base}/fetch`;
    const r = await axios.get(url);
    return r.data;
  }

  async openRoblox() {
    return new Promise((resolve) => {
      exec('open -a Roblox', (err) => {
        if (err) resolve({ status: 'error', message: err.message });
        else resolve({ status: 'success', message: 'Roblox opened' });
      });
    });
  }

  async saveScript(name, content, autoExec) {
    if (!name.endsWith('.lua')) name += '.lua';
    name = path.basename(name).replace(/[^\w ._-]/g, '');
    const filePath = path.join(this.scriptsDir, name);
    await fsPromises.writeFile(filePath, content);

    const autoPath = path.join(this.autoDir, name);
    if (autoExec) {
      await fsPromises.writeFile(autoPath, content);
    } else if (fs.existsSync(autoPath)) {
      await fsPromises.unlink(autoPath);
    }

    return { status: 'success', path: filePath, autoExec };
  }

  async toggleAutoExec(name, enabled) {
    const src = path.join(this.scriptsDir, name);
    const dst = path.join(this.autoDir, name);
    if (!fs.existsSync(src)) {
      return { status: 'error', message: 'Script file not found' };
    }
    if (enabled) {
      await fsPromises.copyFile(src, dst);
    } else if (fs.existsSync(dst)) {
      await fsPromises.unlink(dst);
    }
    return { status: 'success', message: `AutoExec ${enabled ? 'enabled' : 'disabled'}` };
  }

  async getLocalScripts() {
    const files = await fsPromises.readdir(this.scriptsDir);
    const scripts = [];

    for (const f of files.filter((f) => f.endsWith('.lua'))) {
      const content = await fsPromises.readFile(path.join(this.scriptsDir, f), 'utf-8');
      scripts.push({
        name: f,
        content,
        autoExec: fs.existsSync(path.join(this.autoDir, f))
      });
    }

    return { status: 'success', scripts };
  }

  async deleteScript(name) {
    const p = path.join(this.scriptsDir, name);
    if (!fs.existsSync(p)) {
      return { status: 'error', message: 'Script not found' };
    }
    await fsPromises.unlink(p);

    const a = path.join(this.autoDir, name);
    if (fs.existsSync(a)) {
      await fsPromises.unlink(a);
    }

    return { status: 'success' };
  }

  async renameScript(oldName, newName) {
    if (!newName.endsWith('.lua')) newName += '.lua';
    newName = path.basename(newName).replace(/[^\w ._-]/g, '');

    const oldPath = path.join(this.scriptsDir, oldName);
    const newPath = path.join(this.scriptsDir, newName);
    if (!fs.existsSync(oldPath)) {
      return { status: 'error', message: 'Original script not found' };
    }
    if (fs.existsSync(newPath) && oldName !== newName) {
      return { status: 'error', message: 'Target script already exists' };
    }

    await fsPromises.rename(oldPath, newPath);

    const oldAuto = path.join(this.autoDir, oldName);
    const newAuto = path.join(this.autoDir, newName);
    if (fs.existsSync(oldAuto)) {
      await fsPromises.copyFile(oldAuto, newAuto);
      await fsPromises.unlink(oldAuto);
    }

    return { status: 'success' };
  }

  startLogMonitoring(event) {
    if (this.logTimer) {
      return event.sender.send('log-response', { status: 'already_running' });
    }

    const logDir = path.join(os.homedir(), 'Library', 'Logs', 'Roblox');
    let lastSize = 0;

    this.logTimer = setInterval(() => {
      try {
        const files = fs
          .readdirSync(logDir)
          .filter((f) => fs.statSync(path.join(logDir, f)).isFile());
        if (!files.length) return;

        files.sort(
          (a, b) =>
            fs.statSync(path.join(logDir, b)).mtimeMs -
            fs.statSync(path.join(logDir, a)).mtimeMs
        );
        const latest = path.join(logDir, files[0]);
        const stat = fs.statSync(latest);

        if (stat.size > lastSize) {
          const buffer = Buffer.alloc(stat.size - lastSize);
          const fd = fs.openSync(latest, 'r');
          fs.readSync(fd, buffer, 0, buffer.length, lastSize);
          fs.closeSync(fd);
          lastSize = stat.size;

          const lines = buffer
            .toString('utf-8')
            .split(/\r?\n/)
            .filter((l) => l);
          event.sender.send('log-update', lines);
        }
      } catch (e) {
        // Ignore read errors
      }
    }, this.logRate * 1000);

    event.sender.send('log-response', { status: 'success' });
  }

  stopLogMonitoring(event) {
    if (this.logTimer) {
      clearInterval(this.logTimer);
      this.logTimer = null;
    }
    event.sender.send('log-response', { status: 'success' });
  }

  setLogRefreshRate(event, rate) {
    const r = Math.min(Math.max(parseFloat(rate), 0.1), 5.0);
    this.logRate = r;
    event.sender.send('log-response', { status: 'success', rate: r });
  }

  quitApp() {
    return app.quit();
  }

  minimizeApp() {
    return mainWindow.hide();
  }
}

const api = new API();

// Register IPC handlers
ipcMain.handle('execute-script', (_, content) => api.executeScript(content));
ipcMain.handle('get-scripts', (_, q) => api.getScripts(q));
ipcMain.handle('open-roblox', () => api.openRoblox());
ipcMain.handle('save-script', (_, name, c, auto) => api.saveScript(name, c, auto));
ipcMain.handle('toggle-autoexec', (_, n, e) => api.toggleAutoExec(n, e));
ipcMain.handle('get-local-scripts', () => api.getLocalScripts());
ipcMain.handle('delete-script', (_, n) => api.deleteScript(n));
ipcMain.handle('rename-script', (_, o, n) => api.renameScript(o, n));
ipcMain.on('start-log-monitoring', (e) => api.startLogMonitoring(e));
ipcMain.on('stop-log-monitoring', (e) => api.stopLogMonitoring(e));
ipcMain.on('set-log-refresh-rate', (e, r) => api.setLogRefreshRate(e, r));
ipcMain.handle('quit-app', () => api.quitApp());
ipcMain.handle('minimize-app', () => api.minimizeApp());

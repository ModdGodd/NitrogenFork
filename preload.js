const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  executeScript: script => ipcRenderer.invoke('execute-script', script),
  getScripts: q      => ipcRenderer.invoke('get-scripts', q),
  openRoblox: ()     => ipcRenderer.invoke('open-roblox'),
  saveScript: (n,c,a)=> ipcRenderer.invoke('save-script', n, c, a),
  toggleAutoExec: (n,e) => ipcRenderer.invoke('toggle-autoexec', n, e),
  getLocalScripts: () => ipcRenderer.invoke('get-local-scripts'),
  deleteScript: n => ipcRenderer.invoke('delete-script', n),
  renameScript: (o,n) => ipcRenderer.invoke('rename-script', o, n),
  startLogMonitoring: ()  => ipcRenderer.send('start-log-monitoring'),
  stopLogMonitoring: ()   => ipcRenderer.send('stop-log-monitoring'),
  setLogRefreshRate: r    => ipcRenderer.send('set-log-refresh-rate', r),
  onLogUpdate: cb         => ipcRenderer.on('log-update', (_,lines) => cb(lines)),
  quitApp: ()             => ipcRenderer.invoke('quit-app'),
  minimizeApp: ()         => ipcRenderer.invoke('minimize-app'),
});

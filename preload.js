const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    executeScript: (code) => ipcRenderer.invoke('execute-script', code),
    getLocalScripts: () => ipcRenderer.invoke('get-local-scripts'),
    toggleAutoExec: (name, enabled) => ipcRenderer.invoke('toggle-autoexec', { name, enabled }),
    getScripts: (term) => ipcRenderer.invoke('get-scripts', term),
    startLogMonitoring: () => ipcRenderer.send('start-log-monitoring')
});

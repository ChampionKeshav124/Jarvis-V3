// ═══════════════════════════════════════════════════════════════
//  JARVIS V2 — Preload Script
//  Secure contextBridge API for the renderer process
// ═══════════════════════════════════════════════════════════════

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jarvis', {
  /** Send a command to the Python AI backend — returns { response, action, audio_base64 } */
  sendCommand: (payload) => ipcRenderer.invoke('send-command', payload),

  /** Get real CPU/RAM stats from the OS — returns { cpu, ram } */
  getSystemStats: () => ipcRenderer.invoke('get-system-stats'),

  /** Frameless window controls */
  minimize: () => ipcRenderer.send('win-minimize'),
  maximize: () => ipcRenderer.send('win-maximize'),
  close:    () => ipcRenderer.send('win-close'),
});

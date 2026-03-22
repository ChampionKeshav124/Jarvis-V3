// ═══════════════════════════════════════════════════════════════
//  JARVIS V2 — Electron Main Process
//  BYTEFORGE SYSTEM
//  Manages window lifecycle, Python IPC bridge, and system stats
// ═══════════════════════════════════════════════════════════════

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

let mainWindow;

// ── Window Creation ─────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 720,
    minWidth: 820,
    minHeight: 620,
    frame: false,
    transparent: false,
    backgroundColor: '#06060a',
    title: 'JARVIS V3',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── Python Bridge ───────────────────────────────────────────
// Spawns python/jarvis.py per command and returns JSON response
ipcMain.handle('send-command', async (_event, payload) => {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, 'python', 'jarvis.py');
    const { text, voice } = payload;
    
    let args = [scriptPath, text];
    if (voice) args.push('--voice');

    const proc = spawn('python', args, {
      cwd: path.join(__dirname, 'python'),
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (stderr) console.error('[Python stderr]', stderr);
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        resolve({
          response: stdout.trim() || 'I encountered an internal processing error.',
          action: null,
        });
      }
    });

    proc.on('error', (err) => {
      console.error('[Spawn Error]', err.message);
      resolve({
        response: 'Failed to reach AI core. Ensure Python is installed and accessible.',
        action: null,
      });
    });

    // 30-second timeout
    setTimeout(() => {
      proc.kill();
      resolve({ response: 'Request timed out. AI core unresponsive.', action: null });
    }, 30000);
  });
});

// ── Real System Stats ───────────────────────────────────────
// Returns actual CPU and RAM usage from the OS
ipcMain.handle('get-system-stats', async () => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const ramPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);

  // CPU usage: compare idle vs total over a 500ms sample
  const cpuPercent = await new Promise((resolve) => {
    const cpus1 = os.cpus();
    setTimeout(() => {
      const cpus2 = os.cpus();
      let idleDiff = 0, totalDiff = 0;
      for (let i = 0; i < cpus2.length; i++) {
        const t1 = cpus1[i].times, t2 = cpus2[i].times;
        const total1 = t1.user + t1.nice + t1.sys + t1.idle + t1.irq;
        const total2 = t2.user + t2.nice + t2.sys + t2.idle + t2.irq;
        idleDiff += t2.idle - t1.idle;
        totalDiff += total2 - total1;
      }
      resolve(totalDiff === 0 ? 0 : Math.round(100 - (idleDiff / totalDiff) * 100));
    }, 500);
  });

  return { cpu: cpuPercent, ram: ramPercent };
});

// ── Window Controls (frameless) ─────────────────────────────
ipcMain.on('win-minimize', () => mainWindow?.minimize());
ipcMain.on('win-maximize', () => {
  if (mainWindow) mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on('win-close', () => mainWindow?.close());

// ── App Lifecycle ───────────────────────────────────────────
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

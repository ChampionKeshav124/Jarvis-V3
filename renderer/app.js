// ═══════════════════════════════════════════════════════════════
//  JARVIS V2 — Renderer Logic
//  UI interactions, typing effects, system stats, command dispatch
// ═══════════════════════════════════════════════════════════════

const input       = document.getElementById('commandInput');
const sendBtn     = document.getElementById('sendBtn');
const panel       = document.getElementById('responsePanel');
const statusBadge = document.getElementById('statusBadge');
const statusText  = document.getElementById('statusText');
const cpuBar      = document.getElementById('cpuBar');
const ramBar      = document.getElementById('ramBar');
const cpuValue    = document.getElementById('cpuValue');
const ramValue    = document.getElementById('ramValue');
const systemStatus = document.getElementById('systemStatus');
const clockDisplay = document.getElementById('clockDisplay');
const btnVoiceToggle = document.getElementById('btnVoiceToggle');
const voiceLabel = document.getElementById('voiceLabel');
const voiceIcon = document.querySelector('.voice-icon');
const reactorWrapper = document.querySelector('.reactor-wrapper');
const speakingLabel = document.getElementById('speakingLabel');

let isProcessing = false;
let voiceEnabled = true;
let currentAudio = null;

// ── Send Command ────────────────────────────────────────────
async function sendCommand(overrideText = null, isStartup = false) {
  const text = overrideText || input.value.trim();
  if (!text || isProcessing) return;

  // Show user message visually unless it's a silent startup
  if (!isStartup) {
    appendMessage('USER >', text, 'user');
    input.value = '';
  }
  
  setProcessing(true);

  // Stop any currently playing audio
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  // Show loading indicator
  let loadingEl = null;
  if (!isStartup) {
    loadingEl = appendLoading();
  }

  try {
    const result = await window.jarvis.sendCommand({ 
      text: text, 
      voice: voiceEnabled 
    });

    // Remove loading indicator
    if (loadingEl) loadingEl.remove();

    // Handle actions from Python (e.g., "exit" closes the app)
    if (result.action === 'exit') {
      appendMessage('JARVIS >', result.response, 'system');
      if (result.audio_base64) playAudio(result.audio_base64);
      setTimeout(() => window.jarvis.close(), 2500);
      return;
    }

    // Type out the response and play audio simultaneously
    if (result.audio_base64) playAudio(result.audio_base64);
    await typeMessage('JARVIS >', result.response || 'No response received.', 'system');

  } catch (err) {
    if (loadingEl) loadingEl.remove();
    appendMessage('SYSTEM >', 'Communication with AI core failed.', 'error');
  }

  setProcessing(false);
}

// ── Audio Playback ──────────────────────────────────────────
function playAudio(base64Data) {
  try {
    const audioSrc = 'data:audio/mpeg;base64,' + base64Data;
    currentAudio = new Audio(audioSrc);
    
    // Add speaking indicator
    currentAudio.onplay = () => {
      document.body.classList.add('speaking-active');
    };
    currentAudio.onended = () => {
      document.body.classList.remove('speaking-active');
      currentAudio = null;
    };
    currentAudio.onerror = () => {
      document.body.classList.remove('speaking-active');
      currentAudio = null;
    };

    currentAudio.play().catch(e => {
      console.error("Audio playback blocked or failed:", e);
      document.body.classList.remove('speaking-active');
    });
  } catch (err) {
    console.error("Failed to parse audio base64:", err);
  }
}

// ── Event Listeners ─────────────────────────────────────────
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendCommand();
});

sendBtn.addEventListener('click', () => sendCommand());

btnVoiceToggle.addEventListener('click', () => {
  voiceEnabled = !voiceEnabled;
  if (voiceEnabled) {
    btnVoiceToggle.classList.remove('voice-toggle--off');
    btnVoiceToggle.classList.add('voice-toggle--on');
    voiceLabel.textContent = 'VOICE ON';
    voiceIcon.textContent = '🔊';
  } else {
    btnVoiceToggle.classList.remove('voice-toggle--on');
    btnVoiceToggle.classList.add('voice-toggle--off');
    voiceLabel.textContent = 'VOICE OFF';
    voiceIcon.textContent = '🔇';
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
  }
});

// Window controls
document.getElementById('btnMinimize').addEventListener('click', () => window.jarvis.minimize());
document.getElementById('btnMaximize').addEventListener('click', () => window.jarvis.maximize());
document.getElementById('btnClose').addEventListener('click', () => window.jarvis.close());

// ── Append Message (instant) ────────────────────────────────
function appendMessage(prefix, text, type) {
  const msg = document.createElement('div');
  msg.className = `response-message response-message--${type}`;
  msg.innerHTML = `
    <span class="response-prefix">${escapeHtml(prefix)}</span>
    <span class="response-text">${escapeHtml(text)}</span>
  `;
  panel.appendChild(msg);
  panel.scrollTop = panel.scrollHeight;
  return msg;
}

// ── Typing Effect ───────────────────────────────────────────
async function typeMessage(prefix, text, type) {
  const msg = document.createElement('div');
  msg.className = `response-message response-message--${type}`;

  const prefixSpan = document.createElement('span');
  prefixSpan.className = 'response-prefix';
  prefixSpan.textContent = prefix;

  const textSpan = document.createElement('span');
  textSpan.className = 'response-text';

  const cursor = document.createElement('span');
  cursor.className = 'typing-cursor';

  msg.appendChild(prefixSpan);
  msg.appendChild(textSpan);
  msg.appendChild(cursor);
  panel.appendChild(msg);

  // Type character-by-character
  const chars = text.split('');
  const speed = Math.max(8, Math.min(30, 1200 / chars.length)); // adaptive speed

  for (let i = 0; i < chars.length; i++) {
    textSpan.textContent += chars[i];
    panel.scrollTop = panel.scrollHeight;
    await sleep(speed);
  }

  cursor.remove();
  panel.scrollTop = panel.scrollHeight;
}

// ── Loading Dots ────────────────────────────────────────────
function appendLoading() {
  const msg = document.createElement('div');
  msg.className = 'response-message response-message--system';
  msg.innerHTML = `
    <span class="response-prefix">JARVIS &gt;</span>
    <span class="loading-dots"><span></span><span></span><span></span></span>
  `;
  panel.appendChild(msg);
  panel.scrollTop = panel.scrollHeight;
  return msg;
}

// ── Status Toggle ───────────────────────────────────────────
function setProcessing(state) {
  isProcessing = state;
  if (state) {
    statusBadge.classList.add('processing');
    statusText.textContent = 'PROCESSING';
    systemStatus.textContent = 'PROCESSING';
    systemStatus.style.color = '#ffaa00';
    input.disabled = true;
  } else {
    statusBadge.classList.remove('processing');
    statusText.textContent = 'ONLINE';
    systemStatus.textContent = 'ACTIVE';
    systemStatus.style.color = '';
    input.disabled = false;
    input.focus();
  }
}

// ── Real System Stats (from Node.js os module) ──────────────
async function updateStats() {
  try {
    const stats = await window.jarvis.getSystemStats();
    cpuBar.style.width = stats.cpu + '%';
    ramBar.style.width = stats.ram + '%';
    cpuValue.textContent = stats.cpu + '%';
    ramValue.textContent = stats.ram + '%';

    // Color shift when high usage
    cpuBar.style.background = stats.cpu > 80
      ? 'linear-gradient(90deg, #ff3a3a, #ff8800)'
      : '';
    ramBar.style.background = stats.ram > 80
      ? 'linear-gradient(90deg, #ff3a3a, #ff8800)'
      : '';
  } catch {
    // Silently continue
  }
}

// Update stats every 3 seconds
setInterval(updateStats, 3000);
updateStats();

// ── Live Clock ──────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  clockDisplay.textContent = `${h}:${m}:${s}`;
}

setInterval(updateClock, 1000);
updateClock();

// ── Utilities ───────────────────────────────────────────────
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Auto-focus and Startup ──────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  input.focus();
  
  // Fire startup greeting silently to trigger voice line
  setTimeout(() => {
    sendCommand("__system_startup__", true);
  }, 800);
});

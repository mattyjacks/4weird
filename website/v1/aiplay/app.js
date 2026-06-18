/* ==========================================================================
   4WEIRD AIPLAY REDESIGN - CORE APPLICATION LOGIC
   ========================================================================== */

(function() {
  // Application State
  const state = {
    isRunning: false,
    isPaused: false,
    gameLoaded: false,
    maxSteps: 100,
    currentStep: 0,
    intervalMs: 1500,
    elapsedSeconds: 0,
    apm: 0,
    bugs: [],
    logs: [],
    fpsHistory: Array(15).fill(60),
    heapHistory: Array(15).fill(40),
    loopTimer: null,
    metricsTimer: null,
    audioEnabled: true,
    lastActionTime: Date.now(),
    actionCount: 0
  };

  // Preset bugs for mock simulator simulation
  const mockBugPool = [
    {
      type: "EXCEPTION",
      desc: "Uncaught TypeError: Cannot read property 'update' of undefined",
      stack: "TypeError: Cannot read property 'update' of undefined\n  at Player.update (player.js:45:18)\n  at Game.tick (game.js:120:10)\n  at requestAnimationFrame (loop.js:12:4)",
      img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23110000'/><text x='50%23' y='50%23' dominant-baseline='middle' text-anchor='middle' font-family='monospace' fill='%23ff3333' font-size='16'>CRASH: TypeError in player.js</text></svg>"
    },
    {
      type: "PERFORMANCE",
      desc: "Severe Frame stutter: FPS dropped below 15 frames/sec",
      stack: "Warning: Long running script block took 128ms on requestAnimationFrame.\n  at PhysicsEngine.resolveCollisions (physics.js:98:20)\n  at Game.tick (game.js:115:8)",
      img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23050200'/><text x='50%23' y='50%23' dominant-baseline='middle' text-anchor='middle' font-family='monospace' fill='%23ffaa00' font-size='16'>FPS SPIKE: physics.js bottleneck</text></svg>"
    },
    {
      type: "SECURITY",
      desc: "Cross-Origin request blocked: Access-Control-Allow-Origin missing",
      stack: "Fetch API Error: CORS preflight channel rejected http://api.internal/metrics\n  at Analytics.post (analytics.js:14:5)",
      img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23110011'/><text x='50%23' y='50%23' dominant-baseline='middle' text-anchor='middle' font-family='monospace' fill='%23ff00ff' font-size='16'>CORS BLOCKED: api.internal</text></svg>"
    }
  ];

  // DOM Elements cache
  const el = {};

  // Audio Synthesizer (Web Audio API oscillator helper)
  const synth = {
    ctx: null,
    init() {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
    },
    play(freq, type = 'sine', duration = 0.08, volume = 0.05) {
      if (!state.audioEnabled) return;
      try {
        this.init();
        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {
        console.warn("Synth audio blocked or failed", e);
      }
    },
    playSuccess() {
      this.play(880, 'sine', 0.1, 0.06);
      setTimeout(() => this.play(1320, 'sine', 0.15, 0.04), 80);
    },
    playFail() {
      this.play(220, 'sawtooth', 0.2, 0.08);
      setTimeout(() => this.play(110, 'sawtooth', 0.25, 0.08), 120);
    },
    playClick() {
      this.play(600, 'triangle', 0.04, 0.08);
    },
    playLog() {
      this.play(1200, 'sine', 0.02, 0.02);
    }
  };

  // Cache DOM nodes on load
  function initDOM() {
    el.gameTarget = document.getElementById('game-target');
    el.btnLoad = document.getElementById('btn-load');
    el.presetGames = document.getElementById('preset-games');
    el.agentModel = document.getElementById('agent-model');
    el.testRules = document.getElementById('test-rules');
    el.maxSteps = document.getElementById('max-steps');
    el.stepInterval = document.getElementById('step-interval');
    el.btnStart = document.getElementById('btn-start');
    el.btnPause = document.getElementById('btn-pause');
    el.btnStop = document.getElementById('btn-stop');
    
    el.gameIframe = document.getElementById('game-iframe');
    el.btnReloadGame = document.getElementById('btn-reload-game');
    el.btnMuteGame = document.getElementById('btn-mute-game');
    
    el.terminalLog = document.getElementById('terminal-log');
    el.terminalInput = document.getElementById('terminal-input');
    el.btnClearTerminal = document.getElementById('btn-clear-terminal');
    
    el.valFps = document.getElementById('val-fps');
    el.valHeap = document.getElementById('val-heap');
    el.chartFps = document.getElementById('chart-fps');
    el.chartHeap = document.getElementById('chart-heap');
    
    el.statElapsed = document.getElementById('stat-elapsed');
    el.statSteps = document.getElementById('stat-steps');
    el.statApm = document.getElementById('stat-apm');
    el.bugCounter = document.getElementById('bug-counter');
    el.bugListContainer = document.getElementById('bug-list-container');
    el.btnViewReport = document.getElementById('btn-view-report');
    
    el.reportModal = document.getElementById('report-modal');
    el.btnCloseReport = document.getElementById('btn-close-report');
    el.repSteps = document.getElementById('rep-steps');
    el.repBugs = document.getElementById('rep-bugs');
    el.repFps = document.getElementById('rep-fps');
    el.repDuration = document.getElementById('rep-duration');
    el.repBugListDetails = document.getElementById('rep-bug-list-details');
    el.btnExportJson = document.getElementById('btn-export-json');
    el.btnExportPdf = document.getElementById('btn-export-pdf');
    
    el.bugModal = document.getElementById('bug-modal');
    el.btnCloseBug = document.getElementById('btn-close-bug');
    el.bugDetailTitle = document.getElementById('bug-detail-title');
    el.bugDetailTime = document.getElementById('bug-detail-time');
    el.bugDetailDesc = document.getElementById('bug-detail-desc');
    el.bugDetailStack = document.getElementById('bug-detail-stack');
    el.bugDetailImg = document.getElementById('bug-detail-img');
    el.btnSolveMega = document.getElementById('btn-solve-mega');
    
    el.agentStateDot = document.getElementById('agent-state-dot');
    el.agentStateText = document.getElementById('agent-state-text');
    el.audioToggle = document.getElementById('audio-toggle');
    el.systemTime = document.getElementById('system-time');
    el.originWarning = document.getElementById('origin-warning');
    el.btnWarningDismiss = document.getElementById('btn-warning-dismiss');
  }

  // System log printing
  function log(message, type = 'system') {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    const div = document.createElement('div');
    div.className = `term-line ${type}`;
    div.innerHTML = `<span style="opacity: 0.4;">[${time}]</span> [${type.toUpperCase()}] ${message}`;
    
    el.terminalLog.appendChild(div);
    el.terminalLog.scrollTop = el.terminalLog.scrollHeight;
    
    state.logs.push({ time, type, message });
    if (type !== 'system') {
      synth.playLog();
    }
  }

  // Draw Performance Sparkline Spark charts
  function drawSparkline(canvas, data, isRed = false) {
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const margin = 2;
    const w = canvas.width;
    const h = canvas.height;
    const count = data.length;
    const step = (w - margin * 2) / (count - 1);
    
    ctx.strokeStyle = isRed ? '#ff3333' : '#00ff66';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    
    const minVal = Math.min(...data) - 5;
    const maxVal = Math.max(...data) + 5;
    const valRange = (maxVal - minVal) || 1;
    
    data.forEach((val, i) => {
      const x = margin + i * step;
      const y = h - margin - ((val - minVal) / valRange) * (h - margin * 2);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  }

  // Update real-time stats
  function updatePerformanceMetrics() {
    // Simulate natural fluctuation
    let currentFps = 58 + Math.floor(Math.random() * 5);
    if (state.isRunning && !state.isPaused) {
      if (Math.random() < 0.08) currentFps -= 25; // Simulate periodic frame drop
    }
    
    let currentHeap = 38.2 + (state.currentStep * 0.4) + (Math.random() * 1.5);
    if (state.currentStep > 40 && Math.random() < 0.1) {
      log("Garbage Collector invoked. Recycled heaps.", "info");
      currentHeap = 39.1;
    }
    
    el.valFps.textContent = currentFps;
    el.valHeap.textContent = currentHeap.toFixed(1) + ' MB';
    
    // Manage history size
    state.fpsHistory.shift();
    state.fpsHistory.push(currentFps);
    state.heapHistory.shift();
    state.heapHistory.push(currentHeap);
    
    // Draw charts
    drawSparkline(el.chartFps, state.fpsHistory, currentFps < 40);
    drawSparkline(el.chartHeap, state.heapHistory, false);
    
    // APM Calculate
    if (state.isRunning && !state.isPaused) {
      state.elapsedSeconds++;
      const min = state.elapsedSeconds / 60 || 1;
      state.apm = Math.round(state.actionCount / min);
      
      const mm = String(Math.floor(state.elapsedSeconds / 60)).padStart(2, '0');
      const ss = String(state.elapsedSeconds % 60).padStart(2, '0');
      el.statElapsed.textContent = `${mm}:${ss}`;
      el.statApm.textContent = state.apm;
    }
  }

  // Execute Agent Automation Step
  function executeAgentStep() {
    if (state.currentStep >= state.maxSteps) {
      stopTesting();
      log("Test Run limit reached.", "system");
      return;
    }

    state.currentStep++;
    state.actionCount++;
    el.statSteps.textContent = `${state.currentStep} / ${state.maxSteps}`;

    // Perform target action simulations
    const actionTypes = ["click", "press_key", "scroll", "wait"];
    const action = actionTypes[Math.floor(Math.random() * actionTypes.length)];
    
    let actionLogStr = "";
    if (action === "click") {
      const rx = Math.floor(Math.random() * 600) + 100;
      const ry = Math.floor(Math.random() * 400) + 50;
      actionLogStr = `Simulated Left-Click at relative coordinates: [x: ${rx}, y: ${ry}]`;
      synth.play(600, 'sine', 0.03, 0.05);
    } else if (action === "press_key") {
      const keys = ["ArrowUp", "ArrowLeft", "ArrowRight", "Space", "Enter"];
      const key = keys[Math.floor(Math.random() * keys.length)];
      actionLogStr = `Simulated Keyboard press: '${key}'`;
      synth.play(800, 'triangle', 0.04, 0.04);
    } else if (action === "scroll") {
      actionLogStr = `Simulated Scroll down - deltaY: 120`;
      synth.play(400, 'sine', 0.05, 0.03);
    } else {
      actionLogStr = `Wait state. Sleeping agent for 1500ms...`;
    }

    log(actionLogStr, "info");

    // Check for random bugs / console error simulations
    const bugRate = parseFloat(el.agentModel.value.includes("flash") ? 0.05 : 0.03);
    if (Math.random() < bugRate && state.bugs.length < 5) {
      triggerDetectedBug();
    }
  }

  // Handle triggered bugs
  function triggerDetectedBug() {
    const rawBug = mockBugPool[Math.floor(Math.random() * mockBugPool.length)];
    
    // Check duplication
    if (state.bugs.some(b => b.desc === rawBug.desc)) return;

    const timestamp = new Date().toLocaleTimeString([], { hour12: false });
    const bug = {
      id: "BUG-" + String(state.bugs.length + 1).padStart(3, '0'),
      type: rawBug.type,
      desc: rawBug.desc,
      stack: rawBug.stack,
      img: rawBug.img,
      time: timestamp
    };
    
    state.bugs.push(bug);
    synth.playFail();
    
    // Update counter
    el.bugCounter.textContent = state.bugs.length;
    
    // Render list card
    if (state.bugs.length === 1) {
      el.bugListContainer.innerHTML = '';
    }
    
    const card = document.createElement('div');
    card.className = 'bug-card';
    card.innerHTML = `
      <div class="bug-title-row">
        <span class="bug-type">[${bug.type}]</span>
        <span class="bug-time">${bug.time}</span>
      </div>
      <div class="bug-desc">${bug.desc}</div>
    `;
    card.addEventListener('click', () => showBugLightbox(bug));
    
    el.bugListContainer.appendChild(card);
    log(`CRITICAL DEFECT DETECTED: [${bug.id}] - ${bug.desc}`, "error");
  }

  // Display Bug Lightbox Detailed Report
  function showBugLightbox(bug) {
    synth.playClick();
    el.bugDetailTitle.textContent = `DEFECT TELEMETRY DETAIL: ${bug.id}`;
    el.bugDetailTime.textContent = bug.time;
    el.bugDetailDesc.textContent = bug.desc;
    el.bugDetailStack.textContent = bug.stack;
    el.bugDetailImg.src = bug.img;
    
    // Solve button handler
    el.btnSolveMega.onclick = () => {
      synth.playClick();
      const megaPrompt = `[AIPLAY CORE CRASH REPORT]\nID: ${bug.id}\nTimestamp: ${bug.time}\nType: ${bug.type}\nMessage: ${bug.desc}\n\n[Diagnostic Console Trace]\n${bug.stack}\n\nPlease generate a clean patch resolving this error in the target codebase. Analyze call stack files.`;
      navigator.clipboard.writeText(megaPrompt).then(() => {
        alert("Mega-Prompt copied to clipboard! You can paste this to Devin, cursor, or Antigravity to fix the source code.");
      });
    };
    
    el.bugModal.classList.remove('hidden');
  }

  // UI Event Handler Actions
  function selectPreset() {
    synth.playClick();
    const val = el.presetGames.value;
    if (val) {
      el.gameTarget.value = val;
      loadGameTarget();
    }
  }

  function loadGameTarget() {
    synth.playClick();
    const url = el.gameTarget.value.trim();
    if (!url) return;
    
    log(`Loading sandbox iframe target: ${url}`, "system");
    el.gameIframe.src = url;
    state.gameLoaded = true;
    
    // Check CORS issues
    // If it's a cross-origin link, we can catch load exceptions or just display overlay for demo
    if (url.startsWith("http") && !url.includes(window.location.hostname)) {
      el.originWarning.classList.remove('hidden');
    } else {
      el.originWarning.classList.add('hidden');
    }
  }

  // Start Agent Play Loop
  function initiateTesting() {
    synth.playSuccess();
    state.isRunning = true;
    state.isPaused = false;
    state.currentStep = 0;
    state.actionCount = 0;
    state.elapsedSeconds = 0;
    state.bugs = [];
    state.logs = [];
    
    el.bugCounter.textContent = 0;
    el.bugListContainer.innerHTML = '<div class="no-bugs-msg">Monitoring active loops...</div>';
    
    el.maxSteps.disabled = true;
    el.stepInterval.disabled = true;
    el.btnLoad.disabled = true;
    el.presetGames.disabled = true;
    
    el.btnStart.disabled = true;
    el.btnPause.disabled = false;
    el.btnStop.disabled = false;
    el.btnViewReport.disabled = true;
    
    // Set Badge states
    el.agentStateDot.className = "badge-dot pulse-active";
    el.agentStateText.textContent = "ACTIVE PLAY";
    
    state.maxSteps = parseInt(el.maxSteps.value) || 100;
    state.intervalMs = parseInt(el.stepInterval.value) || 1500;
    
    log(`Autonomous testing session initiated. Targets: ${el.gameTarget.value}`, "system");
    log(`Configuring run constraints: maxSteps = ${state.maxSteps}, interval = ${state.intervalMs}ms`, "system");
    
    state.loopTimer = setInterval(executeAgentStep, state.intervalMs);
  }

  // Pause Agent testing
  function pauseTesting() {
    synth.playClick();
    if (state.isPaused) {
      // Resume
      state.isPaused = false;
      el.btnPause.textContent = "⏸ PAUSE";
      el.agentStateDot.className = "badge-dot pulse-active";
      el.agentStateText.textContent = "ACTIVE PLAY";
      log("Testing session resumed.", "system");
      state.loopTimer = setInterval(executeAgentStep, state.intervalMs);
    } else {
      // Pause
      state.isPaused = true;
      el.btnPause.textContent = "▶ RESUME";
      el.agentStateDot.className = "badge-dot pulse-paused";
      el.agentStateText.textContent = "PAUSED";
      log("Testing session suspended.", "system");
      clearInterval(state.loopTimer);
    }
  }

  // Stop testing and generate session summary report
  function stopTesting() {
    synth.playSuccess();
    state.isRunning = false;
    clearInterval(state.loopTimer);
    
    el.maxSteps.disabled = false;
    el.stepInterval.disabled = false;
    el.btnLoad.disabled = false;
    el.presetGames.disabled = false;
    
    el.btnStart.disabled = false;
    el.btnPause.disabled = true;
    el.btnPause.textContent = "⏸ PAUSE";
    el.btnStop.disabled = true;
    el.btnViewReport.disabled = false;
    
    el.agentStateDot.className = "badge-dot pulse-idle";
    el.agentStateText.textContent = "IDLE";
    
    log("Testing session terminated. Report compiled and available.", "system");
  }

  // Report Modal view
  function generateReportSummary() {
    synth.playClick();
    el.repSteps.textContent = state.currentStep;
    el.repBugs.textContent = state.bugs.length;
    
    // Average FPS
    const avg = Math.round(state.fpsHistory.reduce((a, b) => a + b, 0) / state.fpsHistory.length);
    el.repFps.textContent = avg + " FPS";
    el.repDuration.textContent = state.elapsedSeconds + "s";
    
    // Bug details list
    el.repBugListDetails.innerHTML = '';
    if (state.bugs.length === 0) {
      el.repBugListDetails.innerHTML = '<div class="no-bugs-msg">Zero bugs reported! The game passed all test paths.</div>';
    } else {
      state.bugs.forEach(bug => {
        const row = document.createElement('div');
        row.className = 'rep-bug-row';
        row.innerHTML = `
          <div class="rep-bug-meta">
            <span>[${bug.id}] ${bug.type}</span>
            <span>${bug.time}</span>
          </div>
          <div class="rep-bug-desc">${bug.desc}</div>
        `;
        el.repBugListDetails.appendChild(row);
      });
    }
    
    // Generate simple SVG performance path
    const svgW = 400;
    const svgH = 100;
    const stepX = svgW / (state.fpsHistory.length - 1);
    let points = "";
    state.fpsHistory.forEach((fps, idx) => {
      const x = idx * stepX;
      const y = svgH - ((fps - 30) / 30) * svgH;
      points += `${x},${y} `;
    });
    
    el.repFpsChartBox.innerHTML = `
      <svg width="100%" height="100%" viewBox="0 0 400 100" style="background:#010201; border-radius:4px;">
        <polyline fill="none" stroke="#00ff66" stroke-width="2" points="${points}" />
        <text x="10" y="20" fill="#a3ffa3" font-size="10" font-family="monospace">FPS Timeline Log (Max 60, Min 30)</text>
      </svg>
    `;
    
    el.reportModal.classList.remove('hidden');
  }

  // Terminal manual inputs
  function handleTerminalCommand() {
    const raw = el.terminalInput.value.trim();
    if (!raw) return;
    
    el.terminalInput.value = '';
    log(`&gt; ${raw}`, 'info');
    
    // Parse commands
    if (raw.startsWith('/')) {
      const parts = raw.split(' ');
      const cmd = parts[0].toLowerCase();
      
      if (cmd === '/step') {
        synth.playClick();
        executeAgentStep();
      } else if (cmd === '/reload') {
        synth.playClick();
        el.gameIframe.contentWindow.location.reload();
        log("Reloaded game viewport frame", "system");
      } else if (cmd === '/click') {
        const x = parseInt(parts[1]) || 100;
        const y = parseInt(parts[2]) || 100;
        log(`Simulated Manual Pointer Click at [${x}, ${y}]`, "info");
        synth.play(700, 'sine', 0.05, 0.05);
      } else if (cmd === '/state') {
        log(`State Telemetry: APM: ${state.apm} | Bugs: ${state.bugs.length} | Runtime: ${state.elapsedSeconds}s`, "info");
      } else {
        log(`Unknown system command: '${cmd}'. Use /step, /reload, /click [x] [y], or /state`, "warning");
      }
    } else {
      // Echo chat simulator response
      setTimeout(() => {
        log(`AI Interpreter: Standard rule override parsed: '${raw}'`, "info");
      }, 500);
    }
  }

  // Event Listeners setup
  function bindEvents() {
    el.btnLoad.addEventListener('click', loadGameTarget);
    el.presetGames.addEventListener('change', selectPreset);
    el.btnReloadGame.addEventListener('click', () => {
      synth.playClick();
      el.gameIframe.src = el.gameIframe.src;
    });
    
    el.btnMuteGame.addEventListener('click', () => {
      synth.playClick();
      const muted = el.gameIframe.getAttribute('muted') === 'true';
      el.gameIframe.setAttribute('muted', !muted);
      el.btnMuteGame.textContent = muted ? "MUTE" : "UNMUTE";
      log(`Game audio ${muted ? 'enabled' : 'muted'}.`, "system");
    });
    
    el.btnStart.addEventListener('click', initiateTesting);
    el.btnPause.addEventListener('click', pauseTesting);
    el.btnStop.addEventListener('click', stopTesting);
    el.btnViewReport.addEventListener('click', generateReportSummary);
    
    el.btnCloseReport.addEventListener('click', () => el.reportModal.classList.add('hidden'));
    el.btnCloseBug.addEventListener('click', () => el.bugModal.classList.add('hidden'));
    
    el.btnWarningDismiss.addEventListener('click', () => el.originWarning.classList.add('hidden'));
    
    el.btnClearTerminal.addEventListener('click', () => {
      synth.playClick();
      el.terminalLog.innerHTML = '';
      log("Terminal buffer cleared.", "system");
    });
    
    el.terminalInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleTerminalCommand();
      }
    });

    el.audioToggle.addEventListener('click', () => {
      state.audioEnabled = !state.audioEnabled;
      el.audioToggle.textContent = `SOUND: ${state.audioEnabled ? 'ON' : 'OFF'}`;
      if (state.audioEnabled) {
        synth.play(600, 'sine', 0.1);
      }
    });
    
    // Exports
    el.btnExportJson.addEventListener('click', () => {
      synth.playClick();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
      const dl = document.createElement('a');
      dl.setAttribute("href", dataStr);
      dl.setAttribute("download", `aiplay_qa_report_${Date.now()}.json`);
      dl.click();
    });

    el.btnExportPdf.addEventListener('click', () => {
      synth.playClick();
      // Simple CSV export
      let csv = "Timestamp,Type,LogMessage\n";
      state.logs.forEach(l => {
        csv += `"${l.time}","${l.type}","${l.message.replace(/"/g, '""')}"\n`;
      });
      const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
      const dl = document.createElement('a');
      dl.setAttribute("href", dataStr);
      dl.setAttribute("download", `aiplay_qa_logs_${Date.now()}.csv`);
      dl.click();
    });
  }

  // System clock ticker
  function startClock() {
    setInterval(() => {
      const time = new Date().toLocaleTimeString([], { hour12: false });
      el.systemTime.textContent = time;
    }, 1000);
  }

  // Orchestrator entry
  window.addEventListener('DOMContentLoaded', () => {
    initDOM();
    bindEvents();
    startClock();
    
    // Start sparkline ticking loop
    state.metricsTimer = setInterval(updatePerformanceMetrics, 1000);
    
    // Load initial game URL preset
    selectPreset();
  });
})();

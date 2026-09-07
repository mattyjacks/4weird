/* ==========================================================================
   4WEIRD VIBECODEWORKER // WELCOME HUB, GAME PICKER, TEST WEBSITE & PLANNER
   ========================================================================== */

import { state, el, synth } from './core_state.js';
import { log } from './telemetry_logger.js';
import { gamesCatalogue } from './data_store.js';

export class HubManager {
  constructor({ onLoadTarget, onShowViewport }) {
    this.onLoadTarget = onLoadTarget;
    this.onShowViewport = onShowViewport;
    this.selectedWebsiteGoal = 'UI/UX Heuristic Audit: Evaluate usability, font contrast, layout responsiveness, and accessibility dead ends.';
    this.plannerStep = 0;
    this.plannerData = { name: '', mechanic: '', theme: '', goal: '' };
  }

  init() {
    this.renderGamesList();
    this.bindHubEvents();
  }

  renderGamesList() {
    const container = document.getElementById('modal-games-list');
    if (!container) return;
    container.innerHTML = '';

    gamesCatalogue.forEach(game => {
      const card = document.createElement('div');
      card.className = 'hub-modal-game-card';
      card.style.cssText = 'background: rgba(0, 242, 254, 0.05); border: 1px solid var(--border-color); border-radius: 6px; padding: 12px; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; gap: 4px;';
      card.innerHTML = `
        <strong style="color: var(--neon-cyan); font-family: var(--font-mono); font-size: 11px;">${game.title}</strong>
        <span style="color: var(--text-secondary); font-size: 9px; line-height: 1.3;">${game.desc}</span>
        <button class="mini-btn-accent" style="margin-top: 6px; width: 100%;">LAUNCH PLAYTEST ▶</button>
      `;

      card.onmouseenter = () => {
        card.style.borderColor = 'var(--neon-cyan)';
        card.style.boxShadow = '0 0 10px rgba(0, 242, 254, 0.3)';
        card.style.transform = 'translateY(-2px)';
      };
      card.onmouseleave = () => {
        card.style.borderColor = 'var(--border-color)';
        card.style.boxShadow = 'none';
        card.style.transform = 'translateY(0)';
      };

      card.onclick = () => {
        synth.playSuccess();
        this.closeAllModals();
        if (el.gameTarget) el.gameTarget.value = game.path;
        if (typeof this.onLoadTarget === 'function') {
          this.onLoadTarget(game.path);
        }
        this.showEditorView();
        log(`[HUB] Selected game '${game.title}' from catalogue. Viewport active.`, 'info');
      };

      container.appendChild(card);
    });
  }

  bindHubEvents() {
    const cardLoad = document.getElementById('card-load-4weird');
    if (cardLoad) cardLoad.addEventListener('click', () => this.openModal('modal-4weird-games'));

    const cardTest = document.getElementById('card-test-website');
    if (cardTest) cardTest.addEventListener('click', () => this.openModal('modal-test-website'));

    const cardFleet = document.getElementById('card-cloud-fleet');
    if (cardFleet) cardFleet.addEventListener('click', () => this.openModal('modal-cloud-fleet'));

    const cardRandom = document.getElementById('card-random-game');
    if (cardRandom) cardRandom.addEventListener('click', () => this.generateRandomGamePitch());

    const cardPlan = document.getElementById('card-plan-game');
    if (cardPlan) cardPlan.addEventListener('click', () => this.startInteractivePlanner());

    const cardDesktop = document.getElementById('card-desktop-game');
    if (cardDesktop) cardDesktop.addEventListener('click', () => {
      synth.playClick();
      log('[HUB] Native window capture lives in the Electron build — run launch_vibecodeworker.bat to attach to a running Windows game.', 'warning');
    });

    const cardOpen = document.getElementById('card-open-folder');
    if (cardOpen) cardOpen.addEventListener('click', () => {
      synth.playClick();
      const pathInput = prompt('Enter workspace path or local game folder to inspect:', '../games/html/orbitaldrift/index.html');
      if (pathInput) {
        if (el.gameTarget) el.gameTarget.value = pathInput;
        if (typeof this.onLoadTarget === 'function') this.onLoadTarget(pathInput);
        this.showEditorView();
      }
    });

    const closeBtns = [
      { id: 'btn-close-games-modal', modal: 'modal-4weird-games' },
      { id: 'btn-close-website-modal', modal: 'modal-test-website' },
      { id: 'btn-close-fleet-modal', modal: 'modal-cloud-fleet' },
      { id: 'btn-close-pitch', modal: 'pitch-results-panel' },
      { id: 'btn-close-planner', modal: 'modal-game-planner' }
    ];

    closeBtns.forEach(({ id, modal }) => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', () => this.closeModal(modal));
    });

    document.querySelectorAll('.website-goal-btn').forEach(b => {
      b.addEventListener('click', () => {
        synth.playClick();
        document.querySelectorAll('.website-goal-btn').forEach(btn => btn.classList.remove('active'));
        b.classList.add('active');
        this.selectedWebsiteGoal = b.getAttribute('data-goal') || '';
      });
    });

    const btnStartAudit = document.getElementById('btn-start-website-audit');
    if (btnStartAudit) {
      btnStartAudit.addEventListener('click', () => {
        synth.playSuccess();
        const urlInput = document.getElementById('input-custom-website-url');
        const url = (urlInput && urlInput.value.trim()) ? urlInput.value.trim() : 'https://example.com';
        this.closeAllModals();

        if (el.gameTarget) el.gameTarget.value = url;
        if (el.testRules) el.testRules.value = `Objective: Autonomous Web QA Audit.\nGoal: ${this.selectedWebsiteGoal}`;

        if (typeof this.onLoadTarget === 'function') this.onLoadTarget(url);
        this.showEditorView();
        log(`[HUB] Launched Autonomous Web QA against: ${url}`, 'system');
      });
    }

    const btnLoadPitched = document.getElementById('btn-load-pitched-concept');
    if (btnLoadPitched) {
      btnLoadPitched.addEventListener('click', () => {
        synth.playSuccess();
        this.closeAllModals();
        if (el.gameTarget) el.gameTarget.value = '../games/html/orbitaldrift/index.html';
        if (typeof this.onLoadTarget === 'function') this.onLoadTarget('../games/html/orbitaldrift/index.html');
        this.showEditorView();
      });
    }

    if (el.btnGotoHub) {
      el.btnGotoHub.addEventListener('click', () => {
        synth.playClick();
        this.showHubView();
      });
    }

    const hubNavBtn = document.getElementById('btn-top-hub');
    if (hubNavBtn) {
      hubNavBtn.addEventListener('click', () => {
        synth.playClick();
        this.showHubView();
      });
    }
  }

  showHubView() {
    state.currentView = 'hub';
    if (el.hubWorkspace) el.hubWorkspace.classList.remove('hidden');
    if (el.mainLayout) el.mainLayout.classList.add('hub-active');
    this.closeAllModals();
  }

  showEditorView() {
    state.currentView = 'editor';
    if (el.hubWorkspace) el.hubWorkspace.classList.add('hidden');
    if (el.mainLayout) el.mainLayout.classList.remove('hub-active');
  }

  openModal(modalId) {
    synth.playClick();
    this.closeAllModals();
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('hidden');
  }

  closeModal(modalId) {
    synth.playClick();
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
  }

  closeAllModals() {
    ['modal-4weird-games', 'modal-test-website', 'modal-cloud-fleet', 'pitch-results-panel', 'modal-game-planner'].forEach(id => {
      const m = document.getElementById(id);
      if (m) m.classList.add('hidden');
    });
  }

  generateRandomGamePitch() {
    synth.playSuccess();
    const names = ['CyberDrift 2099', 'Neon Glitch Runner', 'VaporVoid Entanglement', 'Sub-Orbital Fuzz', 'Neural Swarm Tactics', 'Zero Gravity Rogue'];
    const mechanics = ['Velocity-Vector Dash', 'Time-Dilation Bullet Dodge', 'Reverse Polar Gravity Jump', 'Quantum Entanglement Switch', 'Light Frequency Friction Boost'];
    const themes = ['Cyberpunk Neon Metropolis', 'Deep Orbit Space Station', 'Underwater Hydro-Grid', 'Synthwave Wireframe Arena', 'Post-Singularity AI Core'];

    const name = names[Math.floor(Math.random() * names.length)];
    const mechanic = mechanics[Math.floor(Math.random() * mechanics.length)];
    const theme = themes[Math.floor(Math.random() * themes.length)];

    const nameEl = document.getElementById('pitch-game-name');
    const descEl = document.getElementById('pitch-game-desc');
    const braidEl = document.getElementById('pitch-braid-diagram');

    if (nameEl) nameEl.textContent = name;
    if (descEl) descEl.innerHTML = `<strong>Theme:</strong> ${theme}<br><strong>Core Mechanic:</strong> ${mechanic}<br><strong>Platform:</strong> HTML5 Canvas (60 FPS)<br><strong>Rules:</strong> High-speed input fuzzing, spatial boundary collision detection, and auto-restart loops.`;
    if (braidEl) {
      braidEl.textContent = `(S_START) Start Agent Loop
 ├─ [State Check] ──> Is Game Over?
 │     ├─ [Yes] ──> (A_RESTART) Wait 1000ms -> Click center screen or press space -> Transition to (S_PLAY)
 │     └─ [No] ───> Is Menu visible?
 │           ├─ [Yes] ──> (A_START_GAME) Click "Start Game" coordinates -> Transition to (S_PLAY)
 │           └─ [No] ───> Continue to Core Play Loop (S_PLAY)
 │
 ├─ [Hazard Matrix Scan] ──> Is Hazard detected in close radius (< 150px)?
 │     ├─ [Yes] ──> (R_EVADE) Apply lateral evasion force [${mechanic.split(' ')[0]}]
 │     └─ [No] ───> Continue Collectible Scan
 └─ (S_EXPLORE) Maintain Default Pattern`;
    }

    this.openModal('pitch-results-panel');
    log(`[HUB] Generated viral pitch concept: '${name}' (${mechanic} / ${theme})`, 'info');
  }

  startInteractivePlanner() {
    synth.playClick();
    this.plannerStep = 0;
    this.plannerData = { name: '', mechanic: '', theme: '', goal: '' };
    this.openModal('modal-game-planner');
    this.renderPlannerStep();
  }

  renderPlannerStep() {
    const container = document.getElementById('planner-step-container');
    if (!container) return;

    const steps = [
      {
        question: "Step 1 of 4: What genre / core style of game are you building?",
        options: ['Cyberpunk 3D Runner', 'Top-Down Stealth Roguelike', 'Pseudo-3D Highway Racer', 'Precision 2D Physics Puzzle'],
        field: 'theme'
      },
      {
        question: "Step 2 of 4: Select the primary gameplay mechanic:",
        options: ['High-Speed Touch / Pointer Fuzzing', 'Key-based Collision Avoidance', 'Physics Fluid Particle Gravity', 'Weapon / Shield Energy Balance'],
        field: 'mechanic'
      },
      {
        question: "Step 3 of 4: Target platform & runtime constraint:",
        options: ['HTML5 2D Canvas (Mobile / Desktop)', 'Three.js 3D WebGL (60 FPS)', 'WebGPU Quantized Shaders', 'Full-screen Web Viewport'],
        field: 'goal'
      }
    ];

    if (this.plannerStep < steps.length) {
      const cur = steps[this.plannerStep];
      container.innerHTML = `
        <h4 style="color: var(--neon-cyan); font-family: var(--font-mono); font-size: 12px; margin-bottom: 8px;">${cur.question}</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
          ${cur.options.map(opt => `<button class="neon-btn planner-opt-btn" style="padding: 10px; font-size: 11px; text-align: left;">${opt}</button>`).join('')}
        </div>
      `;

      container.querySelectorAll('.planner-opt-btn').forEach(btn => {
        btn.onclick = () => {
          synth.playSuccess();
          this.plannerData[cur.field] = btn.textContent.trim();
          this.plannerStep++;
          this.renderPlannerStep();
        };
      });
    } else {
      const specSheet = `# 🎮 4WEIRD GAME DESIGN SPECIFICATION
- **Target Style:** ${this.plannerData.theme}
- **Primary Mechanic:** ${this.plannerData.mechanic}
- **Platform Architecture:** ${this.plannerData.goal}
- **Autonomous QA Scope:** Fuzz event dispatch, zero-crash policy, and self-healing git diff generation.`;

      container.innerHTML = `
        <h4 style="color: var(--neon-green); font-family: var(--font-mono); font-size: 12px; margin-bottom: 8px;">✅ GAME SPECIFICATION COMPILED</h4>
        <pre style="background: #01040a; border: 1px solid var(--border-color); padding: 10px; border-radius: 4px; font-family: var(--font-mono); font-size: 10px; color: var(--neon-cyan); max-height: 140px; overflow-y: auto;">${specSheet}</pre>
        <div style="display: flex; gap: 8px; margin-top: 10px; justify-content: flex-end;">
          <button id="btn-planner-deploy" class="neon-btn-green">🚀 DEPLOY TO SANDBOX & TEST</button>
        </div>
      `;

      const deployBtn = document.getElementById('btn-planner-deploy');
      if (deployBtn) {
        deployBtn.onclick = () => {
          synth.playSuccess();
          this.closeAllModals();
          if (el.gameTarget) el.gameTarget.value = '../games/html/orbitaldrift/index.html';
          if (typeof this.onLoadTarget === 'function') this.onLoadTarget('../games/html/orbitaldrift/index.html');
          this.showEditorView();
          log(`[PLANNER] Deployed custom specification to sandbox viewport.`, 'system');
        };
      }
    }
  }
}

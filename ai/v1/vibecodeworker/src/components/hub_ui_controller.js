/**
 * Hub UI Panel and Interactive Game Planner Component
 */

const fs = require('fs');
const path = require('path');
const { shell, clipboard } = require('electron');
const hub = require('../modules/hub_manager');
const { generateSpecSheet } = require('../runtime/spec_sheet_builder');
const { callPlannerAI } = require('../runtime/planner_ai_handler');
const { CloudFleetOrchestrator } = require('../runtime/cloud_fleet_orchestrator');

class HubUIController {
  constructor({
    hubEl,
    audio,
    toastNotifier,
    logSystemMessage,
    agentBrain,
    saveConfigData,
    loadGame,
    crawlFiles,
    showEditorWorkspace,
    el
  }) {
    this.hubEl = hubEl;
    this.audio = audio;
    this.toastNotifier = toastNotifier;
    this.logSystemMessage = logSystemMessage;
    this.agentBrain = agentBrain;
    this.saveConfigData = saveConfigData;
    this.loadGame = loadGame;
    this.crawlFiles = crawlFiles;
    this.showEditorWorkspace = showEditorWorkspace;
    this.el = el;
    this.cloudFleet = new CloudFleetOrchestrator();

    this.plannerStep = 0;
    this.plannerSpecs = { name: '', mechanic: '', theme: '', goal: '' };
    this.plannerTxtContent = '';
    this.plannerHistory = [];
    this.lastPitchedGame = null;
    this.selectedWebsiteGoal = 'UI/UX Heuristic Audit: Evaluate usability, font contrast, layout responsiveness, and accessibility dead ends.';
  }

  setupBindings() {
    const { hubEl, audio } = this;

    if (hubEl.btnGotoHub) {
      hubEl.btnGotoHub.addEventListener('click', () => {
        audio.playClickSound();
        this.showHubWorkspace();
      });
    }

    // New Card 1: Load 4weird Games
    const cardLoad4weird = document.getElementById('card-load-4weird');
    if (cardLoad4weird) {
      cardLoad4weird.addEventListener('click', () => {
        audio.playClickSound();
        this.open4weirdGamesModal();
      });
    }

    // New Card 2: Test Any Website
    const cardTestWebsite = document.getElementById('card-test-website');
    if (cardTestWebsite) {
      cardTestWebsite.addEventListener('click', () => {
        audio.playClickSound();
        this.openTestWebsiteModal();
      });
    }

    // New Card 3: Cloud Fleet
    const cardCloudFleet = document.getElementById('card-cloud-fleet');
    if (cardCloudFleet) {
      cardCloudFleet.addEventListener('click', () => {
        audio.playClickSound();
        this.openCloudFleetModal();
      });
    }

    const cardDesktopGame = document.getElementById('card-desktop-game');
    if (cardDesktopGame) {
      cardDesktopGame.addEventListener('click', () => {
        audio.playClickSound();
        if (this.el.gameRulesInput) {
          this.el.gameRulesInput.value = 'Desktop-game playtest: keep actions conservative; verify menus, movement, camera, and responsiveness in the selected game window.';
        }
        this.saveConfigData();
        this.showEditorWorkspace();
        const appContainer = document.querySelector('.app-container');
        if (appContainer) appContainer.classList.add('options-open');
        const scanner = document.getElementById('native-scanner');
        if (scanner) scanner.classList.remove('hidden');
        document.getElementById('btn-scan-processes')?.click();
        this.toastNotifier.show('Choose a game window, then start a supervised desktop playtest.', 'info');
        this.logSystemMessage('[Desktop Game Mode] Window scan started. Select a target before starting the agent.');
      });
    }

    // Modal Close Buttons
    const btnCloseGames = document.getElementById('btn-close-games-modal');
    if (btnCloseGames) {
      btnCloseGames.addEventListener('click', () => {
        audio.playClickSound();
        this.resetHubViews();
      });
    }

    const btnCloseWebsite = document.getElementById('btn-close-website-modal');
    if (btnCloseWebsite) {
      btnCloseWebsite.addEventListener('click', () => {
        audio.playClickSound();
        this.resetHubViews();
      });
    }

    const btnCloseFleet = document.getElementById('btn-close-fleet-modal');
    if (btnCloseFleet) {
      btnCloseFleet.addEventListener('click', () => {
        audio.playClickSound();
        this.resetHubViews();
      });
    }

    // Website Goal selector buttons
    const goalBtns = document.querySelectorAll('.website-goal-btn');
    goalBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        audio.playClickSound();
        goalBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedWebsiteGoal = btn.dataset.goal;
      });
    });

    // Start Website Audit Button
    const btnStartWebsiteAudit = document.getElementById('btn-start-website-audit');
    if (btnStartWebsiteAudit) {
      btnStartWebsiteAudit.addEventListener('click', () => {
        const input = document.getElementById('input-custom-website-url');
        const url = input ? input.value.trim() : '';
        if (!url) {
          this.toastNotifier.show("Please enter a valid website URL", "warning");
          return;
        }
        audio.playClickSound();
        this.el.gameUrlInput.value = url.startsWith('http') ? url : `https://${url}`;
        if (this.el.gameRulesInput) {
          this.el.gameRulesInput.value = this.selectedWebsiteGoal;
        }
        this.agentBrain.updateConfig({ gameRules: this.selectedWebsiteGoal });
        this.saveConfigData();
        this.loadGame();
        this.showEditorWorkspace();
        this.toastNotifier.show(`Loaded website audit target: ${url}`, "success");
        this.logSystemMessage(`[Web QA Mode] Goal configured: ${this.selectedWebsiteGoal}`);
      });
    }

    // Cloud Fleet Provision Buttons
    const provisionBtns = document.querySelectorAll('.btn-provision-node');
    provisionBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const tier = btn.dataset.tier || 'standard';
        audio.playClickSound();
        this.toastNotifier.show(`Provisioning remote ${tier.toUpperCase()} cloud node...`, "info");
        try {
          const inst = await this.cloudFleet.provisionInstance(tier);
          const statusDiv = document.getElementById('fleet-active-status');
          if (statusDiv) {
            statusDiv.innerHTML = `🟢 <strong>Active Node Provisioned:</strong> <code>${inst.id}</code> (${inst.tierDetails.name}) • Rate: $${inst.rateInfo.billedHourly}/hr • Stream: <code>${inst.streamUrl}</code>`;
          }
          this.toastNotifier.show(`Remote node ${inst.id} is ready! Stream connected.`, "success");
          this.logSystemMessage(`[Cloud Fleet] Orchestrated remote instance: ${inst.id} (${inst.tierDetails.name}) at $${inst.rateInfo.billedHourly}/hr with 15% platform orchestration margin.`);
        } catch (err) {
          this.toastNotifier.show(`Provisioning failed: ${err.message}`, "error");
        }
      });
    });

    if (hubEl.cardRandomGame) {
      hubEl.cardRandomGame.addEventListener('click', () => {
        audio.playClickSound();
        this.triggerCreateRandomGame();
      });
    }

    if (hubEl.cardPlanGame) {
      hubEl.cardPlanGame.addEventListener('click', () => {
        audio.playClickSound();
        this.triggerInteractivePlanner();
      });
    }

    if (hubEl.cardOpenFolder) {
      hubEl.cardOpenFolder.addEventListener('click', () => {
        audio.playClickSound();
        this.triggerOpenFolderSelector();
      });
    }

    const btnImportPlan = document.getElementById('btn-import-plan');
    if (btnImportPlan) {
      btnImportPlan.addEventListener('click', () => {
        audio.playClickSound();
        const imported = hub.importGamePlan();
        if (imported) {
          this.lastPitchedGame = imported;
          const grid = document.querySelector('.hub-grid');
          const hero = document.querySelector('.hub-hero');
          if (grid) grid.style.display = 'none';
          if (hero) hero.style.display = 'none';

          hubEl.pitchGameName.textContent = imported.name;
          hubEl.pitchTxtOutput.value = imported.fileContent;

          const braidMatch = imported.fileContent.split('5. AGENT BRAID ACTION FLOW GRAPHIC')[1] ||
                             imported.fileContent.split('AGENT BRAID ACTION FLOW GRAPHIC')[1] ||
                             imported.fileContent.split('BRAID ACTION DECISION GRAPH')[1] ||
                             imported.fileContent.split('BRAID ACTION FLOW:')[1];
          if (braidMatch) {
            hubEl.pitchBraidOutput.textContent = braidMatch.trim().replace(/^[\r\n]+|=+[\r\n]+|[\r\n]+=+/g, '');
          } else {
            hubEl.pitchBraidOutput.textContent = `(S) Start -> Check target visible?\n  ├─ [Yes] ──> Glide / Move towards it\n  └─ [No] ───> Explore canvas`;
          }

          hubEl.pitchResultsPanel.classList.remove('hidden');
          this.toastNotifier.show(`Plan "${imported.name}" imported successfully!`, "success");
        }
      });
    }

    if (hubEl.btnClosePitch) {
      hubEl.btnClosePitch.addEventListener('click', () => {
        audio.playClickSound();
        this.resetHubViews();
      });
    }

    if (hubEl.btnClosePlanner) {
      hubEl.btnClosePlanner.addEventListener('click', () => {
        audio.playClickSound();
        this.resetHubViews();
      });
    }

    if (hubEl.btnPlannerSendCustom) {
      hubEl.btnPlannerSendCustom.addEventListener('click', () => {
        this.processPlannerInput(hubEl.plannerCustomInput.value.trim());
        hubEl.plannerCustomInput.value = '';
      });
    }

    const choiceButtons = hubEl.plannerChoicesRow.querySelectorAll('.choice-btn');
    choiceButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.processPlannerInput(btn.textContent.trim());
      });
    });

    const btnPitchCopy = document.getElementById('btn-pitch-copy');
    if (btnPitchCopy) {
      btnPitchCopy.addEventListener('click', () => {
        audio.playClickSound();
        if (hubEl.pitchTxtOutput.value) {
          clipboard.writeText(hubEl.pitchTxtOutput.value);
          this.toastNotifier.show("Game plan copied to clipboard!", "success");
        }
      });
    }

    const btnPitchModify = document.getElementById('btn-pitch-modify');
    if (btnPitchModify) {
      btnPitchModify.addEventListener('click', () => {
        audio.playClickSound();
        this.startModifyingPitchedGame();
      });
    }

    const btnPitchOpenFolder = document.getElementById('btn-pitch-open-folder');
    if (btnPitchOpenFolder) {
      btnPitchOpenFolder.addEventListener('click', () => {
        audio.playClickSound();
        shell.openPath(hub.plansDir);
        this.toastNotifier.show("Opening games_plan folder...", "success");
      });
    }

    const btnPitchOpenNotepad = document.getElementById('btn-pitch-open-notepad');
    if (btnPitchOpenNotepad) {
      btnPitchOpenNotepad.addEventListener('click', () => {
        audio.playClickSound();
        if (this.lastPitchedGame && this.lastPitchedGame.planPath) {
          shell.openPath(this.lastPitchedGame.planPath);
          this.toastNotifier.show("Opening plan file in editor...", "success");
        }
      });
    }

    const btnPlannerCopy = document.getElementById('btn-planner-copy');
    if (btnPlannerCopy) {
      btnPlannerCopy.addEventListener('click', () => {
        audio.playClickSound();
        if (hubEl.plannerSpecPreview.value) {
          clipboard.writeText(hubEl.plannerSpecPreview.value);
          this.toastNotifier.show("Game plan copied to clipboard!", "success");
        }
      });
    }

    const btnPlannerOpenFolder = document.getElementById('btn-planner-open-folder');
    if (btnPlannerOpenFolder) {
      btnPlannerOpenFolder.addEventListener('click', () => {
        audio.playClickSound();
        shell.openPath(hub.plansDir);
        this.toastNotifier.show("Opening games_plan folder...", "success");
      });
    }

    const btnPlannerOpenNotepad = document.getElementById('btn-planner-open-notepad');
    if (btnPlannerOpenNotepad) {
      btnPlannerOpenNotepad.addEventListener('click', () => {
        audio.playClickSound();
        if (this.plannerSpecs.name) {
          const planPath = path.join(hub.plansDir, `${this.plannerSpecs.name.replace(/\s+/g, '_')}_plan.txt`);
          if (fs.existsSync(planPath)) {
            shell.openPath(planPath);
            this.toastNotifier.show("Opening plan file in editor...", "success");
          } else {
            this.toastNotifier.show("No saved plan file found yet. Finish planning first!", "warning");
          }
        }
      });
    }
  }

  showHubWorkspace() {
    this.hubEl.hubWorkspace.classList.remove('hidden');
    this.hubEl.editorWorkspace.classList.add('hidden');
    this.resetHubViews();
  }

  resetHubViews() {
    const grid = document.querySelector('.hub-grid');
    const hero = document.querySelector('.hub-hero');
    if (grid) grid.style.display = 'grid';
    if (hero) hero.style.display = 'block';

    this.hubEl.pitchResultsPanel.classList.add('hidden');
    this.hubEl.chatPlannerPanel.classList.add('hidden');

    const modalGames = document.getElementById('modal-4weird-games');
    const modalWebsite = document.getElementById('modal-test-website');
    const modalFleet = document.getElementById('modal-cloud-fleet');
    if (modalGames) modalGames.classList.add('hidden');
    if (modalWebsite) modalWebsite.classList.add('hidden');
    if (modalFleet) modalFleet.classList.add('hidden');
  }

  hideHubGrid() {
    const grid = document.querySelector('.hub-grid');
    const hero = document.querySelector('.hub-hero');
    if (grid) grid.style.display = 'none';
    if (hero) hero.style.display = 'none';
  }

  open4weirdGamesModal() {
    this.hideHubGrid();
    const modalGames = document.getElementById('modal-4weird-games');
    const list = document.getElementById('modal-games-list');
    if (modalGames) modalGames.classList.remove('hidden');

    if (list) {
      list.innerHTML = '';
      const packagedWebsite = path.join(process.resourcesPath || '', 'website', 'v1');
      const websiteV1Dir = fs.existsSync(packagedWebsite)
        ? packagedWebsite
        : path.join(__dirname, '..', '..', '..', '..', '..', 'website', 'v1');
      const gamesDir = path.join(websiteV1Dir, 'games');
      const items = [];

      if (fs.existsSync(gamesDir)) {
        const direct = fs.readdirSync(gamesDir);
        for (const item of direct) {
          const sub = path.join(gamesDir, item);
          if (fs.statSync(sub).isDirectory() && item !== 'html' && item !== 'images') {
            const idx = path.join(sub, 'index.html');
            if (fs.existsSync(idx)) {
              items.push({ name: item.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), path: idx });
            }
          }
        }
        const htmlDir = path.join(gamesDir, 'html');
        if (fs.existsSync(htmlDir)) {
          const htmlSubs = fs.readdirSync(htmlDir);
          for (const subItem of htmlSubs) {
            const sub = path.join(htmlDir, subItem);
            if (fs.statSync(sub).isDirectory() && !subItem.startsWith('_')) {
              const idx = path.join(sub, 'index.html');
              if (fs.existsSync(idx)) {
                items.push({ name: subItem.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), path: idx });
              }
            }
          }
        }
      }

      items.forEach(game => {
        const card = document.createElement('div');
        card.className = 'modal-game-item glass';
        card.style.padding = '12px';
        card.style.borderRadius = '8px';
        card.style.border = '1px solid rgba(0,255,102,0.2)';
        card.style.cursor = 'pointer';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '6px';
        card.innerHTML = `
          <div style="font-weight: bold; color: #fff; font-size: 0.9rem;">🎮 ${game.name}</div>
          <div style="font-size: 0.7rem; color: var(--accent-cyan);">HTML5 / WebGL</div>
        `;
        card.addEventListener('click', () => {
          this.audio.playClickSound();
          this.el.gameUrlInput.value = 'file:///' + game.path.replace(/\\/g, '/');
          this.saveConfigData();
          this.loadGame();
          this.crawlFiles();
          this.showEditorWorkspace();
          this.toastNotifier.show(`Loaded "${game.name}"!`, "success");
        });
        list.appendChild(card);
      });
    }
  }

  openTestWebsiteModal() {
    this.hideHubGrid();
    const modalWebsite = document.getElementById('modal-test-website');
    if (modalWebsite) modalWebsite.classList.remove('hidden');
  }

  openCloudFleetModal() {
    this.hideHubGrid();
    const modalFleet = document.getElementById('modal-cloud-fleet');
    if (modalFleet) modalFleet.classList.remove('hidden');
  }

  triggerCreateRandomGame() {
    const grid = document.querySelector('.hub-grid');
    const hero = document.querySelector('.hub-hero');
    if (grid) grid.style.display = 'none';
    if (hero) hero.style.display = 'none';

    this.logSystemMessage("Generating Random Viral Spec Sheet...");
    const pitched = hub.pitchGame();
    this.lastPitchedGame = pitched;

    this.hubEl.pitchGameName.textContent = pitched.name;
    this.hubEl.pitchTxtOutput.value = pitched.fileContent;
    this.hubEl.pitchBraidOutput.textContent = pitched.braid;

    this.hubEl.pitchResultsPanel.classList.remove('hidden');
    this.toastNotifier.show("Game pitched successfully!", "success");
  }

  triggerInteractivePlanner() {
    const grid = document.querySelector('.hub-grid');
    const hero = document.querySelector('.hub-hero');
    if (grid) grid.style.display = 'none';
    if (hero) hero.style.display = 'none';

    this.hubEl.chatPlannerPanel.classList.remove('hidden');
    this.hubEl.plannerChatMessages.innerHTML = '';

    this.plannerStep = 0;
    this.plannerSpecs = { name: '', mechanic: '', theme: '', goal: '' };
    this.plannerTxtContent = '';
    this.hubEl.plannerSpecPreview.value = '';

    this.addAgentChatMessage("Welcome to the HTML Game Planner! Let's start by choosing a Name or concept. What should we name your new game?");
    this.updatePlannerChoices(
      "1. Hyperdrift Slime",
      "2. Galactic Space Collector",
      "3. Pixel DeepSea Escape"
    );
  }

  addAgentChatMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'chat-msg agent';
    msg.textContent = text;
    this.hubEl.plannerChatMessages.appendChild(msg);
    this.hubEl.plannerChatMessages.scrollTop = this.hubEl.plannerChatMessages.scrollHeight;
    this.audio.playSynth(440, 'triangle', 0.1);
  }

  addUserChatMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'chat-msg user';
    msg.textContent = text;
    this.hubEl.plannerChatMessages.appendChild(msg);
    this.hubEl.plannerChatMessages.scrollTop = this.hubEl.plannerChatMessages.scrollHeight;
    this.audio.playSynth(550, 'sine', 0.08);
  }

  updatePlannerChoices(c1, c2, c3) {
    const buttons = this.hubEl.plannerChoicesRow.querySelectorAll('.choice-btn');
    if (buttons[0]) buttons[0].textContent = c1;
    if (buttons[1]) buttons[1].textContent = c2;
    if (buttons[2]) buttons[2].textContent = c3;
  }

  updateLiveSpecFile() {
    this.plannerTxtContent = generateSpecSheet(this.plannerSpecs);
    this.hubEl.plannerSpecPreview.value = this.plannerTxtContent;
  }

  async processPlannerInput(input) {
    if (!input) return;
    this.addUserChatMessage(input);

    this.addAgentChatMessage("Thinking...");
    const result = await callPlannerAI(this.agentBrain, input, this.plannerStep, this.plannerSpecs, this.plannerHistory);

    const chatMsgs = this.hubEl.plannerChatMessages.querySelectorAll('.chat-msg');
    chatMsgs.forEach(msg => {
      if (msg.textContent.includes("Thinking...")) {
        msg.remove();
      }
    });

    this.addAgentChatMessage(result.agentResponse);
    this.updatePlannerChoices(result.choices[0] || '1', result.choices[1] || '2', result.choices[2] || '3');
    this.plannerStep = result.nextStep !== undefined ? result.nextStep : this.plannerStep + 1;
    this.updateLiveSpecFile();

    if (result.isCompleted || this.plannerStep >= 4) {
      const planPath = path.join(hub.plansDir, `${this.plannerSpecs.name.replace(/\s+/g, '_')}_plan.txt`);
      fs.writeFileSync(planPath, this.plannerTxtContent, 'utf8');
    }
  }

  startModifyingPitchedGame() {
    if (!this.lastPitchedGame) return;

    this.hubEl.pitchResultsPanel.classList.add('hidden');
    this.hubEl.chatPlannerPanel.classList.remove('hidden');

    this.plannerStep = 1;
    this.plannerSpecs = {
      name: this.lastPitchedGame.name,
      mechanic: this.lastPitchedGame.mechanic,
      theme: this.lastPitchedGame.theme,
      goal: ''
    };

    this.hubEl.plannerChatMessages.innerHTML = '';
    this.addAgentChatMessage(`Let's modify the plan for "${this.plannerSpecs.name}"! I loaded the pitched design spec. Currently, the Core Mechanic is: "${this.plannerSpecs.mechanic}". What would you like to change or add to the core mechanic?`);
    this.updatePlannerChoices(
      "1. Add gravity drag & deceleration physics",
      "2. Mouse clicks blast incoming obstacles",
      "3. Keep current mechanic (Stealth/exploration)"
    );
    this.updateLiveSpecFile();
  }

  triggerOpenFolderSelector() {
    const selected = hub.selectGameFolder();
    if (selected) {
      const { folderPath, gameType } = selected;
      this.logSystemMessage(`Opened specific folder: "${folderPath}" (Detected type: ${gameType})`);

      if (this.el.nativeProcessSelect) {
        this.el.nativeProcessSelect.innerHTML = `<option value="">-- Scan / Select Game Window --</option>`;
        const opt = document.createElement('option');
        opt.value = gameType;
        opt.textContent = `${gameType} Game Workspace - Auto-detected`;
        opt.selected = true;
        this.el.nativeProcessSelect.appendChild(opt);
      }

      if (gameType === 'HTML') {
        let indexFile = path.join(folderPath, 'index.html');
        if (!fs.existsSync(indexFile)) {
          const list = fs.readdirSync(folderPath);
          for (const item of list) {
            const sub = path.join(folderPath, item);
            if (fs.statSync(sub).isDirectory() && fs.existsSync(path.join(sub, 'index.html'))) {
              indexFile = path.join(sub, 'index.html');
              break;
            }
          }
        }

        if (fs.existsSync(indexFile)) {
          this.el.gameUrlInput.value = 'file:///' + indexFile.replace(/\\/g, '/');
          this.saveConfigData();
          this.loadGame();
          this.crawlFiles();
        }
      }

      this.showEditorWorkspace();
      this.toastNotifier.show(`Loaded workspace of type ${gameType}!`, "success");
    }
  }
}

module.exports = {
  HubUIController
};

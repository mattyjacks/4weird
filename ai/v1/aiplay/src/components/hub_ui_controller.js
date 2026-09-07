/**
 * Hub UI Panel and Interactive Game Planner Component
 */

const fs = require('fs');
const path = require('path');
const { shell, clipboard } = require('electron');
const hub = require('../modules/hub_manager');
const { generateSpecSheet } = require('../runtime/spec_sheet_builder');
const { callPlannerAI } = require('../runtime/planner_ai_handler');

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

    this.plannerStep = 0;
    this.plannerSpecs = { name: '', mechanic: '', theme: '', goal: '' };
    this.plannerTxtContent = '';
    this.plannerHistory = [];
    this.lastPitchedGame = null;
  }

  setupBindings() {
    const { hubEl, audio } = this;

    if (hubEl.btnGotoHub) {
      hubEl.btnGotoHub.addEventListener('click', () => {
        audio.playClickSound();
        this.showHubWorkspace();
      });
    }

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

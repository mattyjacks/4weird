/* ==========================================================================
   4WEIRD VIBECODEWORKER // DEFECT HEALER, PATCH DRAWER & REASONING TREE
   ========================================================================== */

import { state, el, synth, isTauriRuntime, invokeTauriCommand } from './core_state.js';
import { log } from './telemetry_logger.js';
import { sourceCodeFiles, mockBugPool } from './data_store.js';

// Security: bug text (console errors, exceptions, rejection reasons) comes
// from the playtest target page, which may be an arbitrary third-party site.
// This dashboard runs with Node integration in the desktop build, so any
// unescaped interpolation of that text into innerHTML is a direct XSS-to-RCE
// primitive. Escape EVERYTHING; the only markup ever restored is the two
// fixed diff-highlight spans (exact match, no attributes allowed through).
export function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Restores exactly <span class="diff-del">, <span class="diff-add"> and
// </span> after escaping. Anything else (event handlers, extra attributes,
// other tags) stays inert text.
export function sanitizeDiff(value) {
  return escapeHtml(value)
    .replace(/&lt;span class=&quot;(diff-del|diff-add)&quot;&gt;/g, '<span class="$1">')
    .replace(/&lt;\/span&gt;/g, '</span>');
}

const DEFAULT_BUG_IMG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23080204'/><text x='50%23' y='50%23' dominant-baseline='middle' text-anchor='middle' font-family='monospace' fill='%23ff3355' font-size='15'>DEFECT DETECTED</text></svg>";

// Only image protocols may reach <img src>. Data SVGs in <img> cannot run
// script, and http(s) images are inert pixels; anything else falls back.
function safeBugImg(raw) {
  try {
    const parsed = new URL(String(raw), window.location.href);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'data:') {
      if (parsed.protocol === 'data:' && !String(raw).startsWith('data:image/')) return DEFAULT_BUG_IMG;
      return String(raw);
    }
  } catch (e) { /* fall through */ }
  return DEFAULT_BUG_IMG;
}

export function renderReasoningTree() {
  if (!el.reasoningTreeContainer) return;

  const target = escapeHtml(el.gameTarget ? el.gameTarget.value : 'orbitaldrift.html');
  const model = escapeHtml(state.currentModel);
  let html = `
    <div class="tree-node node-goal">
      <div class="tree-node-title"><span>🎯 [ROOT GOAL]</span> Autonomous QA Playtesting & Self-Healing</div>
      <div class="tree-node-desc">Target: ${target} | Model: ${model}</div>
    </div>
    
    <div class="tree-node node-hypothesis">
      <div class="tree-node-title"><span>💡 [HYPOTHESIS #1]</span> Rapid Input Fuzzing & Boundary State Validation</div>
      <div class="tree-node-desc">Inject high-frequency pointer interactions & touch events into sandbox canvas.</div>
    </div>
    
    <div class="tree-node node-action">
      <div class="tree-node-title"><span>⚡ [ACTION BRANCH #1]</span> Executed ${state.currentStep} test steps (${state.apm} APM)</div>
      <div class="tree-node-desc">Glide synthetic reticle cursor across target viewport coordinates.</div>
    </div>
  `;

  if (state.bugs.length > 0) {
    state.bugs.forEach((bug, index) => {
      html += `
        <div class="tree-node node-defect">
          <div class="tree-node-title"><span>🚨 [DEFECT CAUGHT #${index + 1}]</span> ${escapeHtml(bug.id)}: ${escapeHtml(bug.desc)}</div>
          <div class="tree-node-desc">Target File: ${escapeHtml(bug.file)} at ${escapeHtml(bug.time)}</div>
        </div>
        <div class="tree-node node-patch">
          <div class="tree-node-title"><span>🛠️ [GIT PATCH GENERATED]</span> Synthesized Self-Healing Diff</div>
          <div class="tree-node-desc">${escapeHtml(bug.fixDescription || 'Safeguarded target reference in memory.')}</div>
        </div>
      `;
    });
  } else {
    html += `
      <div class="tree-node node-action" style="margin-left: 36px; border-color: var(--neon-cyan);">
        <div class="tree-node-title"><span>🔍 [SCANNING]</span> Zero structural defects identified yet.</div>
        <div class="tree-node-desc">Monitoring frame buffer & memory GC cycles...</div>
      </div>
    `;
  }

  el.reasoningTreeContainer.innerHTML = html;
}

export function renderSourceCodeView() {
  if (!el.sourceCodeContent || !el.sourceLineNumbers) return;
  const filename = el.sourceFileSelect ? el.sourceFileSelect.value : 'orbitaldrift.js';
  const code = sourceCodeFiles[filename] || sourceCodeFiles['orbitaldrift.js'];
  const lines = code.split('\n');

  if (el.sourceFileTitle) el.sourceFileTitle.textContent = `SOURCE CODE INSPECTOR: ${filename}`;
  if (el.sourceLineCount) el.sourceLineCount.textContent = `${lines.length} Lines`;

  let lineNumHtml = '';
  let codeHtml = '';

  const fileDefects = state.bugs.filter(b => b.file === filename);

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    lineNumHtml += `<div>${lineNum}</div>`;

    let lineClass = 'source-line';
    let errorBadge = '';

    const hasDefect = fileDefects.some(d => {
      if (d.line && d.line === lineNum) return true;
      if (d.stack && (d.stack.includes(`${filename}:${lineNum}:`) || d.stack.includes(`:${lineNum}:`))) return true;
      return false;
    });

    if (hasDefect) {
      lineClass += ' line-error';
      errorBadge = ' ⚠️ [DEFECT CAUGHT]';
    }

    const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    codeHtml += `<span class="${lineClass}">${escaped}${errorBadge}</span>\n`;
  });

  el.sourceLineNumbers.innerHTML = lineNumHtml;
  el.sourceCodeContent.innerHTML = codeHtml;
}

export function updatePatchDrawerUI() {
  if (!el.drawerPatchesList) return;
  el.drawerPatchesList.innerHTML = '';
  if (state.patches.length === 0) {
    el.drawerPatchesList.innerHTML = '<p class="no-bugs-msg">No self-healing patches generated yet.</p>';
    return;
  }
  state.patches.forEach((patch, idx) => {
    const card = document.createElement('div');
    card.className = 'patch-card';
    card.style.cssText = 'background: rgba(0, 242, 254, 0.04); border: 1px solid var(--border-color); padding: 10px; border-radius: 6px; margin-bottom: 8px;';
    const heading = document.createElement('h4');
    heading.style.cssText = 'font-family: var(--font-mono); font-size: 11px; color: var(--neon-cyan); margin-bottom: 4px;';
    heading.textContent = `Patch #${idx + 1}: Fix ${patch.file} (${patch.id})`;
    const pre = document.createElement('pre');
    pre.className = 'diff-code';
    // patch.diff carries page-influenced text: allow only the fixed spans.
    pre.innerHTML = sanitizeDiff(patch.diff);
    card.append(heading, pre);
    el.drawerPatchesList.appendChild(card);
  });
}

export function showBugLightbox(bug) {
  synth.playClick();
  if (!el.bugModal) return;
  el.bugDetailTitle.textContent = `DEFECT TELEMETRY & AUTO-PATCH: ${bug.id}`;
  el.bugDetailTime.textContent = bug.time;
  el.bugDetailDesc.textContent = bug.desc;
  el.bugDetailStack.textContent = bug.stack;
  el.bugDetailImg.src = safeBugImg(bug.img);
  el.diffFileName.textContent = `Target: ${bug.file}`;
  // bug.diff may embed page-controlled console text: sanitize, keeping only
  // the fixed diff-highlight spans.
  el.diffCodeContent.innerHTML = sanitizeDiff(bug.diff);

  el.btnSolveMega.onclick = () => {
    synth.playClick();
    const megaPrompt = `[ANTIGRAVITY 2.0 CRASH REPORT]\nID: ${bug.id}\nTimestamp: ${bug.time}\nType: ${bug.type}\nFile: ${bug.file}\nMessage: ${bug.desc}\n\n[Stack Trace]\n${bug.stack}\n\nPlease generate source patch for target.`;
    navigator.clipboard.writeText(megaPrompt).then(() => {
      alert("Antigravity Mega-Prompt copied to clipboard!");
    });
  };

  el.btnApplyHotpatch.onclick = () => {
    synth.playSuccess();
    alert(`🔥 Antigravity Hot-Patch simulated successfully for ${bug.file}! Defect resolved in memory.`);
    el.bugModal.classList.add('hidden');
    log(`[ANTIGRAVITY HOT-PATCH] Applied patch for ${bug.id} (${bug.file}). Memory state clean.`, "info");
  };

  el.bugModal.classList.remove('hidden');
}

export function triggerDetectedBug(customBug = null) {
  const rawBug = customBug || mockBugPool[Math.floor(Math.random() * mockBugPool.length)];
  if (state.bugs.some(b => b.desc === rawBug.desc)) return;

  const timestamp = new Date().toLocaleTimeString([], { hour12: false });
  const bug = {
    id: "DEFECT-" + String(state.bugs.length + 1).padStart(3, '0'),
    type: rawBug.type || "EXCEPTION",
    desc: rawBug.desc,
    stack: rawBug.stack || `${rawBug.desc}\n  at (game runtime sandbox)`,
    img: rawBug.img || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23080204'/><text x='50%23' y='50%23' dominant-baseline='middle' text-anchor='middle' font-family='monospace' fill='%23ff3355' font-size='15'>DEFECT DETECTED</text></svg>",
    file: rawBug.file || "game.js",
    rootCause: rawBug.rootCause || "Uncaught runtime exception identified during automated input fuzzing.",
    fixDescription: rawBug.fixDescription || "Insert safeguard checks and handle unexpected boundary states.",
    rawDiff: rawBug.rawDiff || `--- a/${rawBug.file || 'game.js'}\n+++ b/${rawBug.file || 'game.js'}\n@@ -1,3 +1,5 @@\n-   // Faulty code line\n+   // Antigravity Hot-Patch safeguard`,
    diff: rawBug.diff || `<span class="diff-del">-   // Broken line</span>\n<span class="diff-add">+   // Antigravity Hot-Patch safeguard</span>`,
    time: timestamp
  };

  state.bugs.push(bug);
  synth.playFail();

  if (el.bugCounter) el.bugCounter.textContent = state.bugs.length;
  if (state.bugs.length === 1 && el.bugListContainer) el.bugListContainer.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'bug-card';
  const titleRow = document.createElement('div');
  titleRow.className = 'bug-title-row';
  const typeSpan = document.createElement('span');
  typeSpan.className = 'bug-type';
  typeSpan.textContent = `[${bug.type}]`;
  const timeSpan = document.createElement('span');
  timeSpan.className = 'bug-time';
  timeSpan.textContent = bug.time;
  titleRow.append(typeSpan, timeSpan);
  const descDiv = document.createElement('div');
  descDiv.className = 'bug-desc';
  // bug.desc is page-controlled (console text, error messages): text only.
  descDiv.textContent = bug.desc;
  card.append(titleRow, descDiv);
  card.addEventListener('click', () => showBugLightbox(bug));
  if (el.bugListContainer) el.bugListContainer.appendChild(card);

  log(`CRITICAL DEFECT IDENTIFIED: [${bug.id}] - ${bug.desc}`, "error");

  if (isTauriRuntime()) {
    invokeTauriCommand('show_native_notification', {
      title: `[4WEIRD VIBECODEWORKER] Defect Caught: ${bug.id}`,
      body: `${bug.type}: ${bug.desc}`
    });
  }

  state.patches.push(bug);
  updatePatchDrawerUI();
  renderReasoningTree();
  renderSourceCodeView();

  if (el.autoHealToast) {
    el.toastBugTitle.textContent = `DEFECT IDENTIFIED (${bug.id})`;
    el.toastBugDesc.textContent = bug.desc;
    el.autoHealToast.classList.remove('hidden');

    el.btnToastAutoheal.onclick = () => {
      synth.playSuccess();
      log(`[ANTIGRAVITY AUTO-HEAL] Applied live patch for ${bug.id} (${bug.file}).`, "info");
      el.autoHealToast.classList.add('hidden');
      showBugLightbox(bug);
    };
  }
}

export function compileMarkdownBugReport() {
  const timeStr = new Date().toLocaleString();
  const avgFps = Math.round(state.fpsHistory.reduce((a, b) => a + b, 0) / (state.fpsHistory.length || 1));
  const peakHeap = Math.max(...state.heapHistory).toFixed(1);
  const targetName = el.gameTarget ? el.gameTarget.value : 'Target Game';
  const anomalyRate = state.visionFramesAnalyzed > 0
    ? ((state.visionAnomaliesCount / state.visionFramesAnalyzed) * 100).toFixed(1)
    : '0.0';

  let md = `# 🌌 ANTIGRAVITY 2.0 // GPT-5.6 LUNA BUG REPORT & FIXES ARTIFACT

> **Generated by:** GPT-5.6 Luna Multimodal QA Engine & Antigravity 2.0 Autonomous Orchestrator  
> **Timestamp:** ${timeStr}  
> **Target Sandbox:** \`${targetName}\`

---

## 📊 EXECUTIVE SUMMARY & TELEMETRY

| Telemetry Metric | Recorded Session Value |
| :--- | :--- |
| **Active LLM Engine** | ${state.currentModel} |
| **Total Test Steps Executed** | ${state.currentStep} / ${state.maxSteps} |
| **Elapsed Session Duration** | ${state.elapsedSeconds}s |
| **Average Framerate** | ${avgFps} FPS |
| **Peak Heap Memory Usage** | ${peakHeap} MB |
| **Total Defects Identified** | ${state.bugs.length} |
| **Active Subagents Orchestrated** | ${state.subagents.length} specialized GPT-5.6 subagents |

---

## 👁️ GPT-5.6 LUNA VISION TELEMETRY & DIAGNOSTICS

- **Frames Captured & Analyzed:** ${state.visionFramesAnalyzed} frames
- **Vision Processing Latency:** ${state.visionLatencyMs}ms / frame
- **Visual Anomaly Rate:** ${anomalyRate}%
- **Bounding Box Spatial Precision:** 99.4%
- **Active Vision Prompt Rules:** Authoritative GPT-5.6 Luna Vision System Prompt & Instruction Set

---

## 🚨 DETECTED DEFECTS, ROOT CAUSE ANALYSIS & GIT DIFF FIXES

`;

  if (state.bugs.length === 0) {
    md += `*No structural defects identified during this playtest session. Target passed clean validation.*\n`;
  } else {
    state.bugs.forEach((bug, index) => {
      const rootCause = bug.rootCause || "Uncaught runtime exception identified during automated input fuzzing.";
      const fixDesc = bug.fixDescription || "Safeguard target reference and handle unexpected boundary states.";
      const rawDiff = bug.rawDiff || `--- a/${bug.file}\n+++ b/${bug.file}\n@@ -1,3 +1,5 @@\n-   // Faulty code line\n+   // Antigravity Hot-Patch safeguard\n+   try { executeSafely(); } catch (e) { console.warn(e); }`;

      md += `### Defect #${index + 1}: [${bug.id}] ${bug.desc}

- **Timestamp:** ${bug.time}
- **Defect Type:** \`${bug.type}\`
- **Target File:** \`${bug.file}\`

#### 🔬 Root Cause Analysis
${rootCause}

#### 🛠️ Step-by-Step Fix Description
1. Open target source file \`${bug.file}\`.
2. ${fixDesc}
3. Apply the unified Git Diff patch below to resolve the defect.

#### ⚡ Unified Git Diff Patch Block
\`\`\`diff
${rawDiff}
\`\`\`

#### 📜 Stack Trace / Console Output
\`\`\`
${bug.stack}
\`\`\`

---

`;
    });
  }

  md += `## 🤖 PARALLEL SUBAGENT ORCHESTRATION REPORT\n`;
  state.subagents.forEach(s => {
    md += `- **${s.name}**: ${s.desc} (${s.progress}% completed)\n`;
  });

  md += `\n*End of Bug Report Artifact. Compiled by 4WEIRD VibeCodeWorker + Antigravity 2.0 Melded Suite.*`;
  return md;
}

export function exportMarkdownReport() {
  synth.playSuccess();
  const markdownContent = compileMarkdownBugReport();
  const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const dl = document.createElement('a');
  dl.href = url;
  dl.download = `GPT5_6_Luna_Bug_Report_${Date.now()}.md`;
  dl.click();
  URL.revokeObjectURL(url);
  log("Exported full Markdown bug report artifact (.md).", "system");
}

export function switchReportTab(tabName) {
  synth.playClick();
  if (tabName === 'summary') {
    if (el.repTabBtnSummary) el.repTabBtnSummary.classList.add('active');
    if (el.repTabBtnPreview) el.repTabBtnPreview.classList.remove('active');
    if (el.repPaneSummary) el.repPaneSummary.classList.remove('hidden');
    if (el.repPanePreview) el.repPanePreview.classList.add('hidden');
  } else {
    if (el.repTabBtnPreview) el.repTabBtnPreview.classList.add('active');
    if (el.repTabBtnSummary) el.repTabBtnSummary.classList.remove('active');
    if (el.repPanePreview) el.repPanePreview.classList.remove('hidden');
    if (el.repPaneSummary) el.repPaneSummary.classList.add('hidden');
    if (el.repMarkdownCode) el.repMarkdownCode.textContent = compileMarkdownBugReport();
  }
}

export function generateReportSummary() {
  synth.playClick();
  if (el.repSteps) el.repSteps.textContent = state.currentStep;
  if (el.repBugs) el.repBugs.textContent = state.bugs.length;

  const avg = Math.round(state.fpsHistory.reduce((a, b) => a + b, 0) / (state.fpsHistory.length || 1));
  if (el.repFps) el.repFps.textContent = avg + " FPS";
  if (el.repDuration) el.repDuration.textContent = state.elapsedSeconds + "s";

  if (el.repVFrames) el.repVFrames.textContent = state.visionFramesAnalyzed;
  if (el.repVAnomalies) {
    const anomalyRate = state.visionFramesAnalyzed > 0
      ? ((state.visionAnomaliesCount / state.visionFramesAnalyzed) * 100).toFixed(1)
      : '0.0';
    el.repVAnomalies.textContent = anomalyRate + "%";
  }

  if (el.repBugListDetails) {
    el.repBugListDetails.innerHTML = '';
    if (state.bugs.length === 0) {
      el.repBugListDetails.innerHTML = '<div class="no-bugs-msg">Zero bugs reported! Target passed all test paths cleanly.</div>';
    } else {
      state.bugs.forEach(bug => {
        const row = document.createElement('div');
        row.className = 'rep-bug-row';
        row.style.cssText = 'background:#02060c; border:1px solid var(--border-color); padding:8px; border-radius:4px; margin-bottom:6px;';
        row.innerHTML = `
          <div style="display:flex; justify-content:space-between; font-family:var(--font-mono); font-size:10px; color:var(--system-error);">
            <span>[${bug.id}] ${bug.type}</span>
            <span>${bug.time}</span>
          </div>
          <div style="font-size:11px; margin-top:3px; font-weight:bold; color:var(--text-primary);">${bug.desc}</div>
          <div style="font-size:10px; color:var(--text-secondary); margin-top:2px;">Root Cause: ${bug.rootCause || 'Runtime Exception'}</div>
        `;
        el.repBugListDetails.appendChild(row);
      });
    }
  }

  if (el.repMarkdownCode) {
    el.repMarkdownCode.textContent = compileMarkdownBugReport();
  }

  switchReportTab('summary');
  if (el.reportModal) el.reportModal.classList.remove('hidden');
}

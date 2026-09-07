/* ==========================================================================
   4WEIRD VIBECODEWORKER // SUBAGENT ORCHESTRATION & COMMUNICATIONS
   ========================================================================== */

import { state, el, synth } from './core_state.js';
import { log } from './telemetry_logger.js';

export function updateSubagentsUI() {
  if (!el.subagentListContainer) return;
  el.subagentListContainer.innerHTML = '';
  if (state.subagents.length === 0) {
    el.subagentListContainer.innerHTML = '<div class="no-bugs-msg">No active subagents. Click "+ DISPATCH SUBAGENT".</div>';
    return;
  }

  state.subagents.forEach(sub => {
    const card = document.createElement('div');
    const isPaused = sub.status === 'paused';
    card.className = `subagent-card ${isPaused ? 'status-paused' : ''}`;

    const promptSnippet = sub.targetPrompt || sub.desc || 'Execute target QA sweep';

    card.innerHTML = `
      <div class="subagent-title-row">
        <div class="subagent-title">
          <span class="status-dot ${isPaused ? 'paused' : 'green'}"></span>
          <strong>${sub.name}</strong>
        </div>
        <span class="subagent-progress-text">${isPaused ? 'PAUSED' : sub.progress + '%'}</span>
      </div>
      <div class="subagent-desc">${sub.desc}</div>
      <div class="subagent-prompt-tag" title="${promptSnippet}">🎯 ${promptSnippet}</div>
      <div class="subagent-progress-bar">
        <div class="progress-fill" style="width: ${sub.progress}%; ${isPaused ? 'background: var(--system-info);' : ''}"></div>
      </div>
      <div class="subagent-card-actions">
        <button class="subagent-act-btn btn-toggle-pause" title="${isPaused ? 'Resume Subagent' : 'Pause Subagent'}">${isPaused ? '▶ Resume' : '⏸ Pause'}</button>
        <button class="subagent-act-btn btn-inspect-log" title="Inspect Live Subagent Logs">🔍 Logs</button>
        <button class="subagent-act-btn btn-reassign" title="Re-assign Task Objective">✏️ Re-assign</button>
        <button class="subagent-act-btn btn-term" title="Terminate Subagent">❌</button>
      </div>
    `;

    card.querySelector('.btn-toggle-pause').onclick = (e) => { e.stopPropagation(); togglePauseSubagent(sub.id); };
    card.querySelector('.btn-inspect-log').onclick = (e) => { e.stopPropagation(); inspectSubagentLogs(sub.id); };
    card.querySelector('.btn-reassign').onclick = (e) => { e.stopPropagation(); openReassignModal(sub.id); };
    card.querySelector('.btn-term').onclick = (e) => { e.stopPropagation(); terminateSubagent(sub.id); };

    el.subagentListContainer.appendChild(card);
  });
}

export function resumeAllSubagents() {
  synth.playSuccess();
  state.subagents.forEach(s => s.status = 'active');
  updateSubagentsUI();
  log("Orchestrator: Resumed execution across all subagents.", "system");
}

export function pauseAllSubagents() {
  synth.playClick();
  state.subagents.forEach(s => s.status = 'paused');
  updateSubagentsUI();
  log("Orchestrator: Suspended execution across all subagents.", "system");
}

export function terminateAllSubagents() {
  synth.playClick();
  state.subagents = [];
  updateSubagentsUI();
  log("Orchestrator: Terminated all subagents.", "system");
}

export function openDispatchSubagentModal() {
  synth.playClick();
  if (el.dispatchSubagentModal) el.dispatchSubagentModal.classList.remove('hidden');
}

export function confirmDispatchSubagent() {
  synth.playSuccess();
  const role = el.subagentRoleSelect ? el.subagentRoleSelect.value : 'DOM Fuzzer';
  const name = el.subagentNameInput && el.subagentNameInput.value.trim() ? el.subagentNameInput.value.trim() : role;
  const prompt = el.subagentPromptInput && el.subagentPromptInput.value.trim() ? el.subagentPromptInput.value.trim() : `Execute ${role} objective on active runtime.`;

  const newSubagent = {
    id: Date.now(),
    name: name,
    role: role,
    status: 'active',
    desc: `${role} - ${prompt.slice(0, 45)}...`,
    targetPrompt: prompt,
    progress: 0,
    logs: [
      { time: new Date().toLocaleTimeString([], { hour12: false }), message: `Subagent initialized and dispatched with prompt: '${prompt}'` }
    ]
  };

  state.subagents.push(newSubagent);
  updateSubagentsUI();
  if (el.dispatchSubagentModal) el.dispatchSubagentModal.classList.add('hidden');
  log(`🚀 [SUBAGENT DISPATCHED] Dispatched subagent '${newSubagent.name}' (Role: ${newSubagent.role}) - Prompt: '${prompt}'`, "system");
}

export function openSendMessageModal(targetId = 'all') {
  synth.playClick();
  if (!el.subagentMessageModal) return;
  el.messageTargetSelect.innerHTML = '<option value="all">🌐 ALL ACTIVE SUBAGENTS (BROADCAST)</option>';
  state.subagents.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `🤖 ${s.name} (${s.role || 'Subagent'})`;
    if (String(s.id) === String(targetId)) opt.selected = true;
    el.messageTargetSelect.appendChild(opt);
  });
  el.subagentMessageModal.classList.remove('hidden');
}

export function confirmSendMessage() {
  synth.playSuccess();
  if (!el.subagentMessageInput) return;
  const targetVal = el.messageTargetSelect.value;
  const msg = el.subagentMessageInput.value.trim();
  if (!msg) return;

  const time = new Date().toLocaleTimeString([], { hour12: false });
  if (targetVal === 'all') {
    state.subagents.forEach(s => {
      s.logs.push({ time, message: `[DIRECTIVE RECEIVED] User/Agent Broadcast: '${msg}'` });
    });
    log(`💬 [BROADCAST TO SUBAGENTS] Transmitted directive to all ${state.subagents.length} subagents: '${msg}'`, "system");
  } else {
    const sub = state.subagents.find(s => String(s.id) === String(targetVal));
    if (sub) {
      sub.logs.push({ time, message: `[DIRECTIVE RECEIVED] Direct Message: '${msg}'` });
      log(`💬 [MESSAGE TO SUBAGENT #${sub.id}] Transmitted directive to ${sub.name}: '${msg}'`, "system");
    }
  }

  el.subagentMessageInput.value = '';
  el.subagentMessageModal.classList.add('hidden');
}

export function inspectSubagentLogs(subId) {
  synth.playClick();
  const sub = state.subagents.find(s => String(s.id) === String(subId));
  if (!sub || !el.subagentLogModal) return;

  state.activeSubagentModalId = sub.id;
  el.subagentLogTitle.textContent = `📋 SUBAGENT LOG INSPECTOR: ${sub.name}`;
  el.subagentLogRole.textContent = sub.role || sub.name;
  el.subagentLogStatus.textContent = sub.status.toUpperCase();
  el.subagentLogStatus.className = sub.status === 'active' ? 'term-green' : 'term-yellow';
  el.subagentLogPrompt.textContent = sub.targetPrompt || sub.desc;
  el.btnSubagentTogglePause.textContent = sub.status === 'active' ? '⏸ PAUSE SUBAGENT' : '▶ RESUME SUBAGENT';

  renderSubagentLogStream(sub);
  el.subagentLogModal.classList.remove('hidden');
}

export function renderSubagentLogStream(sub) {
  if (!el.subagentLogStream) return;
  el.subagentLogStream.innerHTML = '';
  if (!sub.logs || sub.logs.length === 0) {
    el.subagentLogStream.innerHTML = '<div style="color:var(--text-secondary);">No log events recorded for this subagent yet.</div>';
    return;
  }
  sub.logs.forEach(l => {
    const div = document.createElement('div');
    div.style.marginBottom = '4px';
    div.innerHTML = `<span style="opacity:0.5;">[${l.time}]</span> ${l.message}`;
    el.subagentLogStream.appendChild(div);
  });
  el.subagentLogStream.scrollTop = el.subagentLogStream.scrollHeight;
}

export function togglePauseSubagent(subId) {
  synth.playClick();
  const sub = state.subagents.find(s => String(s.id) === String(subId));
  if (!sub) return;

  if (sub.status === 'active') {
    sub.status = 'paused';
    log(`⏸ [SUBAGENT PAUSED] Suspended execution for '${sub.name}'`, "system");
  } else {
    sub.status = 'active';
    log(`▶ [SUBAGENT RESUMED] Resumed execution for '${sub.name}'`, "system");
  }
  updateSubagentsUI();
  if (el.subagentLogModal && !el.subagentLogModal.classList.contains('hidden') && String(state.activeSubagentModalId) === String(sub.id)) {
    inspectSubagentLogs(sub.id);
  }
}

export function openReassignModal(subId) {
  synth.playClick();
  const sub = state.subagents.find(s => String(s.id) === String(subId));
  if (!sub || !el.subagentReassignModal) return;
  state.activeSubagentModalId = sub.id;
  el.reassignModalTitle.textContent = `✏️ RE-ASSIGN SUBAGENT: ${sub.name}`;
  el.reassignPromptInput.value = sub.targetPrompt || sub.desc;
  el.subagentReassignModal.classList.remove('hidden');
}

export function confirmReassign() {
  synth.playSuccess();
  const sub = state.subagents.find(s => String(s.id) === String(state.activeSubagentModalId));
  if (!sub || !el.reassignPromptInput) return;
  const newPrompt = el.reassignPromptInput.value.trim();
  if (!newPrompt) return;

  sub.targetPrompt = newPrompt;
  sub.desc = `${sub.role || sub.name} - ${newPrompt.slice(0, 45)}...`;
  sub.progress = 0;
  const time = new Date().toLocaleTimeString([], { hour12: false });
  sub.logs.push({ time, message: `[OBJECTIVE RE-ASSIGNED] New target prompt: '${newPrompt}'` });

  updateSubagentsUI();
  if (el.subagentReassignModal) el.subagentReassignModal.classList.add('hidden');
  if (el.subagentLogModal && !el.subagentLogModal.classList.contains('hidden') && String(state.activeSubagentModalId) === String(sub.id)) {
    inspectSubagentLogs(sub.id);
  }
  log(`✏️ [SUBAGENT RE-ASSIGNED] Updated target objective for '${sub.name}': '${newPrompt}'`, "system");
}

export function terminateSubagent(subId) {
  synth.playClick();
  const subIdx = state.subagents.findIndex(s => String(s.id) === String(subId));
  if (subIdx !== -1) {
    const subName = state.subagents[subIdx].name;
    state.subagents.splice(subIdx, 1);
    updateSubagentsUI();
    if (el.subagentLogModal) el.subagentLogModal.classList.add('hidden');
    log(`⏹ [SUBAGENT TERMINATED] Terminated subagent '${subName}'`, "system");
  }
}

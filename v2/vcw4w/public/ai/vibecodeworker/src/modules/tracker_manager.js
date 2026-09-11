const fs = require('fs');
const path = require('path');
const { dialog } = require('electron').remote || require('electron');

function renderBugs(bugsContainer, bugCountBadge, agentBrain, onCardClick) {
  bugsContainer.innerHTML = '';
  bugCountBadge.textContent = agentBrain.bugs.length;
  
  if (agentBrain.bugs.length === 0) {
    bugsContainer.innerHTML = `<div class="empty-state">No bugs identified yet. Run the playtest agent to scan.</div>`;
    return;
  }

  // Iterate backwards to show latest first
  for (let i = agentBrain.bugs.length - 1; i >= 0; i--) {
    const bug = agentBrain.bugs[i];
    const card = document.createElement('div');
    card.className = 'bug-card';
    
    // Format timestamp
    const date = new Date(bug.timestamp);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    card.innerHTML = `
      <div class="bug-meta">
        <span class="bug-severity ${bug.severity.toLowerCase()}">${bug.severity}</span>
        <span class="bug-time">${timeStr}</span>
      </div>
      <div class="bug-desc"><strong>[${bug.type}]</strong> ${bug.description}</div>
    `;
    
    card.addEventListener('click', () => {
      if (onCardClick) onCardClick(bug);
    });
    
    bugsContainer.appendChild(card);
  }
}

function showBugDetails(bug, bugModal, modalBugTitle, modalBugLogs, modalBugImg) {
  modalBugTitle.textContent = `Bug Detail: [${bug.type}]`;
  modalBugLogs.textContent = bug.logs && bug.logs.length > 0 
    ? bug.logs.join('\n') 
    : 'No console logs captured at the moment of the crash.';
  
  if (bug.screenshot) {
    modalBugImg.src = bug.screenshot.startsWith('data:') 
      ? bug.screenshot 
      : 'data:image/jpeg;base64,' + bug.screenshot;
    modalBugImg.style.display = 'block';
  } else {
    modalBugImg.src = '';
    modalBugImg.style.display = 'none';
  }
  
  bugModal.classList.remove('hidden');
}

function updateTokenStatsUI(agentBrain, tokenModelSelect, elements) {
  const modelFilter = tokenModelSelect ? tokenModelSelect.value : 'total';

  // Default token counts (would come from agentBrain.tokenUsage in real implementation)
  // For now, calculate from session stats if available
  let inputTokens = 0;
  let outputTokens = 0;

  if (agentBrain.tokenUsage && agentBrain.tokenUsage[modelFilter]) {
    const data = agentBrain.tokenUsage[modelFilter];
    inputTokens = data.input || Math.floor(data.last_run * 0.25) || 0;
    outputTokens = data.output || Math.floor(data.last_run * 0.75) || 0;
  }

  const totalTokens = inputTokens + outputTokens;
  const budget = 150000; // Default budget for display

  // Calculate percentages
  const inputPercent = Math.min((inputTokens / budget) * 100, 100);
  const outputPercent = Math.min((outputTokens / budget) * 100, 100);
  const totalPercent = Math.min((totalTokens / budget) * 100, 100);

  // Update new UI elements with progress bars
  if (elements.tokenInputCount) {
    elements.tokenInputCount.textContent = inputTokens.toLocaleString();
  }
  if (elements.tokenOutputCount) {
    elements.tokenOutputCount.textContent = outputTokens.toLocaleString();
  }
  if (elements.tokenTotalCount) {
    elements.tokenTotalCount.textContent = totalTokens.toLocaleString();
  }

  // Update percentages
  if (elements.tokenInputPercent) {
    elements.tokenInputPercent.textContent = inputPercent.toFixed(1) + '%';
  }
  if (elements.tokenOutputPercent) {
    elements.tokenOutputPercent.textContent = outputPercent.toFixed(1) + '%';
  }
  if (elements.tokenTotalPercent) {
    elements.tokenTotalPercent.textContent = totalPercent.toFixed(1) + '%';
  }

  // Update progress bars with color coding
  const updateProgressBar = (barEl, percent) => {
    if (!barEl) return;
    barEl.style.width = percent + '%';
    barEl.className = 'progress-bar';
    if (percent > 80) {
      barEl.classList.add('critical');
    } else if (percent > 50) {
      barEl.classList.add('warning');
    }
  };

  updateProgressBar(elements.tokenInputBar, inputPercent);
  updateProgressBar(elements.tokenOutputBar, outputPercent);
  updateProgressBar(elements.tokenTotalBar, totalPercent);

  // Calculate cost estimate (assuming $0.005 per 1K input, $0.015 per 1K output)
  const inputCost = (inputTokens / 1000) * 0.005;
  const outputCost = (outputTokens / 1000) * 0.015;
  const totalCost = inputCost + outputCost;
  const budgetCost = 0.75;

  if (elements.costEstimate) {
    elements.costEstimate.textContent = '$' + totalCost.toFixed(2);
  }
  if (elements.costBudget) {
    elements.costBudget.textContent = '$' + budgetCost.toFixed(2);
  }

  // Also update old elements for backward compatibility
  if (elements.tokenLastRun) elements.tokenLastRun.textContent = totalTokens.toLocaleString();
  if (elements.tokenHourly) elements.tokenHourly.textContent = inputTokens.toLocaleString();
  if (elements.tokenDaily) elements.tokenDaily.textContent = outputTokens.toLocaleString();
}

function updateSessionStatsUI(agentBrain, elements) {
  if (!elements.sessSteps) return;
  const stats = agentBrain.sessionStats;
  
  elements.sessSteps.textContent = stats.steps;
  elements.sessBugs.textContent = stats.bugsFound;
  elements.sessStuck.textContent = stats.stuckEvents;
  elements.sessRecoveries.textContent = stats.recoveries;
  
  // Render action mix
  const mixContainer = elements.actionMixEl;
  if (mixContainer) {
    mixContainer.innerHTML = '';
    const total = Object.values(stats.actionMix).reduce((a, b) => a + b, 0) || 1;
    
    Object.entries(stats.actionMix).forEach(([action, count]) => {
      const percentage = Math.round((count / total) * 100);
      const row = document.createElement('div');
      row.className = 'mix-bar';
      row.innerHTML = `
        <span>${action.toUpperCase()}</span>
        <div class="mix-track"><div class="mix-fill" style="width: ${percentage}%"></div></div>
        <span>${percentage}%</span>
      `;
      mixContainer.appendChild(row);
    });
    
    if (Object.keys(stats.actionMix).length === 0) {
      mixContainer.innerHTML = '<em>No actions performed yet in session.</em>';
    }
  }

  // Render top click zones
  const zonesContainer = elements.heatmapZonesEl;
  if (zonesContainer) {
    zonesContainer.innerHTML = '<span class="zones-label">TOP CLICK ZONES:</span>';
    
    const sortedZones = Object.entries(stats.clickZones)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
      
    sortedZones.forEach(([zone, count]) => {
      const chip = document.createElement('span');
      chip.className = 'zone-chip';
      chip.textContent = `${zone} ×${count}`;
      zonesContainer.appendChild(chip);
    });
    
    if (sortedZones.length === 0) {
      const chip = document.createElement('span');
      chip.className = 'zone-chip';
      chip.style.background = 'rgba(255,255,255,0.03)';
      chip.style.borderColor = 'rgba(255,255,255,0.05)';
      chip.style.color = 'var(--text-secondary)';
      chip.textContent = 'None';
      zonesContainer.appendChild(chip);
    }
  }
}

module.exports = {
  renderBugs,
  showBugDetails,
  updateTokenStatsUI,
  updateSessionStatsUI
};

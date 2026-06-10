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
  let stats = { lastRun: 0, hourly: 0, daily: 0, weekly: 0, yearly: 0, lifetime: 0 };
  
  if (agentBrain.tokenUsage) {
    const data = agentBrain.tokenUsage[modelFilter] || { total: 0, hourly: 0, daily: 0, weekly: 0, yearly: 0, lifetime: 0 };
    stats.lastRun = data.last_run || 0;
    stats.hourly = data.hourly || 0;
    stats.daily = data.daily || 0;
    stats.weekly = data.weekly || 0;
    stats.yearly = data.yearly || 0;
    stats.lifetime = data.lifetime || 0;
  }
  
  if (elements.tokenLastRun) elements.tokenLastRun.textContent = stats.lastRun.toLocaleString();
  if (elements.tokenHourly) elements.tokenHourly.textContent = stats.hourly.toLocaleString();
  if (elements.tokenDaily) elements.tokenDaily.textContent = stats.daily.toLocaleString();
  if (elements.tokenWeekly) elements.tokenWeekly.textContent = stats.weekly.toLocaleString();
  if (elements.tokenYearly) elements.tokenYearly.textContent = stats.yearly.toLocaleString();
  if (elements.tokenLifetime) elements.tokenLifetime.textContent = stats.lifetime.toLocaleString();
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

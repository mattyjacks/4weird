/**
 * Web App Player Module
 * UI components for website and web app playing/debugging
 */

class WebAppPlayer {
  constructor() {
    this.projects = [];
    this.activeProject = null;
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  createProjectBrowser() {
    const container = document.createElement('div');
    container.className = 'web-app-browser glass';
    container.innerHTML = `
      <div class="browser-header">
        <h3>📁 Project Browser</h3>
        <button class="btn btn-small btn-secondary" id="btn-add-project" title="Add project folder">
          + Add Project
        </button>
      </div>
      <div class="browser-content">
        <div class="project-list" id="project-list">
          <div class="empty-state">
            <p>No projects loaded</p>
            <small>Click "Add Project" to get started</small>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#btn-add-project').addEventListener('click', () => {
      this.emit('add-project');
    });

    return container;
  }

  createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.dataset.projectPath = project.path;

    const frameworkInfo = this.getFrameworkInfo(project.framework);
    const statusClass = project.isRunning ? 'running' : 'stopped';
    const statusText = project.isRunning ? '🟢 Running' : '⚫ Stopped';

    card.innerHTML = `
      <div class="card-header">
        <div class="card-title">
          <span class="framework-badge" style="background-color: ${frameworkInfo.color}">
            ${frameworkInfo.icon}
          </span>
          <div class="card-name">
            <h4>${project.name}</h4>
            <small>${frameworkInfo.name}</small>
          </div>
        </div>
        <span class="status-badge ${statusClass}">${statusText}</span>
      </div>
      
      <div class="card-details">
        <div class="detail-row">
          <span class="label">Type:</span>
          <span class="value">${project.projectType}</span>
        </div>
        <div class="detail-row">
          <span class="label">Port:</span>
          <span class="value">${project.port}</span>
        </div>
        ${project.isRunning ? `
          <div class="detail-row">
            <span class="label">URL:</span>
            <span class="value url-link">http://localhost:${project.port}</span>
          </div>
        ` : ''}
      </div>

      <div class="card-actions">
        ${!project.isRunning ? `
          <button class="btn btn-small btn-primary" data-action="start">
            ▶ Start
          </button>
        ` : `
          <button class="btn btn-small btn-secondary" data-action="stop">
            ⏹ Stop
          </button>
        `}
        <button class="btn btn-small btn-secondary" data-action="open">
          🔗 Open
        </button>
        <button class="btn btn-small btn-secondary" data-action="remove">
          🗑 Remove
        </button>
      </div>
    `;

    card.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.closest('[data-action]').dataset.action;
        this.emit(`project-${action}`, { projectPath: project.path });
      });
    });

    return card;
  }

  createServerStatus(project) {
    const container = document.createElement('div');
    container.className = 'server-status glass';
    container.innerHTML = `
      <div class="status-header">
        <h3>🖥️ Server Status</h3>
        <span class="status-indicator ${project.isRunning ? 'active' : 'inactive'}"></span>
      </div>
      
      <div class="status-content">
        <div class="status-item">
          <span class="label">Framework:</span>
          <span class="value">${this.getFrameworkInfo(project.framework).name}</span>
        </div>
        <div class="status-item">
          <span class="label">Port:</span>
          <span class="value">${project.port}</span>
        </div>
        <div class="status-item">
          <span class="label">Status:</span>
          <span class="value">${project.isRunning ? '🟢 Running' : '⚫ Stopped'}</span>
        </div>
        ${project.isRunning ? `
          <div class="status-item">
            <span class="label">Uptime:</span>
            <span class="value" id="uptime-display">0s</span>
          </div>
        ` : ''}
      </div>

      ${project.isRunning ? `
        <div class="status-actions">
          <button class="btn btn-small btn-secondary" id="btn-open-devtools">
            🔧 DevTools
          </button>
          <button class="btn btn-small btn-secondary" id="btn-reload-server">
            🔄 Reload
          </button>
          <button class="btn btn-small btn-secondary" id="btn-view-logs">
            📋 Logs
          </button>
        </div>
      ` : ''}
    `;

    if (project.isRunning) {
      container.querySelector('#btn-open-devtools').addEventListener('click', () => {
        this.emit('open-devtools', { projectPath: project.path });
      });
      container.querySelector('#btn-reload-server').addEventListener('click', () => {
        this.emit('reload-server', { projectPath: project.path });
      });
      container.querySelector('#btn-view-logs').addEventListener('click', () => {
        this.emit('view-logs', { projectPath: project.path });
      });
    }

    return container;
  }

  createConsolePanel(project) {
    const container = document.createElement('div');
    container.className = 'console-panel glass';
    container.innerHTML = `
      <div class="console-header">
        <h3>📺 Server Output</h3>
        <button class="btn btn-small btn-secondary" id="btn-clear-console">Clear</button>
      </div>
      <div class="console-content" id="console-output">
        <div class="console-line info">Server output will appear here...</div>
      </div>
    `;

    container.querySelector('#btn-clear-console').addEventListener('click', () => {
      this.emit('clear-console', { projectPath: project.path });
    });

    return container;
  }

  createProjectSelector() {
    const container = document.createElement('div');
    container.className = 'project-selector glass';
    container.innerHTML = `
      <div class="selector-header">
        <h3>🚀 Quick Launch</h3>
      </div>
      <div class="selector-content">
        <div class="selector-input-group">
          <input 
            type="text" 
            id="project-path-input" 
            placeholder="Paste project folder path..."
            class="input-field"
          />
          <button class="btn btn-primary" id="btn-load-project">Load</button>
        </div>
        <div class="recent-projects" id="recent-projects">
          <small>Recent projects will appear here</small>
        </div>
      </div>
    `;

    container.querySelector('#btn-load-project').addEventListener('click', () => {
      const path = container.querySelector('#project-path-input').value.trim();
      if (path) {
        this.emit('load-project', { projectPath: path });
      }
    });

    return container;
  }

  updateProjectList(projects) {
    this.projects = projects;
    const list = document.getElementById('project-list');
    if (!list) return;

    if (projects.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <p>No projects loaded</p>
          <small>Click "Add Project" to get started</small>
        </div>
      `;
      return;
    }

    list.innerHTML = '';
    projects.forEach(project => {
      list.appendChild(this.createProjectCard(project));
    });
  }

  updateConsoleOutput(projectPath, output) {
    const consoleOutput = document.getElementById('console-output');
    if (!consoleOutput) return;

    const lines = output.split('\n').slice(-50);
    consoleOutput.innerHTML = lines
      .map(line => {
        const className = line.includes('error') ? 'error' : 
                         line.includes('warn') ? 'warn' : 
                         line.includes('ready') || line.includes('listening') ? 'success' : 'info';
        return `<div class="console-line ${className}">${this.escapeHtml(line)}</div>`;
      })
      .join('');

    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  }

  getFrameworkInfo(framework) {
    const info = {
      nextjs: { name: 'Next.js', icon: '▲', color: '#000000' },
      astro: { name: 'Astro', icon: '⭐', color: '#FF5D01' },
      vite: { name: 'Vite', icon: '⚡', color: '#646CFF' },
      react: { name: 'React', icon: '⚛', color: '#61DAFB' },
      vue: { name: 'Vue', icon: '💚', color: '#4FC08D' },
      svelte: { name: 'Svelte', icon: '🔥', color: '#FF3E00' },
      'nodejs-server': { name: 'Node.js', icon: '🟢', color: '#339933' },
      'custom-npm': { name: 'Custom', icon: '📦', color: '#CB3837' },
      'static-html': { name: 'Static HTML', icon: '📄', color: '#E34C26' },
      'static-js': { name: 'Static JS', icon: '📜', color: '#F7DF1E' }
    };

    return info[framework] || { name: 'Unknown', icon: '❓', color: '#999999' };
  }

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}

module.exports = WebAppPlayer;

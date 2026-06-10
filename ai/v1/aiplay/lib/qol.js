/**
 * AutoCode QOL Module
 * Quality-of-life features: history, drafts, templates, notifications
 */

// ============================================================
// Prompt History Manager
// ============================================================

class PromptHistory {
  constructor(maxSize = 20) {
    this.maxSize = maxSize;
    this.history = [];
    this.storageKey = 'autocode_prompt_history';
    this.load();
  }

  add(prompt, metadata = {}) {
    if (!prompt || prompt.trim().length < 5) return;

    // Don't add duplicates at the top
    if (this.history.length > 0 && this.history[0].prompt === prompt.trim()) {
      return;
    }

    const entry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      prompt: prompt.trim(),
      metadata
    };

    this.history.unshift(entry);

    while (this.history.length > this.maxSize) {
      this.history.pop();
    }

    this.save();
    return entry;
  }

  getAll() {
    return [...this.history];
  }

  getRecent(count = 5) {
    return this.history.slice(0, count);
  }

  delete(id) {
    this.history = this.history.filter(h => h.id !== id);
    this.save();
  }

  clear() {
    this.history = [];
    this.save();
  }

  search(query) {
    const lowerQuery = query.toLowerCase();
    return this.history.filter(h =>
      h.prompt.toLowerCase().includes(lowerQuery) ||
      (h.metadata.fileEdited && h.metadata.fileEdited.toLowerCase().includes(lowerQuery))
    );
  }

  save() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, JSON.stringify(this.history));
      }
    } catch (e) {
      console.warn('Failed to save prompt history:', e);
    }
  }

  load() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          this.history = JSON.parse(stored);
        }
      }
    } catch (e) {
      console.warn('Failed to load prompt history:', e);
      this.history = [];
    }
  }
}

// ============================================================
// Draft Auto-Save Manager
// ============================================================

class DraftManager {
  constructor() {
    this.drafts = new Map();
    this.storageKey = 'autocode_drafts';
    this.autoSaveInterval = null;
    this.listeners = [];
    this.load();
  }

  startAutoSave(getCurrentDraftFn, interval = 5000) {
    this.stopAutoSave();
    this.autoSaveInterval = setInterval(() => {
      const draft = getCurrentDraftFn();
      if (draft && draft.filePath && draft.content) {
        this.saveDraft(draft.filePath, draft.content, draft.metadata);
      }
    }, interval);
  }

  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  saveDraft(filePath, content, metadata = {}) {
    if (!filePath || !content) return;

    const existing = this.drafts.get(filePath);
    const version = existing ? existing.version + 1 : 1;

    this.drafts.set(filePath, {
      content,
      timestamp: Date.now(),
      version,
      metadata
    });

    this.persist();
    this.notifyListeners('save', { filePath, version });
  }

  getDraft(filePath) {
    return this.drafts.get(filePath) || null;
  }

  hasDraft(filePath) {
    return this.drafts.has(filePath);
  }

  deleteDraft(filePath) {
    const deleted = this.drafts.delete(filePath);
    if (deleted) {
      this.persist();
      this.notifyListeners('delete', { filePath });
    }
    return deleted;
  }

  getAllDrafts() {
    return Array.from(this.drafts.entries()).map(([path, data]) => ({
      filePath: path,
      ...data
    }));
  }

  clearAllDrafts() {
    this.drafts.clear();
    this.persist();
    this.notifyListeners('clear', {});
  }

  onChange(callback) {
    this.listeners.push(callback);
    return () => {
      const idx = this.listeners.indexOf(callback);
      if (idx > -1) this.listeners.splice(idx, 1);
    };
  }

  notifyListeners(event, data) {
    this.listeners.forEach(cb => {
      try {
        cb(event, data);
      } catch (e) {
        console.error('Draft listener error:', e);
      }
    });
  }

  persist() {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = Array.from(this.drafts.entries());
        localStorage.setItem(this.storageKey, JSON.stringify(data));
      }
    } catch (e) {
      console.warn('Failed to persist drafts:', e);
    }
  }

  load() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const data = JSON.parse(stored);
          this.drafts = new Map(data);
        }
      }
    } catch (e) {
      console.warn('Failed to load drafts:', e);
      this.drafts = new Map();
    }
  }
}

// ============================================================
// Template Library
// ============================================================

class TemplateLibrary {
  constructor() {
    this.templates = [
      {
        id: 'add-feature',
        name: 'Add New Feature',
        icon: '✨',
        template: 'Add a new {{feature_name}} feature that {{description}}. Make sure to integrate it with existing code and add proper error handling.',
        placeholders: ['feature_name', 'description']
      },
      {
        id: 'fix-bug',
        name: 'Fix Bug',
        icon: '🐛',
        template: 'Fix the bug where {{bug_description}}. The issue occurs when {{trigger_condition}}. Ensure the fix handles edge cases.',
        placeholders: ['bug_description', 'trigger_condition']
      },
      {
        id: 'refactor',
        name: 'Refactor Code',
        icon: '♻️',
        template: 'Refactor the {{section}} code to improve {{aspect}}. Maintain existing functionality while making it more {{quality}}.',
        placeholders: ['section', 'aspect', 'quality']
      },
      {
        id: 'optimize',
        name: 'Optimize Performance',
        icon: '⚡',
        template: 'Optimize {{function/component}} for better {{metric}}. Target improvement: {{target}}% faster/more efficient.',
        placeholders: ['function/component', 'metric', 'target']
      },
      {
        id: 'add-tests',
        name: 'Add Unit Tests',
        icon: '🧪',
        template: 'Add comprehensive unit tests for {{function_name}} covering: normal cases, edge cases, and error conditions. Use {{test_framework}} style.',
        placeholders: ['function_name', 'test_framework']
      },
      {
        id: 'add-docs',
        name: 'Add Documentation',
        icon: '📚',
        template: 'Add inline documentation and JSDoc comments for {{section}}. Explain parameters, return values, and provide usage examples.',
        placeholders: ['section']
      },
      {
        id: 'modernize',
        name: 'Modernize Syntax',
        icon: '🚀',
        template: 'Modernize this code to use {{es_version}} features: {{specific_features}}. Ensure backward compatibility where needed.',
        placeholders: ['es_version', 'specific_features']
      },
      {
        id: 'error-handling',
        name: 'Add Error Handling',
        icon: '🛡️',
        template: 'Add comprehensive error handling to {{function/section}}. Include: input validation, try-catch blocks, and meaningful error messages.',
        placeholders: ['function/section']
      }
    ];
    this.customTemplates = [];
    this.storageKey = 'autocode_custom_templates';
    this.loadCustom();
  }

  getAllTemplates() {
    return [...this.templates, ...this.customTemplates];
  }

  getTemplate(id) {
    return this.templates.find(t => t.id === id) ||
           this.customTemplates.find(t => t.id === id);
  }

  fillTemplate(id, values) {
    const template = this.getTemplate(id);
    if (!template) return null;

    let filled = template.template;
    Object.entries(values).forEach(([key, value]) => {
      filled = filled.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    return filled;
  }

  addCustomTemplate(name, template, placeholders = [], icon = '📝') {
    const newTemplate = {
      id: `custom-${Date.now()}`,
      name,
      icon,
      template,
      placeholders,
      isCustom: true
    };
    this.customTemplates.push(newTemplate);
    this.saveCustom();
    return newTemplate;
  }

  deleteCustomTemplate(id) {
    const idx = this.customTemplates.findIndex(t => t.id === id);
    if (idx > -1) {
      this.customTemplates.splice(idx, 1);
      this.saveCustom();
      return true;
    }
    return false;
  }

  saveCustom() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, JSON.stringify(this.customTemplates));
      }
    } catch (e) {
      console.warn('Failed to save custom templates:', e);
    }
  }

  loadCustom() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          this.customTemplates = JSON.parse(stored);
        }
      }
    } catch (e) {
      console.warn('Failed to load custom templates:', e);
      this.customTemplates = [];
    }
  }
}

// ============================================================
// Toast Notifier
// ============================================================

class ToastNotifier {
  constructor(containerId = 'toast-container') {
    this.containerId = containerId;
    this.toasts = [];
    this.maxToasts = 5;
    this.ensureContainer();
  }

  ensureContainer() {
    if (typeof document === 'undefined') return;

    let container = document.getElementById(this.containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = this.containerId;
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }
  }

  show(message, options = {}) {
    if (typeof document === 'undefined') return;

    const {
      type = 'info',
      duration = 4000,
      icon = null,
      action = null,
      dismissible = true
    } = options;

    const toast = document.createElement('div');
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };

    const colors = {
      info: '#4facfe',
      success: '#2ecc71',
      warning: '#ff9f43',
      error: '#ff4d4d'
    };

    toast.style.cssText = `
      background: rgba(22, 25, 41, 0.95);
      backdrop-filter: blur(10px);
      border: 1px solid ${colors[type]}40;
      border-left: 4px solid ${colors[type]};
      border-radius: 8px;
      padding: 12px 16px;
      color: #f1f2f6;
      font-family: 'Outfit', sans-serif;
      font-size: 0.9rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 280px;
      max-width: 400px;
      pointer-events: auto;
      transform: translateX(120%);
      transition: transform 0.3s ease;
    `;

    toast.innerHTML = `
      <span style="font-size: 1.2rem;">${icon || icons[type]}</span>
      <span style="flex: 1; line-height: 1.4;">${message}</span>
      ${action ? `<button style="background: ${colors[type]}20; border: 1px solid ${colors[type]}50; color: ${colors[type]}; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.75rem; font-weight: 600;">${action.text}</button>` : ''}
      ${dismissible ? `<button style="background: none; border: none; color: #a4b0be; cursor: pointer; font-size: 1.2rem; padding: 0;">&times;</button>` : ''}
    `;

    const container = document.getElementById(this.containerId);
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
    });

    if (action) {
      toast.querySelector('button:not([style*="opacity"])')?.addEventListener('click', (e) => {
        e.stopPropagation();
        action.callback();
        this.dismiss(toast);
      });
    }

    if (dismissible) {
      toast.querySelector('button:last-child')?.addEventListener('click', () => this.dismiss(toast));
    }

    const timeoutId = setTimeout(() => this.dismiss(toast), duration);
    toast.dataset.timeoutId = timeoutId;

    this.toasts.push(toast);
    while (this.toasts.length > this.maxToasts) {
      this.dismiss(this.toasts[0]);
    }

    return toast;
  }

  success(message, options = {}) {
    return this.show(message, { ...options, type: 'success' });
  }

  error(message, options = {}) {
    return this.show(message, { ...options, type: 'error' });
  }

  warning(message, options = {}) {
    return this.show(message, { ...options, type: 'warning' });
  }

  info(message, options = {}) {
    return this.show(message, { ...options, type: 'info' });
  }

  dismiss(toast) {
    const idx = this.toasts.indexOf(toast);
    if (idx > -1) this.toasts.splice(idx, 1);

    clearTimeout(toast.dataset.timeoutId);
    toast.style.transform = 'translateX(120%)';
    toast.style.opacity = '0';

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }
}

// ============================================================
// Keyboard Shortcuts
// ============================================================

class KeyboardShortcuts {
  constructor() {
    this.shortcuts = new Map();
    this.enabled = true;
    this.setupListener();
  }

  setupListener() {
    if (typeof document === 'undefined') return;

    document.addEventListener('keydown', (e) => {
      if (!this.enabled) return;

      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (!e.ctrlKey && !e.metaKey) return;
      }

      const key = this.getKeyCombo(e);
      const handler = this.shortcuts.get(key);

      if (handler) {
        e.preventDefault();
        try {
          handler(e);
        } catch (err) {
          console.error('Keyboard shortcut error:', err);
        }
      }
    });
  }

  getKeyCombo(e) {
    const parts = [];
    if (e.ctrlKey) parts.push('ctrl');
    if (e.metaKey) parts.push('cmd');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');
    parts.push(e.key.toLowerCase());
    return parts.join('+');
  }

  register(shortcut, handler, description = '') {
    const normalized = shortcut.toLowerCase().replace(/\s/g, '');
    this.shortcuts.set(normalized, handler);

    if (description) {
      console.log(`[KeyboardShortcuts] Registered: ${shortcut} - ${description}`);
    }
  }

  unregister(shortcut) {
    const normalized = shortcut.toLowerCase().replace(/\s/g, '');
    return this.shortcuts.delete(normalized);
  }

  disable() {
    this.enabled = false;
  }

  enable() {
    this.enabled = true;
  }
}

module.exports = {
  PromptHistory,
  DraftManager,
  TemplateLibrary,
  ToastNotifier,
  KeyboardShortcuts
};

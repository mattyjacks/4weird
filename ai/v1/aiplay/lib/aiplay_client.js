/**
 * AIPlay Local REST API Client SDK
 * Easy-to-use JavaScript/Node.js wrapper for Gemini and external tools.
 */

class AIPlayClient {
  constructor(baseUrl = 'http://127.0.0.1:9999') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async _request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const res = await fetch(url, options);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`[AIPlayClient] ${res.status} ${res.statusText} at ${endpoint}: ${text}`);
    }
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await res.json();
    }
    return await res.arrayBuffer();
  }

  async getStatus() {
    return await this._request('/api/status');
  }

  async getGames() {
    return await this._request('/api/games');
  }

  async launchGame(gameId) {
    return await this._request('/api/game/launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId })
    });
  }

  async getScreenshot(target = 'game', format = 'base64') {
    if (format === 'json' || format === 'base64') {
      return await this._request(`/api/game/screenshot?target=${target}&format=json`);
    }
    const buffer = await this._request(`/api/game/screenshot?target=${target}&format=png`);
    return Buffer.from(buffer);
  }

  async getLogs() {
    return await this._request('/api/game/logs');
  }

  async getGameState() {
    return await this._request('/api/game/state');
  }

  async click(x, y) {
    return await this._request('/api/game/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'click', x, y })
    });
  }

  async pressKey(key) {
    return await this._request('/api/game/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'keydown', key })
    });
  }

  async eval(script) {
    return await this._request('/api/game/eval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script })
    });
  }

  async patchFile(filePath, targetContent, replacementContent) {
    return await this._request('/api/game/patch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath, targetContent, replacementContent })
    });
  }

  async getBugs() {
    return await this._request('/api/bugs');
  }

  async reportBug(bugData) {
    return await this._request('/api/bugs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bugData)
    });
  }

  async getDashboard() {
    return await this._request('/api/dashboard');
  }

  async autoFixBug(fixOptions = {}) {
    return await this._request('/api/autocode/fix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fixOptions)
    });
  }

  async getFixReports() {
    return await this._request('/api/autocode/report');
  }
}

module.exports = { AIPlayClient };

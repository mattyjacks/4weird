/**
 * Live, deliberately brief playtest commentary.
 * It translates a completed decision into a public-facing 1-2 sentence note;
 * it never exposes prompts, private reasoning chains, keys, or screenshots.
 */
const MAX_COMMENTARY_CHARS = 260;
const SPEAK_COOLDOWN_MS = 4500;

function short(value, max = 110) {
  return String(value || '').replace(/\s+/g, ' ').trim().replace(/[<>]/g, '').slice(0, max);
}

function actionDescription(action) {
  if (!action) return 'pause and observe the scene';
  const target = short(action.target || action.params?.key || '', 48);
  const verbs = { click: 'try an interaction', press_key: 'probe a control', hold_key: 'test sustained movement', scroll: 'look for more of the level', wait: 'observe the current state', refresh: 'reset the scene' };
  return `${verbs[action.type] || 'test the next interaction'}${target ? ` (${target})` : ''}`;
}

function makeCommentary(decision, personality = 'tester') {
  const action = actionDescription(decision?.action);
  const insight = short(decision?.reasoning, 125);
  if (personality === 'streamer') {
    const openers = [
      'Okay, tiny science goblin moment:',
      'Chat, we are conducting extremely serious button archaeology:',
      'The robot has entered its dramatic protagonist era:',
      'This is either a tactical masterclass or a beautifully documented mistake:'
    ];
    const opener = openers[Math.floor(Math.random() * openers.length)];
    return short(`${opener} I’m going to ${action}. ${insight ? `The vibe check says: ${insight}` : 'No panic; we are collecting evidence.'}`, MAX_COMMENTARY_CHARS);
  }
  return short(`Testing update: I’m going to ${action} to check the game’s response. ${insight ? `Current insight: ${insight}` : 'I’m watching for a clear state change or a bug.'}`, MAX_COMMENTARY_CHARS);
}

class ThinkingOutLoud {
  constructor({ ipcRenderer }) {
    this.ipcRenderer = ipcRenderer;
    this.lastSpokenAt = 0;
    this.playingRemoteAudio = false;
  }

  attach(elements) {
    this.el = elements;
    const saved = JSON.parse(localStorage.getItem('thinkingOutLoudPrefs') || '{}');
    if (elements.thinkingOutLoudToggle) elements.thinkingOutLoudToggle.checked = !!saved.enabled;
    if (elements.commentaryPersonality && saved.personality) elements.commentaryPersonality.value = saved.personality;
    if (elements.commentaryVoiceEngine && saved.engine) elements.commentaryVoiceEngine.value = saved.engine;
    if (elements.commentaryVoice && saved.voice) elements.commentaryVoice.value = saved.voice;
    const persist = () => localStorage.setItem('thinkingOutLoudPrefs', JSON.stringify(this.settings()));
    [elements.thinkingOutLoudToggle, elements.commentaryPersonality, elements.commentaryVoiceEngine, elements.commentaryVoice]
      .filter(Boolean).forEach(node => node.addEventListener('change', persist));
    this.setStatus('Commentary is off.');
  }

  settings() {
    return {
      enabled: !!this.el?.thinkingOutLoudToggle?.checked,
      personality: this.el?.commentaryPersonality?.value || 'tester',
      engine: this.el?.commentaryVoiceEngine?.value || 'system',
      voice: this.el?.commentaryVoice?.value || 'nova'
    };
  }

  setStatus(message) {
    if (this.el?.thinkingOutLoudStatus) this.el.thinkingOutLoudStatus.textContent = message;
  }

  async comment(decision, apiKey = '') {
    const settings = this.settings();
    if (!settings.enabled || !decision || Date.now() - this.lastSpokenAt < SPEAK_COOLDOWN_MS) return;
    if (window.speechSynthesis?.speaking || this.playingRemoteAudio) return;
    const text = makeCommentary(decision, settings.personality);
    this.lastSpokenAt = Date.now();
    this.setStatus(text);
    if (settings.engine === 'openai') {
      try {
        this.playingRemoteAudio = true;
        const result = await this.ipcRenderer.invoke('generate-commentary-speech', { text, apiKey, voice: settings.voice, personality: settings.personality });
        if (!result?.success) throw new Error(result?.error || 'speech generation failed');
        const audio = new Audio(`data:${result.mimeType || 'audio/mpeg'};base64,${result.audioBase64}`);
        audio.onended = audio.onerror = () => { this.playingRemoteAudio = false; };
        await audio.play();
        return;
      } catch (error) {
        this.playingRemoteAudio = false;
        this.setStatus(`OpenAI voice unavailable; using system voice. ${text}`);
      }
    }
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = settings.personality === 'streamer' ? 1.08 : 1;
      utterance.pitch = settings.personality === 'streamer' ? 1.05 : 1;
      window.speechSynthesis.speak(utterance);
    }
  }
}

module.exports = { ThinkingOutLoud, makeCommentary };

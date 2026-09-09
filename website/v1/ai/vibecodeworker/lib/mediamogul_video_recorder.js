/**
 * Playtest recorder backed by the FFmpeg binary shipped with MediaMogul.
 * It records Electron's rendered game surface (not the desktop) so capture
 * remains reliable in headless and foreground QA runs alike.
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function safeName(value) {
  return String(value || 'playtest').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'playtest';
}

function mediaMogulFfmpeg(projectRoot) {
  const binary = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  const candidates = [
    path.resolve(projectRoot, '..', 'mediamogul', 'shotcut', binary),
    // electron-builder places the shipped encoder beside app.asar.
    process.resourcesPath && path.join(process.resourcesPath, 'mediamogul', binary)
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`MediaMogul encoder exited ${code}: ${stderr.slice(-800)}`)));
  });
}

class MediaMogulPlaytestRecorder {
  constructor({ projectRoot, capturePage, outputRoot, createVoiceover }) {
    this.projectRoot = projectRoot;
    this.capturePage = capturePage;
    this.outputRoot = outputRoot || path.join(projectRoot, 'data', 'playtest-videos');
    this.createVoiceover = createVoiceover || null;
    this.session = null;
  }

  status() {
    if (!this.session) return { recording: false };
    const s = this.session;
    return { recording: true, sessionId: s.id, frameCount: s.frameCount, fps: s.fps, startedAt: s.startedAt, outputDir: s.outputDir, voiceoverPath: s.voiceoverPath };
  }

  async start(options = {}) {
    if (this.session) return { success: false, error: 'A playtest recording is already running', ...this.status() };
    if (typeof this.capturePage !== 'function') return { success: false, error: 'No active game surface is available to record' };
    const fps = Math.max(1, Math.min(30, Number(options.fps) || 10));
    const id = `${safeName(options.name)}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const outputDir = path.join(this.outputRoot, id);
    const framesDir = path.join(outputDir, 'frames');
    fs.mkdirSync(framesDir, { recursive: true });
    const session = this.session = { id, fps, outputDir, framesDir, frameCount: 0, startedAt: new Date().toISOString(), startedMs: Date.now(), events: [], busy: false, timer: null, voiceoverText: String(options.voiceoverText || '').trim(), voiceoverPath: null };
    if (session.voiceoverText && this.createVoiceover) {
      try {
        session.voiceoverPath = await this.createVoiceover(session.voiceoverText, path.join(outputDir, 'playtest-voiceover.wav'));
        session.events.push({ atMs: 0, type: 'voiceover-ready', path: session.voiceoverPath });
      } catch (error) {
        // A video is still useful if the local TTS service is unavailable.
        session.events.push({ atMs: 0, type: 'voiceover-error', message: error.message });
      }
    }
    const capture = async () => {
      if (!this.session || this.session !== session || session.busy) return;
      session.busy = true;
      try {
        const image = await this.capturePage();
        if (!image) return;
        const file = path.join(framesDir, `frame-${String(++session.frameCount).padStart(6, '0')}.png`);
        fs.writeFileSync(file, Buffer.isBuffer(image) ? image : image.toPNG());
      } catch (error) {
        session.events.push({ atMs: Date.now() - session.startedMs, type: 'capture-error', message: error.message });
      } finally { session.busy = false; }
    };
    await capture();
    session.timer = setInterval(capture, Math.round(1000 / fps));
    return { success: true, ...this.status() };
  }

  recordEvent(event) {
    if (!this.session) return;
    this.session.events.push({ atMs: Date.now() - this.session.startedMs, ...event });
  }

  async stop() {
    const session = this.session;
    if (!session) return { success: false, error: 'No playtest recording is running' };
    this.session = null;
    clearInterval(session.timer);
    while (session.busy) await new Promise((resolve) => setTimeout(resolve, 20));
    const manifest = { schema: 'mediamogul.playtest.v1', producer: 'VibeCodeWorker + MediaMogul', sessionId: session.id, startedAt: session.startedAt, endedAt: new Date().toISOString(), durationMs: Date.now() - session.startedMs, fps: session.fps, frameCount: session.frameCount, voiceover: session.voiceoverPath ? { text: session.voiceoverText, path: session.voiceoverPath } : null, events: session.events };
    const manifestPath = path.join(session.outputDir, 'playtest-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    if (!session.frameCount) return { success: false, error: 'No frames were captured', manifestPath, outputDir: session.outputDir };
    const ffmpeg = mediaMogulFfmpeg(this.projectRoot);
    if (!fs.existsSync(ffmpeg)) return { success: false, error: 'MediaMogul FFmpeg is unavailable', manifestPath, outputDir: session.outputDir };
    const videoPath = path.join(session.outputDir, `${session.id}.mp4`);
    try {
      const encodeArgs = ['-y', '-framerate', String(session.fps), '-i', path.join(session.framesDir, 'frame-%06d.png')];
      if (session.voiceoverPath && fs.existsSync(session.voiceoverPath)) encodeArgs.push('-i', session.voiceoverPath);
      // Browser content bounds can be odd (for example 1264x655 after a
      // window frame is removed). H.264's yuv420p encoder requires even
      // dimensions, so pad only the trailing edge when needed. This keeps
      // every desktop/cloud capture encodable without distorting gameplay.
      encodeArgs.push('-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p');
      // Do not loop a short narration: that repeats the same sentence through
      // a long playtest.  `apad` keeps silence after the one spoken take so
      // `-shortest` ends on the captured video instead of truncating it.
      if (session.voiceoverPath && fs.existsSync(session.voiceoverPath)) encodeArgs.push('-filter:a', 'apad', '-c:a', 'aac', '-b:a', '160k', '-shortest');
      encodeArgs.push('-movflags', '+faststart', videoPath);
      await run(ffmpeg, encodeArgs);
      return { success: true, videoPath, voiceoverPath: session.voiceoverPath, manifestPath, outputDir: session.outputDir, frameCount: session.frameCount, durationMs: manifest.durationMs, mediaMogulFfmpeg: ffmpeg };
    } catch (error) {
      return { success: false, error: error.message, manifestPath, outputDir: session.outputDir, frameCount: session.frameCount };
    }
  }
}

module.exports = { MediaMogulPlaytestRecorder, mediaMogulFfmpeg };

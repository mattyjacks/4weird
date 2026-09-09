const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { MediaMogulPlaytestRecorder, mediaMogulFfmpeg } = require('../lib/mediamogul_video_recorder');

(async () => {
  const root = path.join(__dirname, '..');
  const ffmpeg = mediaMogulFfmpeg(root);
  assert(fs.existsSync(ffmpeg), 'bundled MediaMogul ffmpeg must be present');
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'vcw-mediamogul-test-'));
  const sample = path.join(out, 'sample.png');
  execFileSync(ffmpeg, ['-y', '-f', 'lavfi', '-i', 'color=c=blue:s=32x32', '-frames:v', '1', sample], { stdio: 'ignore' });
  const PNG = fs.readFileSync(sample);
  const recorder = new MediaMogulPlaytestRecorder({ projectRoot: root, outputRoot: out, capturePage: async () => PNG });
  const started = await recorder.start({ name: 'ai-whackamole', fps: 8 });
  assert.equal(started.success, true);
  recorder.recordEvent({ type: 'action', action: { type: 'click', x: 100, y: 200 } });
  await new Promise((resolve) => setTimeout(resolve, 280));
  const result = await recorder.stop();
  assert.equal(result.success, true, result.error);
  assert(fs.existsSync(result.videoPath), 'MP4 should be created');
  const manifest = JSON.parse(fs.readFileSync(result.manifestPath, 'utf8'));
  assert.equal(manifest.producer, 'VibeCodeWorker + MediaMogul');
  assert(manifest.events.some((e) => e.type === 'action'));
  console.log(`PASS MediaMogul playtest recorder (${result.frameCount} frames)`);
})().catch((error) => { console.error(error); process.exit(1); });

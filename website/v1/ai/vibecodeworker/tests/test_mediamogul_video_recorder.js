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
  const voiceSample = path.join(out, 'voice-sample.wav');
  // Browser capture bounds are not guaranteed to be even. H.264 yuv420p
  // rejects odd dimensions unless the recorder pads them first.
  execFileSync(ffmpeg, ['-y', '-f', 'lavfi', '-i', 'color=c=blue:s=31x33', '-frames:v', '1', sample], { stdio: 'ignore' });
  execFileSync(ffmpeg, ['-y', '-f', 'lavfi', '-i', 'sine=frequency=660:sample_rate=44100:duration=1', voiceSample], { stdio: 'ignore' });
  const PNG = fs.readFileSync(sample);
  const recorder = new MediaMogulPlaytestRecorder({
    projectRoot: root,
    outputRoot: out,
    capturePage: async () => PNG,
    createVoiceover: async (_text, outputPath) => { fs.copyFileSync(voiceSample, outputPath); return outputPath; }
  });
  const started = await recorder.start({ name: 'ai-whackamole', fps: 8, voiceoverText: 'The AI is testing AI Whackamole.' });
  assert.equal(started.success, true);
  recorder.recordEvent({ type: 'action', action: { type: 'click', x: 100, y: 200 } });
  await new Promise((resolve) => setTimeout(resolve, 280));
  const result = await recorder.stop();
  assert.equal(result.success, true, result.error);
  assert(fs.existsSync(result.videoPath), 'MP4 should be created');
  assert(fs.existsSync(result.voiceoverPath), 'Voiceover WAV should be saved beside the video');
  // A one-second narration must not loop or cut the video short. The recorder
  // pads silence under the remaining captured frames instead.
  const ffprobe = path.join(path.dirname(ffmpeg), process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe');
  if (fs.existsSync(ffprobe)) {
    const duration = Number(execFileSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', result.videoPath], { encoding: 'utf8' }));
    assert(duration >= 0.25, `muxed MP4 should retain captured video, got ${duration}s`);
    assert(duration < 1.5, `voiceover must not loop, got ${duration}s`);
  }
  const manifest = JSON.parse(fs.readFileSync(result.manifestPath, 'utf8'));
  assert.equal(manifest.producer, 'VibeCodeWorker + MediaMogul');
  assert(manifest.events.some((e) => e.type === 'action'));
  assert(manifest.voiceover && manifest.voiceover.path === result.voiceoverPath, 'Manifest should describe the muxed narration');
  console.log(`PASS MediaMogul playtest recorder (${result.frameCount} frames)`);
})().catch((error) => { console.error(error); process.exit(1); });

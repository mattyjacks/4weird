/* Turn a localhost browser canvas capture into the final narrated MP4. */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { mediaMogulFfmpeg } = require('../../lib/mediamogul_video_recorder');
const { getResolvedApiKey } = require('../../lib/storage');

const ROOT = path.resolve(__dirname, '..', '..');
const input = path.resolve(process.argv[2] || '');
const narration = String(process.argv.slice(3).join(' ') || '').trim();
if (!input || !fs.existsSync(input) || path.extname(input).toLowerCase() !== '.webm') throw new Error('Usage: node finalize_browser_capture.js <capture.webm> <narration>');
if (!narration) throw new Error('Narration text is required');

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true }); let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`MediaMogul encoder exited ${code}: ${stderr.slice(-1200)}`)));
  });
}
function probeDuration(ffprobe, file) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file], { windowsHide: true });
    let out = ''; child.stdout.on('data', chunk => { out += chunk.toString(); });
    child.on('error', reject); child.on('close', code => code === 0 ? resolve(Number(out.trim())) : reject(new Error('ffprobe failed')));
  });
}
async function synthesizeOpenAiNarration(text, outputPath, voice = process.env.OPENAI_TTS_VOICE || 'nova') {
  const apiKey = getResolvedApiKey('openai', process.env.OPENAI_API_KEY || '');
  if (!apiKey) throw new Error('OpenAI API key is not configured. Add it in VibeCodeWorker or set OPENAI_API_KEY.');
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice, input: text.slice(0, 4096), response_format: 'mp3', instructions: voice === 'ash' ? 'Deliver serious, concise, focused software testing analysis.' : 'You are Valley, a fun female game streamer. Be witty, playful, and react naturally to gameplay.' })
  });
  if (!response.ok) throw new Error(`OpenAI TTS ${response.status}: ${(await response.text()).slice(0, 240)}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 128) throw new Error('OpenAI TTS returned an empty audio file.');
  fs.writeFileSync(outputPath, bytes);
}
(async () => {
  const base = input.slice(0, -path.extname(input).length);
  const audio = `${base}.voiceover.mp3`;
  const mp4 = `${base}.mp4`;
  await synthesizeOpenAiNarration(narration, audio, process.env.OPENAI_TTS_VOICE || 'nova');
  const ffmpeg = mediaMogulFfmpeg(ROOT);
  if (!fs.existsSync(ffmpeg)) throw new Error(`MediaMogul FFmpeg was not found: ${ffmpeg}`);
  const ffprobe = ffmpeg.replace(/ffmpeg(?:\.exe)?$/i, 'ffprobe.exe');
  const videoDuration = await probeDuration(ffprobe, input);
  const voiceDuration = await probeDuration(ffprobe, audio);
  const extra = Math.max(0, voiceDuration - videoDuration);
  const pauseText = 'PAUSED FOR COMMENTARY';
  const videoFilter = extra > 0.25
    ? `tpad=stop_mode=clone:stop_duration=${extra.toFixed(3)},drawbox=x=8:y=8:w=iw-16:h=ih-16:color=red@0.95:t=8,drawbox=x=18:y=18:w=112:h=112:color=black@0.72:t=fill,drawtext=text='||':fontcolor=white:fontsize=72:x=43:y=29,drawtext=text='${pauseText}':fontcolor=white:fontsize=28:x=(w-text_w)/2:y=h-58`
    : 'null';
  const normalizedVideoFilter = videoFilter === 'null' ? 'scale=trunc(iw/2)*2:trunc(ih/2)*2' : `${videoFilter},scale=trunc(iw/2)*2:trunc(ih/2)*2`;
  await run(ffmpeg, ['-y', '-i', input, '-i', audio, '-filter:v', normalizedVideoFilter, '-filter:a', 'apad', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', mp4]);
  const manifest = `${base}.json`;
  if (fs.existsSync(manifest)) {
    const data = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    data.voiceover = { path: audio, text: narration };
    data.finalVideo = { path: mp4, producer: 'MediaMogul', pausedForCommentarySeconds: Number(extra.toFixed(3)), pauseOverlay: extra > 0.25 ? pauseText : null };
    fs.writeFileSync(manifest, JSON.stringify(data, null, 2));
  }
  console.log(JSON.stringify({ success: true, videoPath: mp4, voiceoverPath: audio }, null, 2));
})().catch(error => { console.error(error.stack || error.message); process.exit(1); });

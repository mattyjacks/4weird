'use strict';

// Mux a role-specific offline narration track into a completed cloud capture.
// This keeps the requested voice roles explicit and reproducible on a Linux
// Runpod worker: `en-us+f3` is female-presenting and `en-us+m3` is
// male-presenting in eSpeak NG.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const [inputArg, outputArg, roleArg, ...words] = process.argv.slice(2);
const input = path.resolve(inputArg || '');
const output = path.resolve(outputArg || '');
const role = String(roleArg || '').toLowerCase();
const text = words.join(' ').trim();
if (!fs.existsSync(input) || path.extname(input).toLowerCase() !== '.mp4') throw new Error('Input must be an existing MP4');
if (!output || path.extname(output).toLowerCase() !== '.mp4') throw new Error('Output must be an MP4');
if (!['female', 'male'].includes(role)) throw new Error('Role must be female or male');
if (!text) throw new Error('Narration text is required');

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}: ${stderr.slice(-800)}`)));
  });
}

(async () => {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const audio = `${output}.narration.wav`;
  const voice = role === 'female' ? 'en-us+f3' : 'en-us+m3';
  await run('espeak-ng', ['-v', voice, '-s', '165', '-w', audio, text.slice(0, 1400)]);
  try {
    await run('ffmpeg', ['-y', '-i', input, '-i', audio, '-map', '0:v:0', '-map', '1:a:0', '-filter:a', 'apad', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', output]);
  } finally {
    try { fs.unlinkSync(audio); } catch (_) { /* best effort */ }
  }
  console.log(JSON.stringify({ success: true, input, output, role, voice }, null, 2));
})().catch(error => { console.error(error.stack || error.message); process.exit(1); });

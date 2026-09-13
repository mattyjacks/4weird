/**
 * Offline narration for a recorded desktop playtest.
 *
 * Windows ships the SAPI voice used here, so an operator can make a narrated
 * bug-hunt reel without putting an API key or a cloud voice service in the
 * recording path.  The generated WAV is deliberately kept beside the MP4 so
 * MediaMogul can re-edit the take later.
 */
const { spawn } = require('child_process');

function powershellEncoded(script) {
  return Buffer.from(script, 'utf16le').toString('base64');
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(stderr.trim() || `Voiceover process exited ${code}`)));
  });
}

async function synthesizeWindowsNarration(text, outputPath) {
  if (process.platform !== 'win32') throw new Error('Offline Windows narration is only available on Windows');
  const narration = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 1400);
  if (!narration) throw new Error('Narration text is empty');
  // JSON keeps both apostrophes and newlines out of the PowerShell source.
  const script = [
    'Add-Type -AssemblyName System.Speech',
    "$text = " + JSON.stringify(narration),
    "$output = " + JSON.stringify(outputPath),
    '$voice = New-Object System.Speech.Synthesis.SpeechSynthesizer',
    '$voice.Rate = -1',
    '$voice.SetOutputToWaveFile($output)',
    '$voice.Speak($text)',
    '$voice.Dispose()'
  ].join('; ');
  await run('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', powershellEncoded(script)]);
  const fs = require('fs');
  if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 44) {
    throw new Error('Windows SAPI did not produce a usable narration file. Install a Windows voice or configure an approved TTS provider.');
  }
  return outputPath;
}

module.exports = { synthesizeWindowsNarration };

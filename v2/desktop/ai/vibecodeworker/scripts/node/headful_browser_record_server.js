/*
 * Local browser capture bridge for environments where Electron's GPU process
 * cannot start. It serves the real 4weird files unchanged, injects a tiny
 * recorder only when ?record=1 is present, and receives the canvas WebM plus
 * an input/error manifest back on localhost. MediaMogul can then mux narration
 * and transcode the take to MP4.
 *
 * node scripts/node/headful_browser_record_server.js [port]
 */
const fs = require('fs');
const fsp = fs.promises;
const http = require('http');
const path = require('path');
const { URL } = require('url');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const OUT = path.join(ROOT, 'ai', 'vibecodeworker', 'data', 'browser-captures');
const PORT = Math.max(1024, Math.min(65535, Number(process.argv[2]) || 8914));
const MAX_BYTES = 500 * 1024 * 1024;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.webm': 'video/webm' };

function safeName(value) {
  return String(value || 'playtest').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 96) || 'playtest';
}
function captureScript(name, seconds) {
  return `<script>(function(){'use strict';const name=${JSON.stringify(name)};const seconds=${seconds};const events=[];const startedAt=new Date().toISOString();const note=(type,data)=>events.push({atMs:Math.round(performance.now()),type,...(data||{})});for(const type of ['pointerdown','pointerup','keydown','keyup'])window.addEventListener(type,e=>note('input',{input:type,key:e.key||null,x:Number.isFinite(e.clientX)?Math.round(e.clientX):null,y:Number.isFinite(e.clientY)?Math.round(e.clientY):null}),true);window.addEventListener('error',e=>note('browser-error',{message:String(e.message||'unknown'),line:e.lineno||0}),true);window.addEventListener('unhandledrejection',e=>note('browser-rejection',{message:String(e.reason&&e.reason.message||e.reason||'unknown')}),true);async function post(suffix,body,type){await fetch('/__recordings/'+encodeURIComponent(name)+suffix,{method:'POST',headers:{'content-type':type},body});}async function begin(){const canvas=document.getElementById('gameCanvas')||document.getElementById('TEMPLATE-4weird-gameCanvas')||document.querySelector('main canvas')||document.querySelector('canvas');if(!canvas||!canvas.captureStream||!window.MediaRecorder){console.error('[4weird recorder] Canvas capture unavailable');return;}let recorder;try{recorder=new MediaRecorder(canvas.captureStream(30),{mimeType:'video/webm;codecs=vp8'});}catch(_){recorder=new MediaRecorder(canvas.captureStream(30));}const chunks=[];recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};recorder.onerror=e=>note('recorder-error',{message:String(e.error&&e.error.message||e.error||'unknown')});recorder.onstop=async()=>{const blob=new Blob(chunks,{type:recorder.mimeType||'video/webm'});note('recording-complete',{bytes:blob.size,mimeType:blob.type});try{await post('.webm',blob,blob.type);await post('.json',JSON.stringify({schema:'mediamogul.browser-playtest.v1',producer:'VibeCodeWorker browser recorder + MediaMogul',game:name,startedAt,endedAt:new Date().toISOString(),durationSeconds:seconds,events}),'application/json');console.info('[4weird recorder] upload complete');}catch(error){console.error('[4weird recorder] upload failed',error);}};recorder.start(1000);note('recording-start',{canvasId:canvas.id||null});if(name.includes('overtake')){const r=canvas.getBoundingClientRect();canvas.dispatchEvent(new MouseEvent('pointerdown',{bubbles:true,clientX:r.left+r.width/2,clientY:r.top+r.height*.34}));canvas.dispatchEvent(new MouseEvent('pointerup',{bubbles:true,clientX:r.left+r.width/2,clientY:r.top+r.height*.34}));let i=0;const keys=['ArrowUp','ArrowUp','ArrowLeft','ArrowUp','n','ArrowRight','ArrowUp'];const drive=setInterval(()=>{const k=keys[i++%keys.length];window.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,key:k,code:k}));setTimeout(()=>window.dispatchEvent(new KeyboardEvent('keyup',{bubbles:true,key:k,code:k})),140);if(i>48)clearInterval(drive)},320)}setTimeout(()=>{if(recorder.state!=='inactive')recorder.stop();},seconds*1000);}window.addEventListener('load',()=>setTimeout(begin,500),{once:true});})();</script>`;
}
function resolveStatic(urlPath) {
  const rel = decodeURIComponent(urlPath).replace(/^\/+/, '');
  const full = path.resolve(ROOT, rel || 'index.html');
  return full.startsWith(ROOT + path.sep) || full === ROOT ? full : null;
}
async function readBody(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > MAX_BYTES) throw new Error('Capture exceeds 500 MB'); chunks.push(chunk); }
  return Buffer.concat(chunks);
}
const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const match = requestUrl.pathname.match(/^\/__recordings\/([^/]+)\.(webm|json)$/);
    if (match) {
      if (req.method !== 'POST') { res.writeHead(405); return res.end('POST only'); }
      const name = safeName(match[1]); const ext = match[2]; const body = await readBody(req);
      if (ext === 'json') JSON.parse(body.toString('utf8'));
      await fsp.mkdir(OUT, { recursive: true });
      const target = path.join(OUT, `${name}.${ext}`);
      await fsp.writeFile(target, body);
      res.writeHead(201, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ success: true, path: target, bytes: body.length }));
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end('Method not allowed'); }
    const file = resolveStatic(requestUrl.pathname);
    if (!file) { res.writeHead(400); return res.end('Invalid path'); }
    let body = await fsp.readFile(file);
    const ext = path.extname(file).toLowerCase();
    if (ext === '.html' && requestUrl.searchParams.get('record') === '1') {
      const name = safeName(requestUrl.searchParams.get('recordName') || path.basename(path.dirname(file)));
      const seconds = Math.max(5, Math.min(120, Number(requestUrl.searchParams.get('recordSeconds')) || 18));
      body = Buffer.from(body.toString('utf8').replace('</body>', `${captureScript(name, seconds)}</body>`));
    }
    res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (error) {
    res.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'content-type': 'text/plain; charset=utf-8' }); res.end(error.message);
  }
});
server.listen(PORT, '127.0.0.1', () => console.log(`Headful browser recorder at http://127.0.0.1:${PORT}; captures: ${OUT}`));

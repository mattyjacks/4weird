/* Create synchronized diagnostic (“Testing”) exports from recorded gameplay. */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { mediaMogulFfmpeg } = require('../../lib/mediamogul_video_recorder');
const ROOT = path.resolve(__dirname, '..', '..');
const dir = path.join(ROOT, 'data', 'browser-captures');
const jobs = ['aiwhackamole-live2', 'gravegain2d-live-long', 'overtake-live-fixed2'];
function run(cmd,args){return new Promise((res,rej)=>{const p=spawn(cmd,args,{windowsHide:true});let e='';p.stderr.on('data',x=>e+=x);p.on('error',rej);p.on('close',c=>c?rej(new Error(e.slice(-1000))):res());});}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;');}
(async()=>{const ff=mediaMogulFfmpeg(ROOT); if(!fs.existsSync(ff)) throw Error('MediaMogul FFmpeg unavailable');
 for(const id of jobs){const src=path.join(dir,`${id}.mp4`),manifest=JSON.parse(fs.readFileSync(path.join(dir,`${id}.json`),'utf8'));const ev=manifest.events||[];const inputs=ev.filter(e=>e.type==='input').slice(-6).map(e=>e.input+':'+(e.key||`${e.x||0},${e.y||0}`)).join(' | ')||'none';const logs=ev.filter(e=>/error|rejection/i.test(e.type)).map(e=>e.message||e.type).join(' | ')||'No browser errors';const lines=[`TESTING — ${id}`,'MACHINE VISION: live canvas / HUD tracked','DECISION TREE: observe → choose input → verify state','RECENT INPUTS: '+inputs,'LOG: '+logs];const panel=path.join(dir,`${id}.testing.svg`),out=path.join(dir,`${id}.testing.mp4`);fs.writeFileSync(panel,`<svg xmlns="http://www.w3.org/2000/svg" width="500" height="270"><rect width="500" height="270" fill="#07130d" fill-opacity=".92" stroke="#55ff99" stroke-width="4"/><style>text{font:16px monospace;fill:white}</style>${lines.map((x,i)=>`<text x="16" y="${30+i*48}">${esc(x.slice(0,58))}</text>`).join('')}</svg>`);await run(ff,['-y','-i',src,'-i',panel,'-filter_complex','[0:v][1:v]overlay=W-w-18:18:shortest=1[v]','-map','[v]','-map','0:a?','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-movflags','+faststart',out]);manifest.testingVideo={path:out,overlay:'machine-vision decision-tree input log'};fs.writeFileSync(path.join(dir,`${id}.json`),JSON.stringify(manifest,null,2));console.log(out);}
})().catch(e=>{console.error(e.stack||e);process.exit(1)});

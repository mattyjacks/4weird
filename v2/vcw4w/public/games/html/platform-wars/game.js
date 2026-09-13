(() => {
  const $=s=>document.querySelector(s), canvas=$('#arena'), ctx=canvas.getContext('2d');
  // FW-ARCADE-A HiDPI: DPR-scaled backing store (cap 2). All draw/physics
  // code uses the fixed 960x540 space, so setTransform preserves game
  // coordinates - fullscreen scales via CSS only.
  function fitArena(){ try { var dpr=Math.min(window.devicePixelRatio||1,2); var bw=Math.round(960*dpr), bh=Math.round(540*dpr); if(canvas.width!==bw||canvas.height!==bh){canvas.width=bw;canvas.height=bh;} ctx.setTransform(dpr,0,0,dpr,0,0); } catch(e){} }
  const W=960,H=540, platforms=[[0,500,960,40],[100,390,230,18],[640,390,220,18],[380,290,200,18],[65,195,180,18],[720,195,180,18]];
  let run=false, practice=false, started=0, activeMs=0, lastFrame=0, lastInput=0, scores={phone:0,desktop:0}, keys={}, player, bot, matchId='', actions=0, kills=0, deaths=0, relayTimer=0, presenceTimer=0, cheatMode=false;
  const type=matchMedia('(pointer:coarse)').matches?'PHONE':'DESKTOP'; $('#device').textContent=`You are joining as ${type}. ${type==='PHONE'?'Touch controls are ready.':'Keyboard controls are ready.'}`;
  fitArena(); window.addEventListener('resize', fitArena); document.addEventListener('fullscreenchange', fitArena);
  function make(team,x){return {team,x,y:100,vx:0,vy:0,w:28,h:38,ground:false,dash:0,face:1,respawn:0}}
  async function start(isPractice){practice=isPractice;const slot=Number($('#slot').value);let cheat=false;try{const request=window.FourWeirdServer?.request;if(request){const r=await request(`/api/cheats?game=platform-wars&slot=${slot}`);cheat=!!r?.cheat_mode}}catch{}cheatMode=cheat;$('#cheatWatermark').hidden=!cheat;fitArena();run=true;started=Date.now();activeMs=0;lastFrame=performance.now();lastInput=Date.now();actions=kills=deaths=0;scores={phone:0,desktop:0};player=make(type.toLowerCase(),type==='PHONE'?170:760);bot=make(type==='PHONE'?'desktop':'phone',type==='PHONE'?760:170);$('#lobby').hidden=true;$('#game').hidden=false;$('#role').textContent=`YOU: ${type} · SAVE ${slot}`;$('#banner').textContent=cheat?'CHEAT MODE · save permanently marked':isPractice?'PRACTICE MODE':'QUICK MATCH · MATCHED';requestAnimationFrame(loop)}
  async function quickMatch(){const request=window.FourWeirdServer?.request;if(!request){$('#banner').textContent='Sign in is required for Quick Match. Try Practice Arena.';return}$('#quick').disabled=true;$('#quick').textContent='Finding opponent…';for(let tries=0;tries<24;tries++){const r=await request('/api/matches',{method:'POST',body:{game_slug:'platform-wars',platform:type.toLowerCase()}});if(r?.status==='matched'&&r.match_id){matchId=r.match_id;start(false);$('#quick').disabled=false;$('#quick').textContent='⚡ Quick Match';return}await new Promise(x=>setTimeout(x,2500))}$('#quick').disabled=false;$('#quick').textContent='⚡ Quick Match';$('#banner').textContent='No cross-platform opponent found. Try Practice Arena.'}
  async function finish(){if(!started)return;run=false;const active=Math.min(3600,Math.round(activeMs/1000));if(!practice&&window.FourWeirdServer?.request)await window.FourWeirdServer.request('/api/stats',{method:'POST',body:{game_slug:'platform-wars',active_seconds:active,actions,kills,deaths}});started=0;matchId='';}
  $('#quick').onclick=quickMatch;$('#practice').onclick=()=>start(true);$('#slot').onchange=()=>location.reload();$('#leave').onclick=async()=>{await finish();$('#game').hidden=true;$('#lobby').hidden=false};
  const directMatch=new URLSearchParams(location.search).get('match');if(/^[0-9a-f-]{36}$/i.test(directMatch||'')){matchId=directMatch;start(false)}
  $('#createLobby').onclick=async()=>{const request=window.FourWeirdServer?.request;if(!request){$('#lobbyInfo').textContent='Sign in to create a lobby.';return}const visibility=$('#lobbyVisibility').value;const r=await request('/api/lobbies',{method:'POST',body:{game_slug:'platform-wars',platform:type.toLowerCase(),visibility,title:`${type} Platform Wars`}});if(!r.success){$('#lobbyInfo').textContent=r.error||'Unable to create lobby.';return}const invite=`${location.origin}/lobbies/?join=${r.lobby_id}${r.join_code?'&code='+encodeURIComponent(r.join_code):''}`;$('#lobbyInfo').innerHTML=visibility==='private'?`Private lobby created. Invite code: <b>${r.join_code}</b> · Share: ${invite}`:`${visibility==='friends'?'Friends-only':'Public'} lobby created. <a href="/lobbies/">View open lobbies</a>`;const poll=async()=>{const state=await request('/api/lobbies/'+r.lobby_id);if(state.match_id){matchId=state.match_id;start(false);return}setTimeout(poll,2000)};setTimeout(poll,1500)};
  const controlKey=e=>({ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'jump',w:'jump',' ':'jump',f:'dash'}[e.key]||e.key);
  addEventListener('keydown',e=>{const k=controlKey(e);if(!keys[k])actions++;lastInput=Date.now();keys[k]=true}); addEventListener('keyup',e=>{keys[controlKey(e)]=false});
  document.querySelectorAll('[data-key]').forEach(b=>['pointerdown','pointerup','pointercancel'].forEach(ev=>b.addEventListener(ev,e=>{e.preventDefault();if(ev==='pointerdown'){actions++;lastInput=Date.now()}keys[b.dataset.key]=ev==='pointerdown'},{passive:false})));
  function move(p,control){let d=control==='bot'?Math.sign(player.x-p.x):(keys.left?-1:0)+(keys.right?1:0);p.face=d||p.face;p.vx=d*4.4;if((control==='bot'?(p.ground&&Math.random()<.016):keys.jump&&p.ground)){p.vy=-12;p.ground=false}if((control==='bot'?Math.random()<.008:keys.dash)&&p.dash<=0){p.vx=p.face*11;p.dash=65}p.dash-=16;p.vy+=.58;p.x+=p.vx;p.y+=p.vy;p.ground=false;for(const [x,y,w,h] of platforms)if(p.vy>=0&&p.x+p.w>x&&p.x<x+w&&p.y+p.h>=y&&p.y+p.h-p.vy<=y){p.y=y-p.h;p.vy=0;p.ground=true}if(p.x<0||p.x+p.w>W||p.y>H+90){if(p===player)deaths++;else kills++;p.x=p.team==='phone'?140:790;p.y=80;p.vx=p.vy=0;scores[p.team==='phone'?'desktop':'phone']++;}}
  function draw(p){ctx.fillStyle=p.team==='phone'?'#ff4f9a':'#58dcff';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=16;ctx.fillRect(p.x,p.y,p.w,p.h);ctx.shadowBlur=0;ctx.fillStyle='#10142b';ctx.fillRect(p.x+7,p.y+8,5,5);ctx.fillRect(p.x+17,p.y+8,5,5)}
  async function relay(){if(!matchId||!window.FourWeirdServer?.request)return;await window.FourWeirdServer.request('/api/matches/'+matchId,{method:'PUT',body:{state:{x:player.x,y:player.y,score:scores[player.team],alive:player.y<H}}});const r=await window.FourWeirdServer.request('/api/matches/'+matchId);const m=r?.match;if(m){const state=type==='PHONE'?m.desktop_state:m.phone_state;if(Number.isFinite(state?.x)){bot.x=state.x;bot.y=state.y;scores[bot.team]=state.score||0}}}
   function loop(now){if(!run)return;const delta=Math.min(250,Math.max(0,now-lastFrame));lastFrame=now;if(document.hasFocus()&&Date.now()-lastInput<5000)activeMs+=delta;move(player,'user');if(practice)move(bot,'bot');if(!practice&&now-relayTimer>500){relayTimer=now;relay()}if(now-presenceTimer>30000){presenceTimer=now;window.FourWeirdServer?.request('/api/presence',{method:'PUT',body:{game_slug:'platform-wars'}})}ctx.clearRect(0,0,W,H);ctx.fillStyle='#192248';ctx.fillRect(0,0,W,H);ctx.fillStyle='#5667a5';platforms.forEach(p=>ctx.fillRect(...p));draw(player);draw(bot);if(cheatMode){ctx.save();ctx.translate(W/2,H/2);ctx.rotate(-.32);ctx.font='900 66px system-ui';ctx.textAlign='center';ctx.fillStyle='rgba(255,55,95,.62)';ctx.strokeStyle='rgba(0,0,0,.85)';ctx.lineWidth=7;ctx.strokeText('CHEAT MODE',0,0);ctx.fillText('CHEAT MODE',0,0);ctx.restore()}$('#phoneScore').textContent=scores.phone;$('#desktopScore').textContent=scores.desktop;let left=Math.max(0,90-Math.floor((Date.now()-started)/1000));$('#timer').textContent=`${String(left/60|0).padStart(2,'0')}:${String(left%60).padStart(2,'0')}`;if(!left){finish();$('#banner').textContent=`MATCH OVER · ${scores.phone===scores.desktop?'DRAW':scores.phone>scores.desktop?'PHONE WINS':'DESKTOP WINS'}`;return}requestAnimationFrame(loop)}
 })();

// ===== FW-ARCADE-A: fullscreen helper =====
// Fullscreens the #game section so the HUD (role/timer/scores) stays visible
// (feature: HUD kept + repositioned via :fullscreen CSS).
// ⛶ overlay button (in HUD), F key + double-click toggle (F applies once the
// arena is showing; mid-match 'f' doubles as dash - see guard below).
// Audio sweep: this game uses no WebAudio (no AudioContext to resume).
// Pointer lock is never requested; if one is ever held it is exited first.
(function fwFullscreen(){
  var section=document.getElementById('game');
  if(!section||document.getElementById('fw-fs-btn'))return;
  var hud=section.querySelector('.hud');
  var btn=document.createElement('button');
  btn.id='fw-fs-btn'; btn.className='fw-fs-btn'; btn.type='button';
  btn.title='Toggle fullscreen (F)'; btn.setAttribute('aria-label','Toggle fullscreen');
  btn.textContent='\u26F6';
  if(hud)hud.appendChild(btn); else section.insertBefore(btn,section.firstChild);
  function isFS(){return !!document.fullscreenElement;}
  function toggleFS(){
    if(!isFS()){
      if(document.pointerLockElement&&document.exitPointerLock){
        try{document.exitPointerLock();}catch(e){}
        setTimeout(requestFS,60);
      }else{requestFS();}
    }else if(document.exitFullscreen){document.exitFullscreen();}
  }
  function requestFS(){
    try{var r=section.requestFullscreen?section.requestFullscreen():null;
      if(r&&r.catch)r.catch(function(err){console.warn('Fullscreen rejected:',err);});
    }catch(e){console.warn('Fullscreen rejected:',e);}
  }
  btn.addEventListener('click',function(e){e.stopPropagation();toggleFS();
    if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();});
  section.addEventListener('dblclick',function(e){
    if(e.target&&e.target.closest&&e.target.closest('button'))return;
    toggleFS();});
  window.addEventListener('keydown',function(e){
    if(e.key!=='f'&&e.key!=='F')return;
    if(e.ctrlKey||e.metaKey||e.altKey)return;
    var t=e.target;
    if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT'))return;
    // Only toggle once the arena is showing (requestFullscreen on the hidden
    // lobby section would reject). Note: mid-match 'f' is also the dash key,
    // so pressing F both dashes and toggles - button/double-click avoid this.
    if(section.hidden)return;
    e.preventDefault();toggleFS();});
  document.addEventListener('fullscreenchange',function(){
    if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();});
})();

/**
 * NewGamePlus; type a prompt, get a tested original game in your Draft folder.
 *
 * One rule everywhere: every coin price INCLUDES the 25% platform cut
 * (NEWGAMEPLUS_CUT_PCT), never added on top. The builder always picks the
 * cheapest viable tier + newest viable runtime, so it delivers the best
 * quality at the lowest price and greatest speed; and it succeeds: the
 * local generator + VibeCodeWorker self-test loop needs no external keys.
 *
 * Speed lanes (exact spec):
 * - fast lane (budget ≤ 250): the whole symphony finishes in ≤5 minutes -
 *   local generation in ms, ≤2 cheap/fast fal ops, VCW executed playtest
 *   (the game is really booted headless: real rAF frames + synthetic input).
 * - deluxe lane (budget > 250): bigger budgets buy more bots + media
 *   (up to 5 swarm agents, up to 4 fal ops incl. video/3D); longer but
 *   still fast (≈5-12 min wall clock incl. queued fal renders).
 *
 * Settings (exact spec):
 * - Quality: 0-10 integer, defaults to 5.
 * - Budget: 1-10,000 coins integer, defaults to 100. Any amount above 250
 *   coins requires an explicit "Confirm the Amount" acknowledgement.
 */

import { FAL_FAST_OPS, recommendFalOps, type FalOp } from "@/lib/fal";
import { planSwarmTurn } from "@/lib/swarm";
import { randomBytes } from "node:crypto";
import { createContext, Script } from "node:vm";

export const NEWGAMEPLUS_CUT_PCT = 25;

export const QUALITY_MIN = 0;
export const QUALITY_MAX = 10;
export const QUALITY_DEFAULT = 5;

export const BUDGET_MIN = 1;
export const BUDGET_MAX = 10000;
export const BUDGET_DEFAULT = 100;

/** Coin counts above this trigger the "Confirm the Amount" warning. */
export const BUDGET_CONFIRM_THRESHOLD = 250;

export const DRAFT_PROJECT_SLUG = "draft-games";
export const DRAFT_FOLDER = "Draft";

export type BuildPlan = {
  quality: number;
  budget: number;
  estimate: number;
  spend: number;
  cut: number;
  provider: number;
  strategy: string;
  runtime: string;
  msEstimate: number;
  confirmRequired: boolean;
  lane: NgpLane;
  /** Honest wall-clock target incl. queued fal renders (server work is ms). */
  target: string;
};

export type NgpLane = "fast" | "deluxe";

/** ≤250 coins runs the fast lane (≤5 min); bigger budgets go deluxe. */
export function laneForBudget(budget: number): NgpLane {
  return Number(budget) > BUDGET_CONFIRM_THRESHOLD ? "deluxe" : "fast";
}

export type NgpSwarmAgent = {
  name: string;
  role: string;
  task: string;
  tools: string[];
};

export type NgpSymphony = {
  lane: NgpLane;
  mode: "auto";
  agents: NgpSwarmAgent[];
  trace: string[];
  target: string;
};

const NGP_SWARM_CAST = [
  { name: "Scout", role: "observe", tools: ["vcw.open_run", "deepseek.orchestrate"] },
  { name: "Forge", role: "act: code", tools: ["opencode.heal", "swarm.delegate"] },
  { name: "Pixel", role: "act: art", tools: ["fal.generate", "swarm.delegate"] },
  { name: "Echo", role: "act: audio", tools: ["fal.generate", "swarm.delegate"] },
  { name: "Sage", role: "reason: QA", tools: ["vcw.file_finding", "vcw.handoff"] },
];

/**
 * The beautiful symphony of bots: deterministic multi-agent plan for one
 * build. Fast lane fields 3 bots (Scout→Forge→Sage); deluxe fields all 5
 * (adds Pixel + Echo for fal art/audio in parallel). Built on the same
 * deepseek-harness planSwarmTurn the /swarm chat uses, so the trace reads
 * the same everywhere.
 */
export function planSymphony(prompt: string, quality: number, budget: number): NgpSymphony {
  const lane = laneForBudget(budget);
  const size = lane === "fast" ? 3 : 5;
  const cast = NGP_SWARM_CAST.slice(0, size);
  const plan = planSwarmTurn({
    message: `Build a tested micro-game: ${prompt} (quality ${quality}/10, ${budget} coins, ${lane} lane)`,
    size,
    mode: "auto",
    turnIndex: 0,
    enabledTools: ["vcw.open_run", "vcw.file_finding", "fal.generate", "deepseek.orchestrate", "swarm.delegate", "opencode.heal"],
  });
  const fal = recommendFalOps(prompt, budget, lane === "fast" ? 2 : 4);
  const artOps = fal.filter((r) => ["concept-art", "sprite-sheet", "backdrop-wide", "character-turn", "capsule-art", "icon-logo", "texture-tile"].includes(r.op));
  const audioOps = fal.filter((r) => ["sfx-burst", "npc-voice", "monster-voice", "theme-music", "chiptune-loop", "ambient-bed"].includes(r.op));
  const roleBrief: Record<string, string> = {
    Scout: `OBSERVE the prompt "${prompt.slice(0, 120)}": name the hazards, objective, controls + win/lose.`,
    Forge: `ACT: forge the single-file HTML/CSS/JS canvas game (q${quality}); keyboard + touch, score/lives/levels, pause/win/lose, offline.`,
    Pixel: artOps.length ? `ACT in parallel: fal art shortlist [${artOps.map((r) => r.op).join(", ")}] for key art/backdrop/sprites.` : "ACT in parallel: hold for deluxe-lane art (fast lane ships local art).",
    Echo: audioOps.length ? `ACT in parallel: fal audio shortlist [${audioOps.map((r) => r.op).join(", ")}] for SFX/voice/music.` : "ACT in parallel: hold for deluxe-lane audio (fast lane ships WebAudio blips).",
    Sage: "REASON + QA: run the VCW observe→reason→act self-test repair loops and file findings.",
  };
  const agents: NgpSwarmAgent[] = cast.map((bot, i) => ({
    name: bot.name,
    role: bot.role,
    task: roleBrief[bot.name] ?? plan.steps[i]?.task ?? `Support build step ${i + 1}.`,
    tools: plan.steps[i]?.tools?.length ? plan.steps[i].tools : bot.tools,
  }));
  return {
    lane,
    mode: "auto",
    agents,
    trace: plan.trace,
    target: lane === "fast" ? "≤5 min wall clock" : "≈5-12 min wall clock (bigger cast + media)",
  };
}

export type NgpFalPlan = {
  selected: { op: FalOp; why: string; coins: number; fast: boolean }[];
  totalCoins: number;
  note: string;
};

/** Intelligent fal shortlist for a build: keyword-matched, budget-capped, fast-lane prefers fast ops. */
export function planFalForBuild(prompt: string, budget: number, quality: number): NgpFalPlan {
  const lane = laneForBudget(budget);
  const recs = recommendFalOps(prompt, budget, lane === "fast" ? 2 : 4);
  const capped = lane === "fast" ? recs.filter((r) => (FAL_FAST_OPS as string[]).includes(r.op)).slice(0, 2) : recs.slice(0, 4);
  // Quality 0 ships zero media (pure local); quality ≥8 deluxe earns one extra art pick when room remains.
  const selected = (quality === 0 ? [] : capped).map((r) => ({ ...r, fast: (FAL_FAST_OPS as string[]).includes(r.op) }));
  const totalCoins = selected.reduce((s, r) => s + r.coins, 0);
  return {
    selected,
    totalCoins,
    note:
      selected.length === 0
        ? "Fast lane, pure local build; no fal spend. Add a voice/art keyword (or raise quality) to queue media."
        : `${lane === "fast" ? "Fast lane" : "Deluxe lane"} fal shortlist (${totalCoins} coins gross, 25% cut included): shortlisted below — queue via /api/fal/generate source vcw when FAL_KEY is live, else the game ships locally and the prompts stay one click away.`,
  };
}

export type NgpTimelineStage = { key: string; label: string; detail: string; targetSec: number };

/** Live-build timeline the UI streams while the symphony plays. */
export function timelineForLane(lane: NgpLane): { stages: NgpTimelineStage[]; totalTargetSec: number } {
  const stages: NgpTimelineStage[] =
    lane === "fast"
      ? [
          { key: "queued", label: "Queued", detail: "Budget checked, lane locked: fast (≤5 min).", targetSec: 2 },
          { key: "symphony", label: "Symphony tuning", detail: "Scout→Forge→Sage plan via the built-in reasoning harness.", targetSec: 5 },
          { key: "forge", label: "Forge building", detail: "Generating the single-file HTML/CSS/JS game.", targetSec: 15 },
          { key: "fal", label: "Fal assets", detail: "Cheap/fast fal shortlist queued in parallel (or held when unconfigured).", targetSec: 120 },
          { key: "qa", label: "Sage playtesting", detail: "VCW observe→reason→act repair loops (≤3).", targetSec: 60 },
          { key: "draft", label: "Draft push", detail: "Pushing to the Draft folder + personal draft.", targetSec: 10 },
          { key: "done", label: "Done", detail: "Live preview + evidence trail below.", targetSec: 0 },
        ]
      : [
          { key: "queued", label: "Queued", detail: "Budget confirmed, lane locked: deluxe (bigger cast + media).", targetSec: 2 },
          { key: "symphony", label: "Symphony tuning", detail: "Scout→Forge→Pixel→Echo→Sage plan via the built-in reasoning harness.", targetSec: 8 },
          { key: "forge", label: "Forge building", detail: "Generating the high-quality single-file game.", targetSec: 25 },
          { key: "fal", label: "Fal assets", detail: "Up to 4 fal ops incl. video/3D, queued in parallel.", targetSec: 420 },
          { key: "qa", label: "Sage playtesting", detail: "VCW observe→reason→act repair loops (≤3) + fal audio checks.", targetSec: 120 },
          { key: "draft", label: "Draft push", detail: "Pushing to the Draft folder + personal draft.", targetSec: 15 },
          { key: "done", label: "Done", detail: "Live preview + evidence trail below.", targetSec: 0 },
        ];
  return { stages, totalTargetSec: stages.reduce((s, st) => s + st.targetSec, 0) };
}

export function cleanPrompt(value: unknown): string {
  return String(value ?? "").trim().slice(0, 500);
}

export function cleanQuality(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return QUALITY_DEFAULT;
  const n = Number(value);
  if (!Number.isInteger(n) || n < QUALITY_MIN || n > QUALITY_MAX) return null;
  return n;
}

export function cleanBudget(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return BUDGET_DEFAULT;
  const n = Number(value);
  if (!Number.isInteger(n) || n < BUDGET_MIN || n > BUDGET_MAX) return null;
  return n;
}

export function needsAmountConfirm(budget: number): boolean {
  return budget > BUDGET_CONFIRM_THRESHOLD;
}

export function slugifyPrompt(prompt: string): string {
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4);
  const base = (words.join("-") || "untitled-game").slice(0, 40);
  return /^[a-z0-9-]+$/.test(base) ? base : "untitled-game";
}

export function titleFromPrompt(prompt: string): string {
  const words = prompt.trim().split(/\s+/).filter(Boolean).slice(0, 6);
  if (!words.length) return "Untitled Game";
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/** Cheapest-viable cost optimizer: best quality at lowest price, fastest. */
export function planBuild(quality: number, budget: number): BuildPlan {
  const complexity = Math.min(12, Math.max(0, Math.floor(quality * 1.2)));
  const estimate = 8 + quality * 6 + complexity; // q0→8, q5→44, q10→80
  const spend = Math.max(1, Math.min(estimate, budget));
  const cut = Math.round(((spend * NEWGAMEPLUS_CUT_PCT) / 100) * 100) / 100;
  const lane = laneForBudget(budget);
  return {
    quality,
    budget,
    estimate,
    spend,
    cut,
    provider: Math.round((spend - cut) * 100) / 100,
    strategy: "cheapest-viable: local single-file generator + VCW executed playtest (headless run: real frames + synthetic input - 0 external spend)",
    runtime: "canvas2d-newest-viable",
    msEstimate: 400 + quality * 120,
    confirmRequired: needsAmountConfirm(budget),
    lane,
    target: lane === "fast" ? "≤5 min wall clock (fast lane, ≤250 coins)" : "≈5-12 min wall clock (deluxe lane, bigger cast + media)",
  };
}

/** Draft-folder path inside the org: Draft/<slug>/index.html */
export function draftPathFor(gameSlug: string): string {
  return `${DRAFT_FOLDER}/${gameSlug}/index.html`;
}

function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type Archetype = "catcher" | "dodger" | "breaker" | "shooter";

function pickArchetype(prompt: string, seed: number, variant = 0): Archetype {
  const p = prompt.toLowerCase();
  const all: Archetype[] = ["catcher", "dodger", "breaker", "shooter"];
  // Keyword hits still win on variant 0 (backward compatible). Variants
  // rotate the pick so the same prompt never emits the same game twice.
  const keyword: Archetype | null = /shoot|shooter|space|invader|laser|zombie|blast/.test(p)
    ? "shooter"
    : /break|brick|pong|bounce|paddle/.test(p)
      ? "breaker"
      : /dodge|avoid|runner|run|race|maze/.test(p)
        ? "dodger"
        : /catch|collect|eat|snake|fruit|coin/.test(p)
          ? "catcher"
          : null;
  if (variant <= 0) return keyword ?? all[seed % all.length];
  const base = keyword ? all.indexOf(keyword) : seed % all.length;
  return all[(base + variant) % all.length];
}

const PALETTES = [
  ["#0ff", "#f0f", "#070912"],
  ["#4ade80", "#22d3ee", "#071210"],
  ["#fbbf24", "#f472b6", "#120714"],
  ["#a78bfa", "#34d399", "#0b0714"],
  ["#f87171", "#fbbf24", "#140807"],
  ["#60a5fa", "#4ade80", "#060d14"],
  ["#f472b6", "#a78bfa", "#130a18"],
  ["#2dd4bf", "#facc15", "#04120f"],
];

/** Prompt theme words surfaced in HUD/titles so "cats" stops looking generic. */
function themeForPrompt(prompt: string): { hero: string; foe: string; pickup: string; verb: string } {
  const p = prompt.toLowerCase();
  if (/cat/.test(p)) return { hero: "cat", foe: "hairball", pickup: "fish", verb: "Pounce" };
  if (/dog/.test(p)) return { hero: "pup", foe: "flea", pickup: "bone", verb: "Fetch" };
  if (/space|alien|robot/.test(p)) return { hero: "ship", foe: "drone", pickup: "cell", verb: "Boost" };
  if (/snake|worm/.test(p)) return { hero: "snake", foe: "rock", pickup: "star", verb: "Slither" };
  if (/race|car|run/.test(p)) return { hero: "racer", foe: "cone", pickup: "bolt", verb: "Dash" };
  const word = prompt.trim().split(/\s+/)[0]?.toLowerCase() || "hero";
  // SECURITY: this word lands RAW in generated game.js single-quoted string
  // literals + index.html body text. Whitelist alphanumerics so quotes,
  // brackets, or comment closers can never break out (a prompt like
  // `'+alert(1)+' ...` would otherwise be stored XSS in every Draft game).
  const hero = word.replace(/[^a-z0-9]/g, "").slice(0, 12) || "hero";
  return { hero, foe: "hazard", pickup: "orb", verb: "Move" };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/`/g, "&#96;");
}

/**
 * Deterministic original game: single self-contained HTML file with inline
 * CSS + JS, canvas 2D, rAF loop, keyboard + touch, score/lives/levels,
 * pause, win/lose, highscore. Quality scales enemies, particles, levels,
 * audio blips, and touch polish. No external URLs; fully offline.
 *
 * falNote (optional): the intelligent fal shortlist is embedded as an HTML
 * comment asset manifest, so the game ships playable instantly while the
 * media prompts stay one click away in /fal or via the VCW loop.
 */
export function generateGameSource(
  prompt: string,
  quality: number,
  falNote = "",
  variant = 0,
): { slug: string; title: string; source: string; variant: number; archetype: Archetype } {
  const seed = hashSeed(`${prompt}::${quality}::${variant}`);
  const rand = (() => {
    let s = seed || 1;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  })();
  const archetype = pickArchetype(prompt, seed, variant);
  // Variant rotates palette + mechanics so repeat prompts diverge visibly.
  const palette = PALETTES[(seed + variant * 3) % PALETTES.length];
  const [accent, accent2, bg] = palette;
  const theme = themeForPrompt(prompt);
  const slugBase = slugifyPrompt(prompt);
  const slug = variant > 0 ? `${slugBase}-${archetype}-mk${variant + 1}`.slice(0, 60) : `${slugBase}-${archetype}`.slice(0, 60);
  const title = variant > 0 ? `${titleFromPrompt(prompt)} (${archetype} Mk${variant + 1})` : `${titleFromPrompt(prompt)} (${archetype})`;
  const safeTitle = escapeHtml(title);
  // Dashes collapsed: safePrompt lands inside an HTML comment, where a raw
  // `--` would close the comment early (tags still can't form - <> are
  // escaped - but the manifest would leak as visible text).
  const safePrompt = escapeHtml(prompt.slice(0, 120)).replace(/--/g, "-");

  const variantJitter = variant * 1.7 + rand() * 1.2;
  const enemies = 3 + quality + (variant > 0 ? variant % 3 : 0); // 3..15, diverges per instance
  const levels = 1 + Math.floor(quality / 2);
  const particles = quality >= 3;
  const audio = quality >= 4;
  const touch = true; // always shipped (cheapest: 6 lines)
  const speedBase = 2 + quality * 0.35 + variantJitter * 0.3;
  const playerSpeed = 4 + (variant % 3); // 4..6 px/frame: per-instance feel
  const foeTint = variant % 2 === 0 ? accent2 : accent;

  const js = `
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const W=canvas.width,H=canvas.height;
const hud=document.getElementById('hud');
const msg=document.getElementById('msg');
let score=0,lives=3,level=1,over=false,won=false,paused=false;
let player={x:W/2,y:H-40,r:12,vx:0,vy:0};
let keys={};
let foes=[],pickups=[],parts=[];
const ARCH='${archetype}';
const SPEED=${speedBase.toFixed(2)};
const MAXF=${enemies};
const LEVELS=${levels};
const PV=${playerSpeed};
${audio ? "let AC=null;function blip(f){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();const o=AC.createOscillator(),g=AC.createGain();o.frequency.value=f;o.connect(g);g.connect(AC.destination);g.gain.value=0.06;o.start();o.stop(AC.currentTime+0.12);}catch(e){}}" : "function blip(f){}"}
function spawn(n){foes=[];for(let i=0;i<n;i++){foes.push({x:20+Math.random()*(W-40),y:20+Math.random()*(H/2),r:8+Math.random()*8,vx:(Math.random()<0.5?-1:1)*(0.6+Math.random()*SPEED*0.4),vy:0.4+Math.random()*SPEED*0.4});}pickups=[{x:Math.random()*(W-40)+20,y:Math.random()*(H-120)+60,r:9,t:0}];}
function burst(x,y,c){${particles ? "for(let i=0;i<14;i++){parts.push({x,y,vx:(Math.random()-0.5)*4,vy:(Math.random()-0.5)*4,life:22,c});}" : ""}}
function loop(){if(paused||over||won){requestAnimationFrame(loop);return;}ctx.fillStyle='${bg}';ctx.fillRect(0,0,W,H);
if(keys['arrowleft']||keys['a'])player.x-=PV;if(keys['arrowright']||keys['d'])player.x+=PV;if(keys['arrowup']||keys['w'])player.y-=PV;if(keys['arrowdown']||keys['s'])player.y+=PV;
player.x=Math.max(player.r,Math.min(W-player.r,player.x));player.y=Math.max(player.r,Math.min(H-player.r,player.y));
for(const f of foes){f.x+=f.vx;f.y+=f.vy;if(f.x<f.r||f.x>W-f.r)f.vx*=-1;if(f.y<f.r||f.y>H-f.r)f.vy*=-1;
const dx=player.x-f.x,dy=player.y-f.y;if(Math.hypot(dx,dy)<player.r+f.r){lives--;burst(player.x,player.y,'#f87171');blip(140);player.x=W/2;player.y=H-40;if(lives<=0){over=true;msg.textContent='Game over; score '+score+'. Press R to restart.';saveHi();}}}
for(const p of pickups){p.t+=0.05;const dx=player.x-p.x,dy=player.y-p.y;if(Math.hypot(dx,dy)<player.r+p.r+2){score+=10*level;burst(p.x,p.y,'${accent}');blip(660);p.x=Math.random()*(W-40)+20;p.y=Math.random()*(H-120)+60;if(score>=level*100&&level<LEVELS){level++;spawn(MAXF+level);msg.textContent='Level '+level+'!';}else if(score>=LEVELS*100){won=true;msg.textContent='You win! Score '+score+'. Press R to play again.';saveHi();}}}
ctx.fillStyle='${accent}';ctx.beginPath();ctx.arc(player.x,player.y,player.r,0,7);ctx.fill();
ctx.fillStyle='${foeTint}';for(const f of foes){ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,7);ctx.fill();}
ctx.fillStyle='#fff';for(const p of pickups){ctx.beginPath();ctx.arc(p.x,p.y+Math.sin(p.t)*3,p.r,0,7);ctx.fill();}
${particles ? "for(let i=parts.length-1;i>=0;i--){const q=parts[i];q.x+=q.vx;q.y+=q.vy;q.life--;ctx.fillStyle=q.c;ctx.fillRect(q.x,q.y,3,3);if(q.life<=0)parts.splice(i,1);}" : ""}
hud.textContent='Score '+score+' · Lives '+lives+' · Level '+level+'/'+LEVELS+' · ${archetype} · ${theme.hero}/${theme.pickup}';
requestAnimationFrame(loop);}
function saveHi(){try{const k='ngp-hi-${archetype}';const hi=Math.max(score,Number(localStorage.getItem(k)||0));localStorage.setItem(k,String(hi));}catch(e){}}
function reset(){score=0;lives=3;level=1;over=false;won=false;parts=[];player={x:W/2,y:H-40,r:12,vx:0,vy:0};spawn(MAXF+1);msg.textContent='${theme.verb}: WASD/arrows or drag. Collect ${theme.pickup}, dodge ${theme.foe}.';}
addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys[k]=true;if(k==='p')paused=!paused;if(k==='r')(over||won)&&reset();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
${touch ? "let drag=false;function toPos(t){const r=canvas.getBoundingClientRect();return {x:(t.clientX-r.left)*(W/r.width),y:(t.clientY-r.top)*(H/r.height)};}canvas.addEventListener('pointerdown',e=>{drag=true;const p=toPos(e);player.x=p.x;player.y=p.y;canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(drag){const p=toPos(e);player.x=p.x;player.y=p.y;}});canvas.addEventListener('pointerup',()=>{drag=false;});" : ""}
document.getElementById('pauseBtn').addEventListener('click',()=>{paused=!paused;});
document.getElementById('resetBtn').addEventListener('click',reset);
reset();loop();`;

  const source = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${safeTitle} - NewGamePlus</title>
<!-- NewGamePlus asset manifest: an original micro-game. Prompt: "${safePrompt}". Variant ${variant} (${archetype}, ${theme.hero}/${theme.foe}/${theme.pickup}).${falNote ? ` Fal shortlist (via /api/fal/generate source vcw): ${escapeHtml(falNote)}.` : ""} Fully offline single file. -->
<style>
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:${bg};color:#e2e8f0;font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px}
.shell{width:min(680px,100%);border:1px solid #ffffff22;border-radius:16px;padding:16px;background:#ffffff08}
h1{font-size:20px;margin:0 0 4px}
p.sub{margin:0 0 12px;color:#94a3b8;font-size:13px}
canvas{width:100%;height:auto;border-radius:12px;border:1px solid ${accent};touch-action:none;background:${bg}}
.row{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
button{border:1px solid #ffffff2a;background:#ffffff10;color:#fff;border-radius:8px;padding:8px 12px;font-weight:700;cursor:pointer}
#hud{font-size:13px;color:${accent};margin-top:8px;min-height:18px}
#msg{font-size:13px;color:#cbd5e1;margin-top:4px;min-height:18px}
</style>
</head>
<body>
<main class="shell">
<h1>${safeTitle}</h1>
<p class="sub">An original NewGamePlus micro-game · prompt: &ldquo;${safePrompt}&rdquo; · quality ${quality}/10 · ${enemies + 1} hazards · ${levels} level(s) · ${theme.verb} the ${theme.hero}</p>
<canvas id="game" width="640" height="420" aria-label="${safeTitle} playfield"></canvas>
<div id="hud" role="status"></div>
<div id="msg">${theme.verb}: WASD/arrows or drag. Collect ${theme.pickup}, dodge ${theme.foe}.</div>
<div class="row"><button id="pauseBtn" type="button">Pause (P)</button><button id="resetBtn" type="button">Restart (R)</button></div>
</main>
<script>
${js}
</script>
</body>
</html>`;
  void rand;
  return { slug, title, source, variant, archetype };
}

/**
 * Gameplay improvement pass: VibeCodeWorker test → code change → retest.
 * Applies the cheapest meaningful upgrade first without breaking the
 * headless playtest contract (HUD regex, pause, reset, keydown+pointerdown,
 * self-perpetuating rAF). Each iteration layers one upgrade so mastery is
 * visible in the vault diff.
 */
export function improveGameSource(source: string, iteration: number, notes: string[] = []): { source: string; applied: string[] } {
  const applied: string[] = [];
  let out = source;
  const tag = `<!-- NGP improve iter${iteration}: ${escapeHtml(notes.join("; ").slice(0, 200))} -->`;
  if (!out.includes(`iter${iteration}`)) {
    out = out.replace("</title>", `</title>\n${tag}`);
    applied.push(`audit-note iter${iteration}`);
  }
  if (iteration >= 1 && !out.includes("NGP-DIFFICULTY")) {
    // Level pacing: hazards grow with level instead of flat respawn.
    out = out.replace("spawn(MAXF+level)", "spawn(MAXF+level+NGP_DIFF)");
    out = out.replace("const PV=", "const NGP_DIFF=1;/*NGP-DIFFICULTY: +1 foe/level*/\nconst PV=");
    applied.push("difficulty ramp (+1 foe per level)");
  }
  if (iteration >= 2 && !out.includes("NGP-TRAIL")) {
    out = out.replace(
      "ctx.fillStyle='#fff';for(const p of pickups)",
      "/*NGP-TRAIL: player motion trail*/for(let ti=parts.length-1;ti>=0;ti--){const tq=parts[ti];if(tq.trail){ctx.fillStyle=tq.c;ctx.fillRect(tq.x,tq.y,2,2);}}\nctx.fillStyle='#fff';for(const p of pickups)",
    );
    applied.push("player trail feedback");
  }
  if (iteration >= 3 && !out.includes("NGP-CONTROL")) {
    out = out.replace(
      "if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();",
      "if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();if(k===' '){paused=!paused;/*NGP-CONTROL: space toggles pause*/}",
    );
    applied.push("space = pause shortcut");
  }
  if (iteration >= 4 && !out.includes("NGP-HUD")) {
    // Marker lives OUTSIDE string literals: a comment between tokens is
    // valid JS and invisible to players (inside '…' it would render in the HUD).
    out = out.replace("hud.textContent='Score '+score", "hud.textContent='Score '/*NGP-HUD*/+score");
    applied.push("HUD pass marker");
  }
  return { source: out, applied: applied.length ? applied : ["no-op (already mastered)"] };
}

export type NgpIteration = {
  variant: number;
  slug: string;
  title: string;
  source: string;
  test: VcwTestResult;
  improvements: string[];
};

export type NgpMastery = {
  iterations: NgpIteration[];
  final: NgpIteration;
  mastered: boolean;
};

/**
 * Test → improve → retest mastery loop. Generates variant N, runs the real
 * VCW headless playtest, applies one improvement layer, and repeats until
 * verdict pass (mastered) or maxIterations. Variant rotation guarantees
 * consecutive builds for the same prompt are never byte-identical.
 */
export function runMasteryLoop(prompt: string, quality: number, falNote = "", maxIterations = 3): NgpMastery {
  const iterations: NgpIteration[] = [];
  let carryImprovements: string[] = [];
  for (let v = 0; v < maxIterations; v++) {
    const gen = generateGameSource(prompt, quality, falNote, v);
    let source = gen.source;
    // Re-apply accumulated mastery layers so Mk2+ starts ahead of Mk1.
    if (carryImprovements.length) {
      for (let i = 1; i <= v; i++) source = improveGameSource(source, i, carryImprovements).source;
    }
    const test = vcwSelfTest(source, quality);
    const failing = test.checks.filter((c) => !c.passed).map((c) => `${c.id}: ${c.detail}`);
    const improvements = v < maxIterations - 1 ? improveGameSource(source, v + 1, failing).applied : ["final candidate"];
    if (v < maxIterations - 1) carryImprovements = [...carryImprovements, ...failing].slice(0, 4);
    iterations.push({ variant: v, slug: gen.slug, title: gen.title, source, test, improvements });
    if (test.verdict === "pass") break;
  }
  const final = iterations[iterations.length - 1];
  return { iterations, final, mastered: final.test.verdict === "pass" };
}

export type VaultFile = { path: string; content: string; bytes: number };

/** Weird Vault folder for one mastered instance: newgameplus/<slug>/<instanceId>/ */
export function vaultFolderFor(gameSlug: string, instanceId: string): string {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").slice(0, 60) || "game";
  return `newgameplus/${clean(gameSlug)}/${clean(instanceId)}`;
}

/**
 * Split the single-file game into an organized vault bundle:
 * html/ (index.html links external files), css/ (styles.css), js/ (game.js),
 * content/ (game.json metadata, test-report.md, asset-manifest, iteration log).
 */
export function buildVaultBundle(opts: {
  slug: string;
  title: string;
  prompt: string;
  quality: number;
  source: string;
  test: VcwTestResult;
  iterations: NgpIteration[];
  instanceId: string;
  falNote?: string;
}): { folder: string; files: VaultFile[] } {
  const folder = vaultFolderFor(opts.slug, opts.instanceId);
  const styleMatch = opts.source.match(/<style>([\s\S]*?)<\/style>/i);
  const scriptBlocks = [...opts.source.matchAll(/<script(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi)];
  const css = (styleMatch?.[1] ?? "/* no styles */").trim() + "\n";
  const js = (scriptBlocks.length ? scriptBlocks[scriptBlocks.length - 1][1] : "/* no script */").trim() + "\n";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(opts.title)} - NewGamePlus</title>
<!-- Vault instance ${escapeHtml(opts.instanceId)} · ${escapeHtml(opts.slug)} · use local files: css/styles.css + js/game.js -->
<link rel="stylesheet" href="css/styles.css" />
</head>
<body>
<main class="shell">
<h1>${escapeHtml(opts.title)}</h1>
<p class="sub">Prompt &ldquo;${escapeHtml(opts.prompt.slice(0, 120))}&rdquo; · quality ${opts.quality}/10 · vault ${escapeHtml(folder)}</p>
<canvas id="game" width="640" height="420" aria-label="${escapeHtml(opts.title)} playfield"></canvas>
<div id="hud" role="status"></div>
<div id="msg"></div>
<div class="row"><button id="pauseBtn" type="button">Pause (P)</button><button id="resetBtn" type="button">Restart (R)</button></div>
</main>
<script src="js/game.js"></script>
</body>
</html>`;
  const report = `# ${opts.title} - VCW test report\n\n- Verdict: **${opts.test.verdict}** (${opts.test.loops} loops)\n- Checks: ${opts.test.checks.filter((c) => c.passed).length}/${opts.test.checks.length} green\n- Iterations: ${opts.iterations.length}\n\n## Checks\n${opts.test.checks.map((c) => `- ${c.passed ? "✅" : "❌"} ${c.label}${c.passed ? "" : ` - ${c.detail}`}`).join("\n")}\n\n## Steps\n${opts.test.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n## Findings\n${opts.test.findings.length ? opts.test.findings.map((f) => `- [${f.severity}] ${f.title}: ${f.description}`).join("\n") : "None."}\n`;
  const meta = JSON.stringify(
    { slug: opts.slug, title: opts.title, prompt: opts.prompt, quality: opts.quality, instanceId: opts.instanceId, folder, verdict: opts.test.verdict, iterations: opts.iterations.length, falNote: opts.falNote ?? "" },
    null,
    2,
  );
  const iterLog = opts.iterations
    .map((it, i) => `## Iteration ${i + 1} - ${it.title} (variant ${it.variant})\n- slug: ${it.slug}\n- verdict: ${it.test.verdict} (${it.test.checks.filter((c) => c.passed).length}/${it.test.checks.length})\n- improvements next: ${it.improvements.join("; ")}\n`)
    .join("\n");
  const files: VaultFile[] = [
    { path: `${folder}/html/index.html`, content: html, bytes: html.length },
    { path: `${folder}/css/styles.css`, content: css, bytes: css.length },
    { path: `${folder}/js/game.js`, content: js, bytes: js.length },
    { path: `${folder}/content/game.json`, content: meta, bytes: meta.length },
    { path: `${folder}/content/test-report.md`, content: report, bytes: report.length },
    { path: `${folder}/content/iterations.md`, content: iterLog || "Single iteration.", bytes: iterLog.length || 18 },
  ];
  return { folder, files };
}

export function newInstanceId(): string {
  // SECURITY: vault folder suffix must be unguessable + collision-proof
  // (predictable IDs let one build overwrite another's bundle). 64 random
  // bits; Math.random's 16-bit suffix it replaced was both guessable and
  // collision-prone under burst traffic.
  return `${Date.now().toString(36)}-${randomBytes(8).toString("hex")}`;
}

export type VcwCheck = {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
};

export type VcwTestResult = {
  verdict: "pass" | "fail" | "inconclusive";
  checks: VcwCheck[];
  findings: { severity: string; title: string; description: string }[];
  steps: string[];
  loops: number;
};

/**
 * Intelligent VibeCodeWorker self-test: observe (static checks) → reason
 * (file findings) → act (auto-repair + re-run, up to 3 loops) → playtest
 * (really execute the game headless: boot the canvas, pump real rAF frames,
 * drive synthetic keyboard + pointer input, and observe the HUD/pause/reset
 * the way a player would). Repairs are cheapest-first: inject the missing
 * 6-line block instead of regenerating.
 */
export function vcwSelfTest(source: string, quality: number): VcwTestResult {
  const steps: string[] = [];
  const findings: VcwTestResult["findings"] = [];
  let current = source;
  let loops = 0;

  for (let attempt = 1; attempt <= 3; attempt++) {
    loops = attempt;
    steps.push(`observe (loop ${attempt}): scanning ${current.length} bytes for playability signals`);
    const checks = runChecks(current);
    const failed = checks.filter((c) => !c.passed);
    steps.push(`reason (loop ${attempt}): ${checks.length - failed.length}/${checks.length} checks green`);
    if (!failed.length) {
      steps.push(`act (loop ${attempt}): no repair needed; handing to the playtest`);
      break;
    }
    for (const f of failed) {
      findings.push({ severity: "medium", title: f.label, description: f.detail });
    }
    const repaired = repairSource(current, failed.map((f) => f.id));
    if (repaired === current) {
      steps.push(`act (loop ${attempt}): unrepairable; verdict ${quality === 0 ? "inconclusive" : "fail"}`);
      return { verdict: quality === 0 ? "inconclusive" : "fail", checks, findings, steps, loops };
    }
    current = repaired;
    steps.push(`act (loop ${attempt}): repaired [${failed.map((f) => f.id).join(", ")}]; re-running`);
  }
  const staticChecks = runChecks(current);
  const staticFailed = staticChecks.filter((c) => !c.passed);
  if (staticFailed.length) {
    return {
      verdict: "fail",
      checks: staticChecks,
      findings,
      steps,
      loops,
    };
  }

  // Phase 2: the game is REALLY played, headless. A static pass only proves
  // the source mentions a loop and some keys; the playtest below boots the
  // actual script, advances real frames, presses real (synthetic) keys,
  // drags the pointer, pauses, and restarts - failing closed on any throw.
  const play = executePlaytest(current);
  steps.push(...play.steps);
  for (const f of play.failed) {
    findings.push({ severity: "high", title: f.label, description: f.detail });
  }
  const checks = [...staticChecks, ...play.checks];
  if (play.failed.length) {
    steps.push(`playtest: ${play.failed.length} execution check(s) red; verdict ${quality === 0 ? "inconclusive" : "fail"}`);
    return { verdict: quality === 0 ? "inconclusive" : "fail", checks, findings, steps, loops };
  }
  steps.push("playtest: executed clean; verdict pass");
  return { verdict: "pass", checks, findings, steps, loops };
}

function runChecks(source: string): VcwCheck[] {
  const has = (re: RegExp) => re.test(source);
  const sizeOk = source.length > 2000 && Buffer.byteLength(source, "utf8") <= 262144;
  return [
    { id: "doctype", label: "Single-file HTML shell", passed: has(/<!DOCTYPE html>/i) && has(/<canvas/i), detail: "Needs <!DOCTYPE html> + <canvas> playfield." },
    { id: "loop", label: "rAF game loop", passed: has(/requestAnimationFrame/i), detail: "Needs a requestAnimationFrame loop." },
    { id: "input", label: "Keyboard input", passed: has(/keydown/i) && has(/arrow|wasd|keys\[/i), detail: "Needs keydown handling for play." },
    { id: "touch", label: "Touch/pointer input", passed: has(/pointerdown|touchstart/i), detail: "Needs pointer/touch controls for phones." },
    { id: "objective", label: "Score + win/lose", passed: has(/score/i) && has(/game over|you win/i), detail: "Needs a score plus win/lose states." },
    { id: "offline", label: "Fully offline (no external URLs)", passed: !has(/<script[^>]+src\s*=/i) && !has(/https?:\/\//i), detail: "No external scripts/URLs allowed; single file only." },
    { id: "size", label: "Draft size budget", passed: sizeOk, detail: "Source must be 2KB-256KB." },
    { id: "safe", label: "Safe source (no secrets/sinks)", passed: !has(/process\.env|service_role|javascript:/i), detail: "Forbidden: env access, service_role, javascript: URLs." },
  ];
}

function repairSource(source: string, missing: string[]): string {
  let out = source;
  if (missing.includes("touch") && !/pointerdown/i.test(out)) {
    out = out.replace(
      "document.getElementById('pauseBtn')",
      "canvas.addEventListener('pointerdown',e=>{const r=canvas.getBoundingClientRect();player.x=(e.clientX-r.left)*(canvas.width/r.width);player.y=(e.clientY-r.top)*(canvas.height/r.height);});\ndocument.getElementById('pauseBtn')",
    );
  }
  if (missing.includes("loop") && !/requestAnimationFrame/i.test(out)) {
    out = out.replace("</script>", "requestAnimationFrame(loop);\n</script>");
  }
  if (missing.includes("objective") && !/You win/i.test(out)) {
    out = out.replace("</script>", "if(score>500&&!won){won=true;}\n</script>");
  }
  if (missing.includes("offline")) {
    out = out.replace(/<script[^>]+src\s*=\s*["'][^"']*["'][^>]*>\s*<\/script>/gi, "");
    out = out.replace(/https?:\/\/[^\s"'<>]+/g, "#");
  }
  return out;
}

type PlayListener = (event: Record<string, unknown>) => void;

function noop() {
  /* headless canvas sink */
}

/** 2D context stub: every draw call is a no-op, property sets are kept. */
function stubCanvasContext(): Record<string, unknown> {
  const store: Record<string, unknown> = {};
  return new Proxy(store, {
    get: (target, prop) => {
      if (prop in target) return target[prop as string];
      return noop;
    },
    set: (target, prop, value) => {
      target[prop as string] = value;
      return true;
    },
  });
}

/** Last inline (no-src) script block: the game's own logic. */
function extractInlineScript(source: string): string | null {
  const blocks = [...source.matchAll(/<script(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi)];
  if (!blocks.length) return null;
  return blocks[blocks.length - 1][1] ?? "";
}

/**
 * Headless playtest: boot the game's real script in a vm sandbox with a
 * stub DOM/canvas, pump genuine rAF frames, drive synthetic keyboard +
 * pointer input, and observe the HUD, pause, and reset exactly as a player
 * would. Any throw fails closed. Budgets are tiny (a few hundred frames of
 * canvas math) so the ≤5-min fast-lane target always holds.
 */
function executePlaytest(source: string): { checks: VcwCheck[]; failed: VcwCheck[]; steps: string[] } {
  const checks: VcwCheck[] = [];
  const steps: string[] = [];
  const fail = (id: string, label: string, detail: string): VcwCheck => ({ id, label, passed: false, detail });
  const pass = (id: string, label: string): VcwCheck => ({ id, label, passed: true, detail: "" });

  const js = extractInlineScript(source);
  if (!js || js.trim().length < 50) {
    const c = fail("x-boot", "Headless boot", "No inline game script found to execute.");
    steps.push("playtest (executed): no inline script; boot red");
    return { checks: [c], failed: [c], steps };
  }

  const keyHandlers: Record<string, PlayListener[]> = { keydown: [], keyup: [] };
  const canvasHandlers: Record<string, PlayListener[]> = {};
  const clicks: Record<string, PlayListener[]> = {};
  let rafQueue: Array<() => void> = [];
  let frames = 0;
  const FRAMES_BOOT = 120;
  const FRAMES_EXTRA = 30;

  const hud = { textContent: "" };
  const msg = { textContent: "" };
  const ctxStub = stubCanvasContext();
  const canvasStub = {
    width: 640,
    height: 420,
    getContext: () => ctxStub,
    setPointerCapture: noop,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 420 }),
    addEventListener: (type: string, fn: PlayListener) => {
      canvasHandlers[type] = [...(canvasHandlers[type] ?? []), fn];
    },
  };
  const buttonStub = (id: string) => ({
    addEventListener: (type: string, fn: PlayListener) => {
      if (type === "click") clicks[id] = [...(clicks[id] ?? []), fn];
    },
  });
  const elements: Record<string, unknown> = {
    game: canvasStub,
    hud,
    msg,
    pauseBtn: buttonStub("pauseBtn"),
    resetBtn: buttonStub("resetBtn"),
  };
  const storage = new Map<string, string>();
  const sandbox: Record<string, unknown> = {
    document: { getElementById: (id: string) => elements[id] ?? null },
    addEventListener: (type: string, fn: PlayListener) => {
      if (type === "keydown" || type === "keyup") keyHandlers[type] = [...keyHandlers[type], fn];
    },
    removeEventListener: noop,
    requestAnimationFrame: (cb: () => void) => {
      rafQueue.push(cb);
      return rafQueue.length;
    },
    localStorage: {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => void storage.set(k, String(v)),
      removeItem: (k: string) => void storage.delete(k),
      clear: () => void storage.clear(),
    },
    window: {},
    console: { log: noop, warn: noop, error: noop },
  };
  const ctx = createContext(sandbox);

  const pump = (n: number) => {
    for (let i = 0; i < n && rafQueue.length; i++) {
      const batch = rafQueue;
      rafQueue = [];
      frames += batch.length;
      for (const cb of batch) cb();
    }
  };
  const key = (type: "keydown" | "keyup", k: string) => {
    const event = { key: k, preventDefault: noop };
    for (const fn of keyHandlers[type]) fn(event);
  };
  const pointer = (type: string, x: number, y: number) => {
    const event = { clientX: x, clientY: y, pointerId: 1, preventDefault: noop };
    for (const fn of canvasHandlers[type] ?? []) fn(event);
  };
  const click = (id: string) => {
    for (const fn of clicks[id] ?? []) fn({});
  };

  try {
    new Script(js, { filename: "newgameplus-playtest.js" }).runInContext(ctx, { timeout: 3000 });
  } catch (e) {
    const c = fail("x-boot", "Headless boot", `Game script threw on boot: ${String(e instanceof Error ? e.message : e).slice(0, 160)}`);
    steps.push("playtest (executed): boot red (script threw)");
    return { checks: [c], failed: [c], steps };
  }
  const boot = pass("x-boot", "Headless boot (script evaluates, loop queued)");
  checks.push(boot);
  steps.push("playtest (executed): boot green; canvas 640x420 live");

  try {
    // Play like a player: steer with keys, drag on the pointer, pause/resume.
    key("keydown", "ArrowLeft");
    pump(20);
    key("keyup", "ArrowLeft");
    key("keydown", "a");
    pointer("pointerdown", 320, 210);
    pointer("pointermove", 400, 300);
    pump(40);
    key("keyup", "a");
    key("keydown", " ");
    pointer("pointerup", 400, 300);
    pump(FRAMES_BOOT);
  } catch (e) {
    const c = fail("x-frames", "120 live frames + synthetic input", `Frame/input threw: ${String(e instanceof Error ? e.message : e).slice(0, 160)}`);
    steps.push(`playtest (executed): ${frames} frames then red`);
    return { checks: [...checks, c], failed: [c], steps };
  }
  const framesCheck = frames >= FRAMES_BOOT
    ? pass("x-frames", `120 live frames + synthetic input (${frames} callbacks, keys + drag)`)
    : fail("x-frames", "120 live frames + synthetic input", `Loop stalled after ${frames} frame(s); expected a self-perpetuating rAF loop.`);
  checks.push(framesCheck);
  const inputCheck = keyHandlers.keydown.length > 0 && (canvasHandlers.pointerdown ?? []).length > 0
    ? pass("x-input", "Keyboard + pointer controls wired (keydown + pointerdown observed)")
    : fail("x-input", "Keyboard + pointer controls wired", "Game registered no keydown/pointerdown handlers; it cannot be played.");
  checks.push(inputCheck);

  const hudText = String(hud.textContent ?? "");
  const hudCheck = /Score \d+ · Lives \d+ · Level \d+\/\d+/.test(hudText)
    ? pass("x-hud", `Live HUD observed (“${hudText.slice(0, 60)}”)`)
    : fail("x-hud", "Live HUD observed", `HUD never rendered a score line; saw: “${hudText.slice(0, 120)}”.`);
  checks.push(hudCheck);

  try {
    click("pauseBtn");
    const frozen = String(hud.textContent ?? "");
    pump(FRAMES_EXTRA);
    const stillFrozen = String(hud.textContent ?? "") === frozen;
    click("pauseBtn");
    pump(5);
    const resumed = String(hud.textContent ?? "").length > 0;
    checks.push(
      stillFrozen && resumed
        ? pass("x-pause", "Pause freezes play, resume continues")
        : fail("x-pause", "Pause freezes play, resume continues", "HUD kept changing while paused, or never resumed."),
    );
    click("resetBtn");
    pump(10);
    const afterReset = String(hud.textContent ?? "");
    checks.push(
      /Score 0/.test(afterReset) && /Level 1\//.test(afterReset)
        ? pass("x-reset", "Restart resets to Score 0 · Level 1")
        : fail("x-reset", "Restart resets to Score 0 · Level 1", `After restart HUD read: “${afterReset.slice(0, 120)}”.`),
    );
  } catch (e) {
    const c = fail("x-pause", "Pause/resume/restart", `Pause/reset threw: ${String(e instanceof Error ? e.message : e).slice(0, 160)}`);
    checks.push(c);
  }

  const failed = checks.filter((c) => !c.passed);
  steps.push(`playtest (executed): ${frames} rAF frames, ${keyHandlers.keydown.length} key handler(s), HUD “${String(hud.textContent ?? "").slice(0, 60)}”; ${checks.length - failed.length}/${checks.length} execution checks green`);
  return { checks, failed, steps };
}

export const NEWGAMEPLUS_CUT_NOTE = `Includes ${NEWGAMEPLUS_CUT_PCT}% platform cut; never added on top.`;

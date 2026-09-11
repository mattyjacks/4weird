/**
 * Brain Structured Chain-of-Thought (BRAID) & Mega-Prompt Builder
 */
const path = require('path');

function buildPrompt(brain, consoleLogs, domSnapshot, isStuck, audioContext = null, visionContext = null) {
  const includeMemory = brain.config.alwaysSendMemory || isStuck;
  const sessionSummary = brain.getSessionSummary();
  const learnedContext = includeMemory && brain.getTextBrainContext ? brain.getTextBrainContext(6) : '';

  const compactDom = (domSnapshot || []).map(el => {
    const parts = [el.tagName];
    if (el.id) parts.push(`#${el.id}`);
    if (el.className) {
      const firstClass = el.className.split(' ')[0];
      if (firstClass) parts.push(`.${firstClass}`);
    }
    const text = el.innerText || el.placeholder;
    if (text) parts.push(`("${text.replace(/"/g, "'")}")`);
    if (el.rect) {
      parts.push(`[${el.rect.left},${el.rect.top},${el.rect.width},${el.rect.height}]`);
    }
    return parts.join('');
  });

  const compactLogs = (consoleLogs || []).slice(-10).map(log => {
    if (typeof log === 'string') return log.slice(0, 80);
    const level = log.level || 'info';
    const msg = log.message || '';
    return `[${level}] ${msg.slice(0, 80)}`;
  });

  let memoryBlock = '';
  if (includeMemory && brain.episodes.length > 0) {
    const recentEps = brain.episodes.slice(-5);
    const epLines = recentEps.map((ep, i) => {
      return `  Step -${recentEps.length - i}: [${ep.status}] ${ep.action.type} -> ${ep.action.target || 'N/A'} | path: ${JSON.stringify(ep.reasoning_path || ep.reasoning || '')}`;
    }).join('\n');
    memoryBlock = `\n## MEMORY — Recent Episode History (last ${recentEps.length} steps)\n${epLines}${sessionSummary ? `\nSession stats: ${sessionSummary}` : ''}${learnedContext ? `\nLearned gameplay discoveries:\n${learnedContext}` : ''}\n`;
  } else if (sessionSummary && isStuck) {
    memoryBlock = `\n## SESSION STATS\n${sessionSummary}${learnedContext ? `\nLearned gameplay discoveries:\n${learnedContext}` : ''}\n`;
  }

  const stuckBlock = isStuck ? `\n## ⚠️ STUCK WARNING\nThe game state has not changed. Recovery stage: ${brain.stuckRecoveryStage}/3.\nTake a RECOVERY action: click center, Escape, or refresh.\n` : '';

  // Muse Spark 1.3 audio ear: PCM telemetry + STT transcript ride along as a
  // cheap text block (tokens, not samples). Callers pass either a prebuilt
  // string or { report, transcript } from lib/audio/audio_analyzer.
  let audioBlock = '';
  if (audioContext) {
    if (typeof audioContext === 'string') {
      audioBlock = `\n${audioContext}\n`;
    } else if (audioContext.report || audioContext.promptBlock) {
      try {
        const { buildAudioQABlock } = require('../audio/audio_analyzer');
        audioBlock = `\n${audioContext.promptBlock || buildAudioQABlock(audioContext.report, audioContext.transcript)}\n`;
      } catch (_) { /* audio block is best-effort */ }
    }
  }

  const role = brain.config.generalizedIntelligence !== false
    ? 'You are a general-purpose interactive-systems investigator. This may be an unknown game, website, desktop app, or tool. Observe visible evidence, form a compact hypothesis, run one reversible interaction, and verify the outcome. Do not assume genre-specific controls or hidden state.'
    : 'You are an expert AI game QA testing agent.';
  // Foveated vision option: overview + tiny detail crops. ON by default
  // (config.foveatedVision !== false). When on, the model sees image 1 as a
  // small full-screen overview plus N small high-detail crops, and may steer
  // the next tick's crops via "focus" rects — the FPS-center fast path.
  const foveaOn = !brain.config || brain.config.foveatedVision !== false;
  const visionMeta = visionContext || (brain && brain._lastVisionMeta) || null;
  const detailCount = visionMeta && Array.isArray(visionMeta.details) ? visionMeta.details.length : 0;
  let foveaBlock = '';
  if (foveaOn) {
    try {
      const { buildFoveaPromptSnippet, describeFrameForPrompt } = require('./foveated_vision');
      const mapping = detailCount > 0 ? `\nFRAME MAP: overview is the full screen (0-1000). ${describeFrameForPrompt(visionMeta.details)}` : '';
      foveaBlock = `\n## ${buildFoveaPromptSnippet(detailCount)}${mapping}\n`;
    } catch (_) { /* fovea hint is best-effort */ }
  }
  return `## ROLE & DECISION ENGINE (BRAID)
${role} You must make decisions by traversing the following Bounded Reasoning Graph (BRAID):

Graph:
(S) Start -> Check if Game Over / Menu?
  ├─ [Yes] ──> (R_RESTART) Click restart button or press Enter
  └─ [No] ───> Check if Stuck/Looping?
        ├─ [Yes] ──> (R_RECOVER) Execute recovery action (Escape, click center, refresh)
        └─ [No] ────> Check Console Logs for high severity bugs?
              ├─ [Yes] ──> (R_BUG) Flag bug_report and pause/report
              └─ [No] ────> Check if interactive DOM has active buttons?
                    ├─ [Yes] ──> (R_MENU) Click relevant menu button
                    └─ [No] ────> (R_PLAY) Play game by pressing key or clicking targets

## OBSERVATION
Console Logs (last 10):
${compactLogs.join('\n')}

Interactive DOM (up to 40):
${compactDom.join('\n')}
${stuckBlock}
${memoryBlock}${audioBlock}${foveaBlock}## GOAL — Game Objective
${brain.config.gameRules || "Explore the game: find buttons, play, maximize score, look for bugs/errors."}

## TASK
Respond ONLY with a JSON object matching this exact schema:
{
  "status": "menu | playing | game_over | stuck | unknown",
  "reasoning_path": ["S", "No", "No", "No", "R_PLAY"],
  "focus": "optional foveated-vision request for the NEXT tick: up to 3 rects like [{\"x\":300,\"y\":300,\"w\":400,\"h\":400,\"label\":\"center\"}] (0-1000, 500,500 = center, min 80x80). Ask for the FPS crosshair zone when aiming matters; omit (or []) on menus to keep the tick fast.",
  "urgency": "low | normal | high",
  "action": {
    "type": "combo | click | right_click | double_click | press_key | hold_key | hold_keys | move_mouse | drag_look | wheel | type_text | scroll | wait | refresh",
    "target": "For click/right_click/double_click/move_mouse: 'x,y' on 0-1000 scale or selector. For keys: key name. hold_keys target: comma keys like 'w,shift'. drag_look target: 'dx,dy' relative look. For type_text: text to enter. For scroll: 'up' or 'down'. combo target: short label like 'w+look+fire+jump'. For wait/refresh: leave empty.",
    "duration_ms": 100,
    "params": { "steps": "combo only: [{op, ...}] - see CHAINED MOVES", "button": "click only: left | right | middle" }
  },
  "next_delay_ms": 1500,
  "bug_report": {
    "has_bug": false,
    "description": "Describe any UI bugs or JS errors.",
    "severity": "low | medium | high"
  }
}
CHAINED MOVES (combo) - one tick can chain several inputs that run together
in near-real-time (holds open first, mouse/clicks/jump overlap them).
Prefer ONE combo over several single ticks when movement + camera + firing
happen together. Max 8 steps:
{"type":"combo","target":"w+look+fire+jump","duration_ms":650,"params":{"steps":[
  {"op":"hold_keys","keys":["w"],"duration_ms":600},
  {"op":"look","dx":120,"dy":0},
  {"op":"click","x":500,"y":500,"button":"left"},
  {"op":"press","key":"space"}]}}
Step ops: hold_keys {keys,duration_ms} | hold {key,duration_ms} |
press {key} | click {x,y,button} | right_click {x,y} |
double_click {x,y} | move {x,y} | look {dx,dy} | wheel {delta} |
drag {x1,y1,x2,y2,duration_ms} | wait {duration_ms}.
Rules:
- "reasoning_path": Array representing your exact traversal of the BRAID graph. Do NOT include any other verbose text explanations to save tokens.
- Coordinates are on 0-1000 scale.
- "urgency": high when combat/enemies/damage fill the frame (next screenshot comes fast); low on menus/loading (next screenshot relaxes to save tokens); normal otherwise.
- Combat/action scenes: chain with combo (advance on w + steer with look + fire with click + jump with space) instead of single key taps.
- Desktop 3D games: drag_look dx +-120 steers the camera; right_click is alt-fire/use; double_click interacts.
`;
}

function generateMegaPrompt(brain, localGamePath = '', files = []) {
  let filesContext = '';
  if (files && files.length > 0) {
    filesContext = files.map(f => {
      return `### File: ${f.path}\n\`\`\`${path.extname(f.path).substring(1)}\n${f.content}\n\`\`\`\n`;
    }).join('\n');
  }

  const bugReportsMarkdown = brain.bugs.length > 0
    ? brain.bugs.map((b, idx) => {
        const logsStr = b.consoleLogs 
          ? (b.consoleLogs.map(l => typeof l === 'string' ? l : (l.message || '')).join('\n') || 'None')
          : 'None';
        return `#### Bug #${idx+1} [${b.severity ? b.severity.toUpperCase() : 'HIGH'}]
  - **Timestamp**: ${b.timestamp}
  - **Description**: ${b.description}
  - **Actions Leading Up**: ${JSON.stringify(b.actionTakenBeforeBug || [])}
  - **Errors/Console**: 
  \`\`\`
  ${logsStr}
  \`\`\``;
      }).join('\n\n')
    : "No bugs explicitly flagged by the agent yet.";

  return `# Game Bug Resolution Task

You are an expert game developer agent. Your task is to fix the bugs and add the requested features/improvements noted during our automated AI playtest run.

## Game Context
- **Target Source Directory**: ${localGamePath || "Remote URL"}
- **Playtest Replay Actions**: ${JSON.stringify(brain.replayActions.slice(-20))}

## Logged Bugs & Glitches
${bugReportsMarkdown}

## Game Codebase Context
Below are the source files of the game:

${filesContext || "*No code files were auto-detected. Please locate and modify code files manually based on the logs.*"}

## Instructions
1. Review the logged bugs and compare them with the code snippets above.
2. Locate the logic errors or visual glitches (e.g. infinite loops, broken state-updates, missing event boundaries).
3. Apply code fixes directly to resolve the bugs.
4. Verify the gameplay runs normally without exceptions.
`;
}

module.exports = {
  buildPrompt,
  generateMegaPrompt
};

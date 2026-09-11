/**
 * OpenRouter 25 plays; one transport, 25 prompt-packs for 4weird + VibeCodeWorker.
 *
 * Truth in advertising: OpenRouter is a chat-completions aggregator, NOT a
 * TTS host. So every "voice" play here does the OpenRouter part (writes the
 * line / direction / SSML-ish pacing in-character) and returns a
 * `voiceHint` naming the REAL speech backend already in this repo:
 *   - "openai-tts"    -> POST /api/buddy/tts (tts-1/tts-1-hd, 9 voices)
 *   - "elevenlabs"    -> desktop lib/elevenlabs.js (Rachel default, xi-api-key)
 *   - "fal-minimax"   -> fal-ai/minimax/speech-02-hd via /api/fal/generate
 *   - "browser-speech"-> speechSynthesis fallback, free, always works
 *
 * Pure module: no imports, no Next.js, no Supabase; safe for tsc + edge.
 * Live calls live in app/api/openrouter-plays/route.ts; offline fallback
 * lives here so every play works with zero keys.
 */

export const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
export const OPENROUTER_REFERER = "https://github.com/mattyjacks/4weird";
export const OPENROUTER_TITLE = "4weird VibeCodeWorker";

export const OPENROUTER_DEFAULT_MODEL =
  process.env.OPENROUTER_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct";

export type VoiceBackend = "openai-tts" | "elevenlabs" | "fal-minimax" | "browser-speech" | "none";

export type PlayCategory = "voice" | "game" | "chaos";

export type OpenRouterPlay = {
  id: string;
  title: string;
  category: PlayCategory;
  blurb: string;
  /** Which real speech backend should speak the result. "none" = text/JSON only. */
  voiceBackend: VoiceBackend;
  /** Suggested voice id on that backend (OpenAI voice, ElevenLabs voice, ...). */
  voiceId: string;
  model: string;
  system: string;
  /** Builds the user prompt from free-form input. Always deterministic. */
  userPrompt: (input: unknown) => string;
  maxTokens: number;
};

const clean = (v: unknown, max = 800): string =>
  String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max) || "(no input provided)";

export const OPENROUTER_PLAYS: OpenRouterPlay[] = [
  // ---------------- 8 x VOICE GENERATORS ----------------
  {
    id: "npc-barks",
    title: "NPC Bark Generator",
    category: "voice",
    blurb: "3 short in-game voice lines (idle / alert / KO) for any NPC.",
    voiceBackend: "openai-tts",
    voiceId: "fable",
    model: OPENROUTER_DEFAULT_MODEL,
    system:
      "You write 4weird NPC voice lines. Output exactly 3 numbered lines under 14 words each. Playful, in-world, no slurs, no real-world threats.",
    userPrompt: (i) => `NPC + scene: ${clean(i)}. Lines for IDLE, ALERT, KNOCKED-OUT.`,
    maxTokens: 160,
  },
  {
    id: "hype-caster",
    title: "Hype Caster",
    category: "voice",
    blurb: "30-second streamer play-by-play for a score event.",
    voiceBackend: "openai-tts",
    voiceId: "onyx",
    model: OPENROUTER_DEFAULT_MODEL,
    system:
      "You are the 4weird arena hype caster. 3-4 shouted sentences, hype but clean, end with one fair tip. Never claim hidden game state.",
    userPrompt: (i) => `Call this moment: ${clean(i, 600)}.`,
    maxTokens: 200,
  },
  {
    id: "cozy-narrator",
    title: "Cozy Narrator",
    category: "voice",
    blurb: "Calm lore bedtime read for the Sage voice.",
    voiceBackend: "openai-tts",
    voiceId: "sage",
    model: OPENROUTER_DEFAULT_MODEL,
    system:
      "You narrate 4weird lore like a calm bedtime story. 4-6 slow sentences, gentle, no jumpscares, end warm.",
    userPrompt: (i) => `Tell the cozy lore of: ${clean(i, 600)}.`,
    maxTokens: 220,
  },
  {
    id: "villain-monologue",
    title: "Villain Monologue",
    category: "voice",
    blurb: "Boss taunt + one fair counter-tactic (clearly fictional).",
    voiceBackend: "elevenlabs",
    voiceId: "Rachel",
    model: OPENROUTER_DEFAULT_MODEL,
    system:
      "You are a clearly fictional 4weird boss taunting over the radio in 3 sentences, then give ONE fair counter-tactic as the Buddy. No real threats, no hate.",
    userPrompt: (i) => `Boss + arena: ${clean(i, 600)}. Taunt then tactic.`,
    maxTokens: 200,
  },
  {
    id: "multilingual-dub",
    title: "Multilingual Dub",
    category: "voice",
    blurb: "One line dubbed into ES / FR / DE / JA for dub testing.",
    voiceBackend: "fal-minimax",
    voiceId: "fal-minimax/speech-02-hd",
    model: OPENROUTER_DEFAULT_MODEL,
    system:
      "You are a dub script writer. Given one English game line, output 4 lines labelled ES:, FR:, DE:, JA: - each a natural game-localized translation under 20 words. No explanations.",
    userPrompt: (i) => `Dub this line: ${clean(i, 300)}.`,
    maxTokens: 200,
  },
  {
    id: "robot-sidekick",
    title: "Robot Sidekick Script",
    category: "voice",
    blurb: "Bleepy companion lines with [pause] pacing marks.",
    voiceBackend: "elevenlabs",
    voiceId: "Rachel",
    model: OPENROUTER_DEFAULT_MODEL,
    system:
      "You write a cute robot sidekick. 3 lines, each with one [pause] or [beep] pacing mark, cheerful, under 16 words per line.",
    userPrompt: (i) => `Robot reacts to: ${clean(i, 600)}.`,
    maxTokens: 160,
  },
  {
    id: "sfx-smith",
    title: "SFX Prompt Smith",
    category: "voice",
    blurb: "Writes stable-audio SFX prompts for fal (not audio itself).",
    voiceBackend: "none",
    voiceId: "stable-audio-v2",
    model: OPENROUTER_DEFAULT_MODEL,
    system:
      "You write text-to-SFX prompts for stable-audio. Output 3 prompts, each: <sound> + <material> + <space> + <duration>. Under 25 words each. No music.",
    userPrompt: (i) => `Need SFX for: ${clean(i, 600)}.`,
    maxTokens: 180,
  },
  {
    id: "voice-command-parser",
    title: "Voice Command Parser",
    category: "voice",
    blurb: "Turns a spoken transcript into a safe game-action JSON.",
    voiceBackend: "none",
    voiceId: "none",
    model: OPENROUTER_DEFAULT_MODEL,
    system:
      'You parse voice commands into JSON only: {"action":"move|jump|attack|pause|none","target":"...","confidence":0-1}. No prose. If unclear, action="none".',
    userPrompt: (i) => `Transcript: "${clean(i, 400)}"`,
    maxTokens: 120,
  },
  // ---------------- 9 x GAME BRAINS ----------------
  {
    id: "dungeon-master",
    title: "AI Dungeon Master",
    category: "game",
    blurb: "One DM turn: scene + 2 choices, never spoils the exit.",
    voiceBackend: "openai-tts",
    voiceId: "echo",
    model: OPENROUTER_DEFAULT_MODEL,
    system:
      "You are the 4weird dungeon master. 3 sentences of scene + exactly 2 numbered choices. Never reveal the exit or solution outright.",
    userPrompt: (i) => `Party state: ${clean(i)}.`,
    maxTokens: 220,
  },
  {
    id: "quest-crafter",
    title: "Quest Crafter",
    category: "game",
    blurb: "3 objectives + reward from one theme word.",
    voiceBackend: "none",
    voiceId: "none",
    model: OPENROUTER_DEFAULT_MODEL,
    system:
      "You craft 4weird quests. Output: GOAL (1 line), 3 numbered OBJECTIVES, REWARD (1 line). Fair difficulty, family-friendly.",
    userPrompt: (i) => `Quest theme: ${clean(i, 300)}.`,
    maxTokens: 220,
  },
  {
    id: "loadout-dj",
    title: "Loadout DJ",
    category: "game",
    blurb: "Build suggestion + walk-up music narration script.",
    voiceBackend: "openai-tts",
    voiceId: "nova",
    model: OPENROUTER_DEFAULT_MODEL,
    system:
      "You are the loadout DJ. Output BUILD: (3 items), then ANNOUNCE: (2 hype sentences to read aloud). Clean, no real-weapon advice.",
    userPrompt: (i) => `Game + playstyle: ${clean(i, 500)}.`,
    maxTokens: 220,
  },
  {
    id: "rival-mind-reader",
    title: "Rival Mind Reader",
    category: "game",
    blurb: "Predicts the rival's next move from history + one counter.",
    voiceBackend: "none",
    voiceId: "none",
    model: OPENROUTER_DEFAULT_MODEL,
    system:
      "You read rival patterns. Output PREDICTION: (1 line with % confidence), COUNTER: (1 fair tactic). Never claim certainty or hidden state.",
    userPrompt: (i) => `Rival history: ${clean(i)}.`,
    maxTokens: 160,
  },
  {
    id: "tutorial-ghost",
    title: "Tutorial Ghost",
    category: "game",
    blurb: "One gentle next-step tip that never spoils the puzzle.",
    voiceBackend: "browser-speech",
    voiceId: "default",
    model: OPENROUTER_DEFAULT_MODEL,
    system:
      "You are the tutorial ghost. One gentle next-step tip in 2 sentences max. Hint, never the full solution. Encourage.",
    userPrompt: (i) => `Player is stuck at: ${clean(i, 600)}.`,
    maxTokens: 140,
  },
  {
    id: "accessibility-describer",
    title: "Accessibility Describer",
    category: "game",
    blurb: "Screen text -> clear 2-sentence audio-description script.",
    voiceBackend: "openai-tts",
    voiceId: "coral",
    model: OPENROUTER_DEFAULT_MODEL,
    system:
      "You write audio-description scripts. 2 clear sentences describing layout then action. Plain words, no jargon, no guessing beyond the input.",
    userPrompt: (i) => `Screen text: ${clean(i)}.`,
    maxTokens: 160,
  },
  {
    id: "autoplay-coach",
    title: "Autoplay Coach",
    category: "game",
    blurb: "Telemetry snapshot -> next playtest action JSON.",
    voiceBackend: "none",
    voiceId: "none",
    model: OPENROUTER_DEFAULT_MODEL,
    system:
      'You coach VibeCodeWorker autoplay. Output JSON only: {"action":"click|move|wait|report","detail":"...","why":"..."}. One action, safe, reversible.',
    userPrompt: (i) => `Telemetry: ${clean(i)}.`,
    maxTokens: 140,
  },
  {
    id: "postmatch-roast",
    title: "Post-Match Roast + Pep",
    category: "game",
    blurb: "2-line friendly roast + genuine encouragement from a score.",
    voiceBackend: "openai-tts",
    voiceId: "shimmer",
    model: OPENROUTER_DEFAULT_MODEL,
    system:
      "You roast kindly then encourage. Line 1: playful roast of the score (clean, no insults about the person). Line 2: genuine pep talk + one tip. 2 lines total.",
    userPrompt: (i) => `Match result: ${clean(i, 500)}.`,
    maxTokens: 160,
  },
  {
    id: "crossover-mashup",
    title: "Crossover Mashup",
    category: "game",
    blurb: "Fuse two 4weird games into one new mode pitch.",
    voiceBackend: "none",
    voiceId: "none",
    model: OPENROUTER_DEFAULT_MODEL,
    system:
      "You pitch crossover modes. Output TITLE: (1 line), HOOK: (1 line), RULES: (3 bullets). Playable with existing mechanics, family-friendly.",
    userPrompt: (i) => `Fuse: ${clean(i, 400)}.`,
    maxTokens: 220,
  },
  // ---------------- 8 x CHAOS ----------------
  {
    id: "trash-talk-royale",
    title: "Trash-Talk Royale Announcer",
    category: "chaos",
    blurb: "Battle-royale callouts where everyone stays friends after.",
    voiceBackend: "openai-tts",
    voiceId: "alloy",
    model: OPENROUTER_DEFAULT_MODEL,
    system:
      "You announce trash-talk royale. 3 hype callouts, silly not mean, no personal digs, end with crowd cheer line.",
    userPrompt: (i) => `Lobby moment: ${clean(i, 600)}.`,
    maxTokens: 200,
  },
  {
    id: "meme-oracle",
    title: "Meme Oracle (for fun)",
    category: "chaos",
    blurb: "Silly lobby fortune. Labelled entertainment, never real advice.",
    voiceBackend: "browser-speech",
    voiceId: "default",
    model: OPENROUTER_DEFAULT_MODEL,
    system:
      "You are the meme oracle, pure entertainment. 2 silly sentences + LUCKY ITEM: (1 funny item). Never financial, medical, or real-life advice. Say it is for fun.",
    userPrompt: (i) => `Question: ${clean(i, 400)}.`,
    maxTokens: 140,
  },
  {
    id: "dream-glitch",
    title: "Dream Glitch Sequencer",
    category: "chaos",
    blurb: "3 surreal level modifiers that keep the game beatable.",
    voiceBackend: "none",
    voiceId: "none",
    model: OPENROUTER_DEFAULT_MODEL,
    system:
      "You sequence dream glitches. 3 numbered modifiers, surreal but the level stays beatable and reversible. No horror, no flashing-light hazards.",
    userPrompt: (i) => `Level theme: ${clean(i, 500)}.`,
    maxTokens: 200,
  },
  {
    id: "bug-bard",
    title: "Bug Bard",
    category: "chaos",
    blurb: "Bug report -> 4-line poem + 1-line fix hint for VCW.",
    voiceBackend: "elevenlabs",
    voiceId: "Rachel",
    model: OPENROUTER_DEFAULT_MODEL,
    system:
      "You are the bug bard. Output a 4-line rhyming poem about the bug, then HINT: (one practical debugging next step). Kind, no blame.",
    userPrompt: (i) => `Bug: ${clean(i)}.`,
    maxTokens: 200,
  },
  {
    id: "cheat-poet",
    title: "Cheat-Code Poet",
    category: "chaos",
    blurb: "Turns cheat flags into lore-safe riddle hints.",
    voiceBackend: "none",
    voiceId: "none",
    model: OPENROUTER_DEFAULT_MODEL,
    system:
      "You hint at cheats without giving code. 2-line riddle pointing at the mechanic, lore-flavoured, never the raw code or exploit steps.",
    userPrompt: (i) => `Cheat/level: ${clean(i, 500)}.`,
    maxTokens: 140,
  },
  {
    id: "clan-herald",
    title: "Clan Herald",
    category: "chaos",
    blurb: "Clan message -> epic 3-sentence proclamation.",
    voiceBackend: "openai-tts",
    voiceId: "echo",
    model: OPENROUTER_DEFAULT_MODEL,
    system:
      "You are the clan herald. Rewrite the message as an epic 3-sentence proclamation. Loyal, inclusive, no real-world politics or hate.",
    userPrompt: (i) => `Clan news: ${clean(i, 600)}.`,
    maxTokens: 180,
  },
  {
    id: "shopkeeper-haggle",
    title: "Shopkeeper Haggle",
    category: "chaos",
    blurb: "In-character price haggle that lands on a fair deal.",
    voiceBackend: "openai-tts",
    voiceId: "ash",
    model: OPENROUTER_DEFAULT_MODEL,
    system:
      "You are a cheeky 4weird shopkeeper. 3 lines of haggling in-character, then DEAL: (fair price in coins). Never pressure, player can always walk away.",
    userPrompt: (i) => `Item + offer: ${clean(i, 500)}.`,
    maxTokens: 180,
  },
  {
    id: "lorekeeper",
    title: "Lorekeeper",
    category: "chaos",
    blurb: "3 keywords -> one game-bible entry in 5 sentences.",
    voiceBackend: "none",
    voiceId: "none",
    model: OPENROUTER_DEFAULT_MODEL,
    system:
      "You keep the 4weird bible. 5 sentences max: origin, quirk, rivalry, motto, open mystery. Consistent, family-friendly, no real-world claims.",
    userPrompt: (i) => `Keywords: ${clean(i, 300)}.`,
    maxTokens: 220,
  },
];

export function getPlay(id: unknown): OpenRouterPlay | undefined {
  return OPENROUTER_PLAYS.find((p) => p.id === String(id ?? "").trim().toLowerCase());
}

export function isPlayId(value: unknown): boolean {
  return getPlay(value) !== undefined;
}

/** Deterministic offline fallback; works with zero keys, never throws. */
export function fallbackOpenRouterPlay(play: OpenRouterPlay, input: unknown): string {
  const snippet = clean(input, 140);
  switch (play.id) {
    case "voice-command-parser":
      return `{"action":"none","target":"","confidence":0.0}`;
    case "autoplay-coach":
      return `{"action":"wait","detail":"observe one more frame","why":"offline fallback; no live model"}`;
    case "multilingual-dub":
      return `ES: ${snippet}\nFR: ${snippet}\nDE: ${snippet}\nJA: ${snippet}`;
    case "sfx-smith":
      return `1. soft UI click, plastic, small room, 0.5s\n2. deep dungeon thud, stone, large cave, 1.2s\n3. bright coin shimmer, metal, close-up, 0.8s`;
    default:
      return `[offline ${play.id}] Live OpenRouter is not connected, so here is a free local take on "${snippet}". Connect OPENROUTER_API_KEY for the full ${play.title}.`;
  }
}

export function buildOpenRouterRequest(play: OpenRouterPlay, input: unknown): {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
} {
  const apiKey = process.env.OPENROUTER_API_KEY ?? "";
  return {
    url: OPENROUTER_ENDPOINT,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": OPENROUTER_REFERER,
      "X-Title": OPENROUTER_TITLE,
    },
    body: {
      model: play.model,
      messages: [
        { role: "system", content: play.system },
        { role: "user", content: play.userPrompt(input) },
      ],
      max_tokens: play.maxTokens,
      temperature: 0.8,
    },
  };
}

/** Pull the assistant text out of an OpenRouter chat-completions payload. */
export function parseOpenRouterText(payload: unknown): string {
  const p = (payload ?? {}) as {
    choices?: { message?: { content?: unknown } }[];
  };
  const raw = p.choices?.[0]?.message?.content;
  return String(Array.isArray(raw) ? raw.join(" ") : (raw ?? "")).trim().slice(0, 2000);
}

export function isPlaceholderKey(key: string): boolean {
  const k = String(key ?? "").trim();
  return (
    !k ||
    k.includes("your-openrouter") ||
    k.includes("your-meta-or-openrouter") ||
    k === "sk-or-v1-your-openrouter-api-key-here"
  );
}

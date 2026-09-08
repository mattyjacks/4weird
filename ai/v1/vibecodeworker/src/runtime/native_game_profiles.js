/**
 * Universal Native Game Profiles Registry.
 *
 * Lets VibeCodeWorker play ANY desktop game through one path:
 * screenshot (native window) -> DeepSeek harness vision decision -> input_sim.py.
 *
 * Half-Life 2: Episode Two is the first real game profile (the demo).
 * Add new games by appending one entry - no engine changes needed.
 *
 * Profile schema:
 * {
 *   id, name, genre, processNames[], windowTitlePatterns[],
 *   description, goal,
 *   controls: { forward, back, left, right, jump, crouch, sprint,
 *               use, reload, fireHint, altFireHint, extra{} },
 *   startup: [hints],
 *   visionHints: "extra prompt guidance for the vision model"
 * }
 */

const PROFILES = [
  {
    id: 'peggle-deluxe',
    name: 'Peggle Deluxe',
    genre: 'pachinko-puzzle',
    processNames: ['peggle', 'peggle_deluxe'],
    windowTitlePatterns: [/peggle\s*deluxe/i, /peggle/i],
    description: 'PopCap pachinko puzzle game: aim a ball launcher and clear orange pegs with a limited ball supply.',
    goal: 'Start a new Peggle Deluxe level, aim deliberate shots that hit clusters and orange pegs, use power-ups when visible, and complete levels without wasting balls.',
    controls: {
      forward: 'mouse aim', back: 'n/a', left: 'mouse aim', right: 'mouse aim',
      jump: 'n/a', crouch: 'n/a', sprint: 'n/a', use: 'left click', reload: 'n/a',
      fireHint: 'left click: launch the ball at the selected aim point', altFireHint: 'n/a',
      extra: { enter: 'confirm menus / begin level', escape: 'pause / close menus', mouse: 'aim launcher before firing' }
    },
    startup: [
      'Click the game window to focus, then press Enter or click Play/Adventure to begin.',
      'For a new game, select the first available Adventure level and confirm.',
      'Only fire after aiming at a high-value cluster or reachable orange peg; wait for the ball to settle between shots.'
    ],
    visionHints: 'Peggle board: orange pegs are the level objective, blue pegs score points, green pegs grant power-ups. The launcher is at the top. Aim at dense peg clusters and use bank shots; do not use WASD or FPS movement.'
  },
  {
    id: 'hl2-ep2',
    name: 'Half-Life 2: Episode Two',
    genre: 'fps',
    processNames: ['hl2'],
    windowTitlePatterns: [
      /half[- ]?life\s*2.*episode\s*two/i,
      /half[- ]?life\s*2/i,
      /episode\s*two/i,
      /^hl2/i
    ],
    description: 'Valve Source-engine story FPS. First real game the AI plays.',
    goal: 'Play Half-Life 2: Episode Two like a first-time player: advance through the level, ' +
      'fight Combine/antlions with crowbar/guns/gravity gun, pick up ammo/health, ' +
      'solve physics puzzles, follow Alyx and mission markers, never get stuck in menus.',
    controls: {
      forward: 'w', back: 's', left: 'a', right: 'd',
      jump: 'space', crouch: 'c', sprint: 'shift',
      use: 'e', reload: 'r', flashlight: 'f',
      walk: 'alt',
      fireHint: 'left mouse click',
      altFireHint: 'right mouse click',
      extra: {
        '1-6': 'select weapon slot',
        q: 'last weapon',
        g: 'drop weapon / gravity gun toggle',
        z: 'squad commands',
        n: 'night vision (Ep2 vehicle sections)',
        escape: 'pause menu',
        enter: 'confirm menu'
      }
    },
    startup: [
      'If a Valve intro / menu is visible, press Enter then click New Game.',
      'If paused (menu overlay), press Escape to resume.',
      'If dead (red fade + "click to retry"), left-click to reload the checkpoint.',
      'Episode Two opens with a long vista - hold W to walk forward toward Alyx/the smoke.'
    ],
    visionHints: 'Source engine HUD: health/suit bottom-left, ammo bottom-right, ' +
      'crosshair center, objective text top-center, damage direction red arcs. ' +
      'Corridors and orange guide markers mean forward. Antlions/Combine/striders are enemies. ' +
      'Blue gravity-gun glow means a throwable object is held. Prefer center-screen threats first.'
  },
  {
    id: 'hl2-generic',
    name: 'Half-Life 2 / Source FPS (generic)',
    genre: 'fps',
    processNames: ['hl2', 'portal', 'portal2', 'left4dead', 'left4dead2', 'tf_win32', 'csgo', 'css'],
    windowTitlePatterns: [/half[- ]?life/i, /portal/i, /source/i, /left\s*4\s*dead/i, /team\s*fortress/i, /counter[- ]?strike/i],
    description: 'Fallback for any Source-engine shooter.',
    goal: 'Advance, clear enemies, manage ammo/health, solve physics puzzles, follow level flow.',
    controls: {
      forward: 'w', back: 's', left: 'a', right: 'd',
      jump: 'space', crouch: 'c', sprint: 'shift',
      use: 'e', reload: 'r', flashlight: 'f',
      fireHint: 'left mouse click', altFireHint: 'right mouse click',
      extra: { escape: 'pause', enter: 'confirm' }
    },
    startup: ['Press Enter on menus, Escape resumes pause, click to respawn.'],
    visionHints: 'Standard FPS HUD. Move toward exits, markers, and lit paths.'
  },
  {
    id: 'generic-fps',
    name: 'Generic FPS (any shooter)',
    genre: 'fps',
    processNames: [],
    windowTitlePatterns: [/fps/i, /shooter/i, /doom/i, /quake/i, /unreal/i, /call of duty/i, /cod/i, /battlefield/i, /overwatch/i, /valorant/i],
    description: 'Catch-all for shooters without a dedicated profile.',
    goal: 'Move forward through the level, aim at enemies center-screen, fire, reload when empty, heal when hurt, open doors with E.',
    controls: {
      forward: 'w', back: 's', left: 'a', right: 'd',
      jump: 'space', crouch: 'c', sprint: 'shift',
      use: 'e', reload: 'r',
      fireHint: 'left mouse click', altFireHint: 'right mouse click',
      extra: { escape: 'pause', enter: 'confirm', tab: 'scoreboard' }
    },
    startup: ['Click to focus, Enter past menus, WASD to move.'],
    visionHints: 'Enemies center-screen first. Muzzle flash and hitmarkers confirm hits.'
  },
  {
    id: 'generic-game',
    name: 'Generic Game (any title)',
    genre: 'generic',
    processNames: [],
    windowTitlePatterns: [],
    description: 'Last-resort profile: works for platformers, RPGs, menus, launchers.',
    goal: 'Explore: confirm menus with Enter/click, probe WASD/arrows/space, interact with E/Space, never stall on one screen.',
    controls: {
      forward: 'w', back: 's', left: 'a', right: 'd',
      jump: 'space', crouch: 'c', sprint: 'shift',
      use: 'e', reload: 'r',
      fireHint: 'left mouse click', altFireHint: 'right mouse click',
      extra: { escape: 'back/pause', enter: 'confirm', tab: 'menu' }
    },
    startup: ['Click center to focus, Enter past menus.'],
    visionHints: 'Buttons, highlighted menu rows, and quest markers are the priorities.'
  }
];

function normalizeTitle(title) {
  return String(title || '');
}

function resolveGameProfile(windowTitleOrExe) {
  const query = normalizeTitle(windowTitleOrExe);
  if (!query) return getProfile('generic-game');
  // Exact id match first (lets callers force hl2-ep2).
  const byId = PROFILES.find((p) => p.id.toLowerCase() === query.toLowerCase());
  if (byId) return byId;
  const lower = query.toLowerCase();
  // Exe-name match (e.g. "hl2", "hl2.exe").
  const exeHit = PROFILES.find((p) => (p.processNames || []).some((n) => {
    const needle = String(n).toLowerCase();
    return lower === needle || lower === `${needle}.exe` || lower.includes(needle);
  }));
  // Prefer the most specific profile: hl2-ep2 beats hl2-generic on "hl2".
  if (exeHit && exeHit.id === 'hl2-generic' && /ep(isode)?\s*(2|two)/i.test(query)) {
    return getProfile('hl2-ep2');
  }
  if (exeHit && /half[- ]?life\s*2/i.test(query)) {
    // "Half-Life 2" bare title implies the Episode Two demo unless stated otherwise.
    return /episode\s*(one|1)|lost\s*coast|deathmatch/i.test(query) ? exeHit : getProfile('hl2-ep2');
  }
  if (exeHit) return exeHit;
  // Window-title regex match in registry order (specific first).
  for (const profile of PROFILES) {
    if ((profile.windowTitlePatterns || []).some((re) => re.test(query))) return profile;
  }
  // FPS keyword fallback, else fully generic.
  if (/half[- ]?life|portal|source|doom|quake|unreal|fps|shooter|combine|antlion|alyx/i.test(query)) {
    return getProfile('generic-fps');
  }
  return getProfile('generic-game');
}

function getProfile(id) {
  return PROFILES.find((p) => p.id === id) || PROFILES[PROFILES.length - 1];
}

function listProfiles() {
  return PROFILES.map((p) => ({ id: p.id, name: p.name, genre: p.genre }));
}

function registerGameProfile(profile) {
  if (!profile || !profile.id || !profile.name) {
    throw new Error('registerGameProfile requires at least { id, name }.');
  }
  const idx = PROFILES.findIndex((p) => p.id === profile.id);
  const full = {
    genre: 'generic',
    processNames: [],
    windowTitlePatterns: [],
    description: '',
    goal: 'Explore and advance.',
    controls: {
      forward: 'w', back: 's', left: 'a', right: 'd',
      jump: 'space', sprint: 'shift', use: 'e', reload: 'r',
      fireHint: 'left mouse click', altFireHint: 'right mouse click',
      extra: {}
    },
    startup: [],
    visionHints: '',
    ...profile
  };
  if (idx >= 0) PROFILES[idx] = full;
  else PROFILES.unshift(full);
  return full;
}

module.exports = {
  PROFILES,
  resolveGameProfile,
  getProfile,
  listProfiles,
  registerGameProfile
};

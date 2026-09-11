// Per-game accessibility metadata for the featured catalog.
//
// The preserved v1 bundles are byte-identical legacy games, so per-game
// "optimization" cannot mean rewriting game art. It means three honest
// things this file drives:
//   1. The play shell shows the right input alternatives + warnings per game.
//   2. The runtime bridge applies the matching in-iframe mitigations
//      (reduced-motion CSS kill-switch, colorblind SVG filter, focus ring).
//   3. The catalog marks which featured games are color-independent.

export type GameA11y = {
  slug: string;
  /** Keyboard-only playable (no twitch mouse aim required). */
  keyboardOnly: boolean;
  /** Gameplay meaning is carried by color (match red/green, etc). */
  colorDependent: boolean;
  /** Flashing / screen-shake heavy; warn + offer reduced motion. */
  photosensitive: boolean;
  /** Typing-heavy; pairs well with dyslexia font + large text. */
  readingHeavy: boolean;
  /** Short control + assist summary shown on the play page. */
  controls: string;
  assist: string;
};

const TABLE: Record<string, GameA11y> = {
  overtake: {
    slug: "overtake",
    keyboardOnly: true,
    colorDependent: false,
    photosensitive: true,
    readingHeavy: false,
    controls: "Arrows / WASD steer · N nitro · R reset · P pause",
    assist: "Reduced-motion calms camera shake. Dwell + face clicks map to steering keys.",
  },
  lastwordszombies: {
    slug: "lastwordszombies",
    keyboardOnly: true,
    colorDependent: false,
    photosensitive: true,
    readingHeavy: true,
    controls: "Type the words on the cyber-units · Enter submits",
    assist: "Typing game: dyslexia font + large text apply to the shell; in-game words keep their font but get letter-spaced.",
  },
  gravegain2d: {
    slug: "gravegain2d",
    keyboardOnly: true,
    colorDependent: false,
    photosensitive: false,
    readingHeavy: true,
    controls: "Arrows / WASD move · Space attack · E interact",
    assist: "Dialogue-heavy: enable dyslexia font and large text before entering dungeons.",
  },
  gravegain3d: {
    slug: "gravegain3d",
    keyboardOnly: true,
    colorDependent: false,
    photosensitive: true,
    readingHeavy: false,
    controls: "WASD move · Mouse or arrows look · Space jump",
    assist: "3D dungeon: reduced-motion steadies the camera; eye-dwell works for menus, face keys for movement.",
  },
  battlesharks2: {
    slug: "battlesharks2",
    keyboardOnly: false,
    colorDependent: true,
    photosensitive: true,
    readingHeavy: false,
    controls: "Mouse aim + click eat · WASD swim · E evolve",
    assist: "Color-dependent pickups: pick a colorblind filter before mutating; face clicks substitute for mouse clicks.",
  },
  serversavershield: {
    slug: "serversavershield",
    keyboardOnly: false,
    colorDependent: true,
    photosensitive: true,
    readingHeavy: false,
    controls: "Mouse move shield · Click block · Space emergency shield",
    assist: "Fast color-coded attacks: colorblind filter + large targets recommended; dwell-click blocks for you.",
  },
  assassinanimals: {
    slug: "assassinanimals",
    keyboardOnly: true,
    colorDependent: false,
    photosensitive: false,
    readingHeavy: false,
    controls: "WASD sneak · Space takedown · E collect DNA",
    assist: "Stealth pacing suits switch, dwell, and face control; no twitch aiming required.",
  },
  "platform-wars": {
    slug: "platform-wars",
    keyboardOnly: false,
    colorDependent: false,
    photosensitive: true,
    readingHeavy: false,
    controls: "Desktop: A/D or arrows move · W/Space jump · F dash · Phone: on-screen pad",
    assist: "Cross-platform arena: desktop team plays keyboard-only; phone team uses the touch pad; reduced-motion calms arena shake.",
  },
  venturemechanically: {
    slug: "venturemechanically",
    keyboardOnly: true,
    colorDependent: false,
    photosensitive: false,
    readingHeavy: true,
    controls: "Click / tap sliders · Tab moves between fields · Exit slider runs the waterfall",
    assist: "Untimed cap-table sim: dyslexia font + large text carry the long reads; every decision waits for you.",
  },
  financialfreedom: {
    slug: "financialfreedom",
    keyboardOnly: true,
    colorDependent: false,
    photosensitive: false,
    readingHeavy: true,
    controls: "Click tabs, sliders, and Next Month · Tab navigates every control",
    assist: "Untimed finance sim: enable dyslexia font and large text before the first budget month.",
  },
  demolichdom: {
    slug: "demolichdom",
    keyboardOnly: true,
    colorDependent: false,
    photosensitive: true,
    readingHeavy: false,
    controls: "WASD / arrows move · Click skull spell · S summon skeleton (-25 mana) · P pause",
    assist: "Reduced-motion calms the emoji demolition; face clicks substitute for spell casts and dwell summons.",
  },
  fridgesimulator: {
    slug: "fridgesimulator",
    keyboardOnly: true,
    colorDependent: false,
    photosensitive: false,
    readingHeavy: true,
    controls: "Click buy / manage fridges · Next Day advances time · Tab navigates",
    assist: "Untimed management sim: large text + dyslexia font suit long multi-country sessions.",
  },
  discoveramerica: {
    slug: "discoveramerica",
    keyboardOnly: false,
    colorDependent: false,
    photosensitive: false,
    readingHeavy: true,
    controls: "Click a fragment then its bin · Tap the glowing port to sail on",
    assist: "Sorting voyage: dwell-click selects fragments and bins; large targets help small ports.",
  },
  orbitaldrift: {
    slug: "orbitaldrift",
    keyboardOnly: true,
    colorDependent: true,
    photosensitive: true,
    readingHeavy: false,
    controls: "Hold Space / click / touch for thrust · Release to drift back · P pause",
    assist: "Stardust is yellow, debris is purple/red: pick a colorblind filter first; single-switch hold maps to thrust.",
  },
  aiwhackamole: {
    slug: "aiwhackamole",
    keyboardOnly: false,
    colorDependent: false,
    photosensitive: true,
    readingHeavy: true,
    controls: "Click / tap rogue AIs · Spare the helpful ones · Chain combos to x5",
    assist: "Read-then-whack: large targets help; face clicks substitute for hammer hits; reduced-motion calms pops.",
  },
  soundpainter: {
    slug: "soundpainter",
    keyboardOnly: false,
    colorDependent: true,
    photosensitive: false,
    readingHeavy: false,
    controls: "Click tiles to paint sound+color · Space plays all · R resets",
    assist: "Untimed art toy: dwell paints tiles for you; color carries musical meaning, so filters are comfort-only.",
  },
  soundpainter2: {
    slug: "soundpainter2",
    keyboardOnly: false,
    colorDependent: false,
    photosensitive: false,
    readingHeavy: false,
    controls: "Click cells to toggle steps · Space play/stop · C clear track · R reset all",
    assist: "Step sequencer, untimed: dwell toggles cells; large targets help the small grid.",
  },
  friendslop: {
    slug: "friendslop",
    keyboardOnly: true,
    colorDependent: false,
    photosensitive: true,
    readingHeavy: false,
    controls: "Arrows / WASD move · Space / click throw slop · P or Esc pause",
    assist: "Chaos catcher: reduced-motion steadies the falls; face keys map to movement, face clicks to throws.",
  },
  "semester-survival": {
    slug: "semester-survival",
    keyboardOnly: true,
    colorDependent: false,
    photosensitive: true,
    readingHeavy: false,
    controls: "A/D or ←/→ switch lanes · W/↑ jump · S/↓ slide · P pause · Swipe on touch",
    assist: "Lane runner: fully keyboard-playable; reduced-motion calms the 8-semester speed; swipe works on phones.",
  },
  neonbreaker: {
    slug: "neonbreaker",
    keyboardOnly: true,
    colorDependent: true,
    photosensitive: true,
    readingHeavy: false,
    controls: "←/→ or A/D move paddle · Space launch ball · P or Esc pause",
    assist: "Neon bricks + power-ups are color-coded: pick a colorblind filter first; keys alone can clear every level.",
  },
  neoninvaders: {
    slug: "neoninvaders",
    keyboardOnly: true,
    colorDependent: true,
    photosensitive: true,
    readingHeavy: false,
    controls: "←/→ or A/D move ship · Space shoot · P or Esc pause",
    assist: "Neon waves: colorblind filter + large targets recommended; dwell-click fires for you.",
  },
  neonracer: {
    slug: "neonracer",
    keyboardOnly: true,
    colorDependent: false,
    photosensitive: true,
    readingHeavy: false,
    controls: "←/→ or A/D switch lanes · Space start/restart · P or Esc pause",
    assist: "Speed runner: reduced-motion is the big win; keyboard-only, no aiming required.",
  },
  neonsnake: {
    slug: "neonsnake",
    keyboardOnly: true,
    colorDependent: false,
    photosensitive: false,
    readingHeavy: false,
    controls: "Arrows / WASD steer · Space start/restart · P or Esc pause",
    assist: "Slow-grid classic: suits switch, dwell, and face control; no twitch aiming required.",
  },
  neonvoidrunner: {
    slug: "neonvoidrunner",
    keyboardOnly: true,
    colorDependent: false,
    photosensitive: true,
    readingHeavy: false,
    controls: "Arrows / WASD dodge · Space start/restart · P or Esc pause",
    assist: "Void runner: reduced-motion steadies the speed ramp; keyboard-only with no aiming.",
  },
  "temple-of-lost-revenue": {
    slug: "temple-of-lost-revenue",
    keyboardOnly: true,
    colorDependent: true,
    photosensitive: false,
    readingHeavy: false,
    controls: "WASD / arrows guide the cat · Shift decipher map (green visor) · P pause",
    assist: "Maze business hunt: green-visor scans are color-coded, so set a filter first; dwell maps to movement keys.",
  },
  "the-ai-expedition": {
    slug: "the-ai-expedition",
    keyboardOnly: false,
    colorDependent: false,
    photosensitive: false,
    readingHeavy: false,
    controls: "Click node A then node B to draw a pipeline · Tap nodes on touch",
    assist: "Untimed network puzzle: dwell-click links nodes; large targets help small pipeline ports.",
  },
  "the-cave-of-bottlenecks": {
    slug: "the-cave-of-bottlenecks",
    keyboardOnly: true,
    colorDependent: true,
    photosensitive: false,
    readingHeavy: false,
    controls: "A/D or ←/→ steer the light · Hold the beam on red bottlenecks · P pause",
    assist: "Red delays vs green light: pick a colorblind filter first; single-switch hold steers the beam.",
  },
  "the-lost-city-of-customers": {
    slug: "the-lost-city-of-customers",
    keyboardOnly: false,
    colorDependent: true,
    photosensitive: false,
    readingHeavy: false,
    controls: "Move the scan crosshair · Click / tap to scan · Find 5 hidden databases",
    assist: "Untimed scanner hunt: dwell-click scans terrain; green ripples carry meaning, so set a filter first.",
  },
  "the-madi-ai-universe": {
    slug: "the-madi-ai-universe",
    keyboardOnly: false,
    colorDependent: false,
    photosensitive: false,
    readingHeavy: false,
    controls: "Hover regions to inspect · Click a glowing sector to play · Tap on touch",
    assist: "3D hub, untimed: dwell-click enters sectors; Tab reaches every region from the keyboard.",
  },
  "the-pipeline-mountain": {
    slug: "the-pipeline-mountain",
    keyboardOnly: true,
    colorDependent: false,
    photosensitive: false,
    readingHeavy: false,
    controls: "A/D or ←/→ steer · Space jump platforms · P pause",
    assist: "Climber platformer: keyboard-only; face keys map to steering and jumping.",
  },
  "the-revenue-dragon": {
    slug: "the-revenue-dragon",
    keyboardOnly: true,
    colorDependent: true,
    photosensitive: true,
    readingHeavy: false,
    controls: "A/D or ←/→ move · Space fire action beams · P pause",
    assist: "Boss battle: orange fireballs vs your beams are color-coded; set a filter; reduced-motion calms the fight.",
  },
  "the-revenue-jungle": {
    slug: "the-revenue-jungle",
    keyboardOnly: true,
    colorDependent: false,
    photosensitive: true,
    readingHeavy: false,
    controls: "Space / ↑ jump vines, quicksand, and fog · P pause",
    assist: "One-button runner: single-switch Space maps perfectly; reduced-motion steadies the leaps.",
  },
  "the-speed-portal": {
    slug: "the-speed-portal",
    keyboardOnly: true,
    colorDependent: false,
    photosensitive: true,
    readingHeavy: false,
    controls: "A/D or ←/→ rotate inside the tunnel · Dodge approvals and meetings · P pause",
    assist: "Tunnel racer: reduced-motion is essential here; keyboard-only with no aiming.",
  },
  "treasure-hunters": {
    slug: "treasure-hunters",
    keyboardOnly: true,
    colorDependent: false,
    photosensitive: false,
    readingHeavy: false,
    controls: "Space / click drops the claw · Time the swing · P pause",
    assist: "Timing grabber: single-switch Space maps perfectly; dwell-click drops the claw too.",
  },
};

export function getGameA11y(slug: string): GameA11y {
  return (
    TABLE[slug] ?? {
      slug,
      keyboardOnly: false,
      colorDependent: false,
      photosensitive: false,
      readingHeavy: false,
      controls: "Keyboard + mouse; see the in-game help screen",
      assist: "Generic shell assists apply: colorblind filter, dyslexia font, dwell-click, and face-key mapping.",
    }
  );
}

/** Slugs whose play pages get the full optimized assist panel. */
export const OPTIMIZED_A11Y_SLUGS = Object.keys(TABLE);

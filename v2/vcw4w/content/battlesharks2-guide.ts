// BattleSharks 2 v2 guide (slug: battlesharks2).
//
// LOCATION NOTE: the repo's static-guide pattern (content/game-manifests.ts
// GAMES_WITH_GUIDES -> public/games/<slug>/guide.html) lives outside the v2
// shell dirs owned here, and no content/*-guide.ts pattern exists yet — so
// this file is the v2-layer guide source. Detail/play pages keep reading
// game-manifests.ts (generic manifest resolves for every catalog slug);
// agents and UI import BS2_GUIDE from here.
//
// SOURCE TRUTH (read-only; bundle is parity-locked, never edited):
// public/games/html/battlesharks2/game.json (controls + instructions),
// index.html (R&D Lab costs, ROBO-KRAKEN boss, LAUNCH SHARK start),
// game.js (touch steering, localStorage keys, pause keys).

export type Bs2GuideSection = {
  /** Stable section id: controls | economy | boss | mobile | telemetry. */
  id: string;
  heading: string;
  body: string[];
};

export const BS2_GUIDE: { slug: string; title: string; sections: Bs2GuideSection[] } = {
  slug: "battlesharks2",
  title: "BattleSharks 2 Guide",
  sections: [
    {
      id: "controls",
      heading: "Controls",
      body: [
        "Swim: WASD / arrow keys, or steer with the mouse — the shark follows your cursor.",
        "Fire: left-click (or hold Ctrl) to shoot lasers once a weapon is installed.",
        "Jet dash: Space, but only after installing the Jet Engine in the lab.",
        "R&D Lab hub: press E or Tab (or the floating R&D LAB HUB button) any time to upgrade.",
        "Pause: Esc or P, or the Pause Game button in the action row.",
      ],
    },
    {
      id: "economy",
      heading: "Lab economy (biomass / debris / mutagens)",
      body: [
        "Eat fish to recover health and gather Biomass (🧬); wrecks and kills drop Cyber-debris (⚙️); vents and tough kills yield Mutagens (🧪).",
        "Cybernetics: Laser Cannon (20 debris) → Jet Engine (30 debris + 10 biomass) → Force Shield (40 debris + 1 mutagen) → Homing Micro-Missiles (50 debris + 2 mutagens).",
        "Bio-mutations: Corrosive Acid (25 biomass + 2 mutagens), Electric Charge (35 biomass + 1 mutagen), Chitinous Scales (50 biomass, +50 max HP and 25% damage reduction).",
        "Aquarium deploys feed the loop: Coral (15 biomass) spawns edible clownfish, Wreckage (20 debris) leaks debris, Vent (30 biomass + 15 debris) emits mutagens.",
        "Shop between fights, never mid-swarm: the lab overlay does not pause the hunters.",
      ],
    },
    {
      id: "boss",
      heading: "Boss: ROBO-KRAKEN BS-BOSS",
      body: [
        "A CRITICAL THREAT warning plus a boss HP bar announces the ROBO-KRAKEN entering the testing bay.",
        "Disengage from packs when the warning flashes; circling beats head-on passes against the Kraken.",
        "Spend Homing Micro-Missiles on the boss rather than on swarm clears.",
      ],
    },
    {
      id: "mobile",
      heading: "Mobile",
      body: [
        "On touch screens the served runtime adds a virtual joystick: left thumb steers (drives the game's own mouse-target path), tap fires the equipped weapon.",
        "Touch-drag on the canvas also steers directly, with no keyboard needed.",
        "Open the R&D Lab with the on-screen R&D LAB HUB button — no keyboard needed.",
        "Rotate to landscape for the best view; the HUD (health, growth, biomass, debris, mutagens, score) stays readable.",
      ],
    },
    {
      id: "telemetry",
      heading: "VCW autoplay + telemetry notes",
      body: [
        "Observe → reason → act: circle toward the nearest edible each tick; log biomass per minute plus score so mutation pacing is comparable across runs.",
        "Hub-between-fights rule: open the R&D Lab only when no hunter is within dash range; one upgrade per visit.",
        "High score (battlesharks2_highscore) and mute (battlesharks2_muted) persist in game-owned localStorage; audio is WebAudio with a Sound toggle.",
      ],
    },
  ],
};

export function bs2GuideSection(id: string): Bs2GuideSection | undefined {
  return BS2_GUIDE.sections.find((s) => s.id === id);
}

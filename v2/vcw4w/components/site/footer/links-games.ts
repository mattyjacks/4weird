// DS-FTR-09 — footer data: full game catalog column.
// Derived read-only from content/games.ts (emoji + title copied verbatim,
// blurb = genre). Featured/recommended first, then the rest; every game exactly once.
// Hub links verified against app/games/{page,servers,mods,plugins}. DO NOT edit by hand —
// regenerate from content/games.ts so codepoints never drift.
export type FooterDataLink = { href: string; label: string; blurb?: string };
export type FooterDataColumn = {
  label: string;
  icon: 'Rocket' | 'Gamepad2' | 'Clapperboard' | 'Cpu' | 'HeartHandshake' | 'ShieldCheck' | 'Sparkles' | 'BookOpen' | 'Wrench';
  tagline: string;
  links: FooterDataLink[];
};

export const GAMES_COLUMN: FooterDataColumn = {
  label: 'Every Game',
  icon: 'Gamepad2',
  tagline: 'Every game in the 4weird arcade, from zombie typing to 4D golf.',
  links: [
    { href: '/games', label: 'All Games', blurb: 'Browse the full catalog' },
    { href: '/games/servers', label: 'Game Servers', blurb: 'Rent and join servers' },
    { href: '/games/mods', label: 'Mods', blurb: 'Community mods' },
    { href: '/games/plugins', label: 'Plugins', blurb: 'Extend your games' },
    { href: '/games/platform-wars', label: '📱 Platform Wars: Phone vs Desktop', blurb: 'Action' },
    { href: '/games/lastwordszombies', label: '🧟 Last Words Zombies', blurb: 'Action' },
    { href: '/games/venturemechanically', label: '💧 Exit Waterfall Machine', blurb: 'Simulation' },
    { href: '/games/financialfreedom', label: '💵 Financial Freedom', blurb: 'Simulation' },
    { href: '/games/serversavershield', label: '🛡️ Server Saver Shield', blurb: 'Arcade' },
    { href: '/games/overtake', label: '🏁 Overtake', blurb: 'Racing' },
    { href: '/games/assassinanimals', label: '🕶️ AssassinAnimals', blurb: 'Rogue-like' },
    { href: '/games/battlesharks2', label: '🦈 Battlesharks 2', blurb: 'Action' },
    { href: '/games/gravegain2dA', label: '⚔️ GraveGain2DA', blurb: 'RPG' },
    { href: '/games/gravegain2dB', label: '🌙 GraveGain2dB: Breach MoonRock', blurb: 'RPG' },
    { href: '/games/gravegain3dA', label: '🏰 GraveGain3DA', blurb: 'RPG' },
    { href: '/games/orbitaldrift', label: '🛸 Orbital Drift', blurb: 'Arcade' },
    { href: '/games/soundpainter2', label: '🎹 Sound Painter 2', blurb: 'Creative' },
    { href: '/games/gravegain4dA', label: '⛳ GraveGain4DA', blurb: 'RPG' },
    { href: '/games/gravegain5dA', label: '🌀 GraveGain5DA', blurb: 'RPG' },
    { href: '/games/gravegain1dA', label: '➡️ GraveGain1DA', blurb: 'RPG' },
    { href: '/games/demolichdom', label: '💀 Demo Lichdom', blurb: 'Strategy' },
    { href: '/games/fridgesimulator', label: '🥶 Fridge Simulator', blurb: 'Simulation' },
    { href: '/games/discoveramerica', label: '🗽 Madi AI: Discover America', blurb: 'Adventure' },
    { href: '/games/aiwhackamole', label: '🤖 AI-whack-a-mole', blurb: 'Arcade' },
    { href: '/games/soundpainter', label: '🎨 Sound Painter', blurb: 'Creative' },
    { href: '/games/friendslop', label: '🍔 FriendSlop', blurb: 'Arcade' },
    { href: '/games/semester-survival', label: '🎓 Semester Survival', blurb: 'Endless Runner' },
    { href: '/games/neonbreaker', label: '🧱 Neon Breaker', blurb: 'Arcade' },
    { href: '/games/neoninvaders', label: '👾 Neon Invaders', blurb: 'Shooter' },
    { href: '/games/neonracer', label: '🏎️ Neon Racer', blurb: 'Racing' },
    { href: '/games/neonsnake', label: '🐍 Neon Snake', blurb: 'Arcade' },
    { href: '/games/neonvoidrunner', label: '🌌 Neon Void Runner', blurb: 'Endless Runner' },
    { href: '/games/temple-of-lost-revenue', label: '🏛️ Temple of Lost Revenue', blurb: 'Adventure' },
    { href: '/games/the-ai-expedition', label: '🧭 The AI Expedition', blurb: 'Strategy' },
    { href: '/games/the-cave-of-bottlenecks', label: '🪨 The Cave of Bottlenecks', blurb: 'Puzzle' },
    { href: '/games/the-lost-city-of-customers', label: '🗺️ The Lost City of Customers', blurb: 'Adventure' },
    { href: '/games/the-madi-ai-universe', label: '🌐 The MADI AI Universe', blurb: 'Adventure' },
    { href: '/games/the-pipeline-mountain', label: '⛰️ The Pipeline Mountain', blurb: 'Adventure' },
    { href: '/games/the-revenue-dragon', label: '🐉 The Revenue Dragon', blurb: 'Action' },
    { href: '/games/the-revenue-jungle', label: '🌴 The Revenue Jungle', blurb: 'Adventure' },
    { href: '/games/the-speed-portal', label: '🌀 The Speed Portal', blurb: 'Racing' },
    { href: '/games/treasure-hunters', label: '💎 Treasure Hunters', blurb: 'Arcade' },
  ],
};

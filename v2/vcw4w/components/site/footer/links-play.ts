export type FooterDataLink = { href: string; label: string; blurb?: string };

export type FooterDataColumn = {
  label: string;
  icon:
    | "Rocket"
    | "Gamepad2"
    | "Clapperboard"
    | "Cpu"
    | "HeartHandshake"
    | "ShieldCheck"
    | "Sparkles"
    | "BookOpen"
    | "Wrench";
  tagline: string;
  links: FooterDataLink[];
};

export const PLAY_COLUMN: FooterDataColumn = {
  label: "Play & Compete",
  icon: "Gamepad2",
  tagline: "Click and play - free, no install.",
  links: [
    { href: "/games", label: "🎮 All Games", blurb: "All 35 games - click and play." },
    { href: "/gravegain", label: "🪦 GraveGain Universe", blurb: "Shared lore and missions across every dimension." },
    { href: "/buddy", label: "🐶 Gaming Buddy", blurb: "Voice coach that watches your screen." },
    { href: "/leaderboards", label: "🏆 Leaderboards", blurb: "Top scores for every game." },
    { href: "/lobbies", label: "🎪 Lobbies", blurb: "Live rooms waiting for players." },
    { href: "/mmo", label: "🐉 MMORPG Realms", blurb: "Browse and play community realms." },
    { href: "/mmo/rent", label: "🖥️ Rent a Realm", blurb: "Host your own MMORPG server." },
    { href: "/games/servers", label: "🌐 Game Servers", blurb: "Find a shard by game and age band." },
    { href: "/games/servers/rent", label: "🖥️ Rent a Server", blurb: "Five steps to your own shard." },
  ],
};

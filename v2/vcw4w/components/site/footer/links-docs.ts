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

export const DOCS_COLUMN: FooterDataColumn = {
  label: "Learn & Docs",
  icon: "BookOpen",
  tagline: "Help, lore, and how money works.",
  links: [
    { href: "/academy", label: "🎓 Academy", blurb: "Bite-size lessons through play." },
    { href: "/tech", label: "⚙️ Technology", blurb: "How the magic works, simply." },
    { href: "/docs", label: "📖 Docs", blurb: "Plain-English help for everything." },
    { href: "/docs/agents-compute", label: "💻 Agents & Compute", blurb: "Rent cloud by the second." },
    { href: "/docs/mmorpg", label: "🐉 MMORPG Guide", blurb: "Realms, roles, and kid-safe play." },
    { href: "/docs/mmorpg/hosting", label: "🖥️ Hosting a Realm", blurb: "Rent, configure, and run a server." },
    { href: "/docs/mmorpg/age-bands", label: "🛡️ Age Bands", blurb: "Kid-safe matchmaking by age." },
    { href: "/docs/mmo/player", label: "🎮 MMO Player Guide", blurb: "Join a shard, split the meter." },
    { href: "/docs/mmo/host", label: "🖥️ MMO Host Guide", blurb: "Rent a world, set the subsidy." },
    { href: "/docs/mmo/safety", label: "🛡️ MMO Safety", blurb: "Three bands, kid-safe shards." },
    { href: "/docs/mmo/faq", label: "❓ MMO FAQ", blurb: "Billing and access answers." },
    { href: "/pricing", label: "🪙 Pricing", blurb: "100 coins = $1, fees inside." },
    { href: "/ads", label: "📢 Advertise", blurb: "House ads, all in one wall." },
    { href: "/docs/getting-started", label: "🚀 Getting Started", blurb: "Zero to playing in 15 minutes." },
    { href: "/docs/faq", label: "❓ FAQ", blurb: "Answers to common questions." },
    { href: "/docs/playing-games", label: "🎮 Playing Games", blurb: "Play, saves, and meters explained." },
    { href: "/docs/vibe-coins", label: "🪙 Vibe Coins", blurb: "Earn, spend, and track coins." },
    { href: "/docs/about", label: "👋 About 4weird", blurb: "What 4weird is and why." },
    { href: "/docs/music", label: "🎵 Music Docs", blurb: "Tiny songs and SFX for games." },
    { href: "/docs/privacy-safety", label: "🔒 Privacy & Safety", blurb: "Your data, your rights, safety." },
  ],
};

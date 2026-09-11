export type DocEntry = {
  href: string;
  label: string;
  blurb: string;
  icon: string;
  /** gradient wash for cards / chips on the hub */
  card: string;
};

export const DOCS_DATA: DocEntry[] = [
  { href: "/docs", label: "Docs home", blurb: "Start here", icon: "📚", card: "from-cyan-500/25 via-sky-500/10 to-violet-500/25" },
  { href: "/docs/about", label: "About 4weird", blurb: "Company, mission, flywheel", icon: "🎪", card: "from-amber-500/25 via-orange-500/10 to-rose-500/25" },
  { href: "/docs/getting-started", label: "Getting started", blurb: "Account, trial, first day", icon: "🚀", card: "from-emerald-500/25 via-teal-500/10 to-cyan-500/25" },
  { href: "/docs/playing-games", label: "Playing games", blurb: "Catalog, play, saves, guests", icon: "🕹️", card: "from-fuchsia-500/25 via-pink-500/10 to-purple-500/25" },
  { href: "/docs/vibe-coins", label: "Vibe Coins", blurb: "Packs, bonuses, checkout", icon: "🪙", card: "from-yellow-400/30 via-amber-500/10 to-orange-500/25" },
  { href: "/docs/support-launches", label: "Support & launches", blurb: "Tips, tiers, game/startup campaigns", icon: "💛", card: "from-pink-500/25 via-rose-500/10 to-amber-500/25" },
  { href: "/docs/clans", label: "Clans", blurb: "Forum, chat, upkeep, XP", icon: "👾", card: "from-violet-500/25 via-purple-500/10 to-fuchsia-500/25" },
  { href: "/docs/bots", label: "Bots", blurb: "Bot keys + clan bot API", icon: "🤖", card: "from-lime-400/25 via-green-500/10 to-emerald-500/25" },
  { href: "/docs/agents-compute", label: "Agents & cloud", blurb: "Rentals, desktops, teams", icon: "☁️", card: "from-sky-500/25 via-blue-500/10 to-indigo-500/25" },
  { href: "/docs/game-ai-buddy", label: "Game AI & Buddy", blurb: "AI features + voice coach", icon: "🎙️", card: "from-rose-500/25 via-pink-500/10 to-orange-500/25" },
  { href: "/docs/vibecodeworker", label: "VibeCodeWorker", blurb: "QA runs, bugs, handoffs", icon: "⚙️", card: "from-orange-500/25 via-amber-500/10 to-stone-500/20" },
  { href: "/docs/explore-more", label: "Explore more", blurb: "Classics, arenas, account hub", icon: "🧭", card: "from-cyan-500/25 via-sky-500/10 to-violet-500/25" },
  { href: "/docs/privacy-safety", label: "Privacy & safety", blurb: "Rights, moderation, reports", icon: "🛡️", card: "from-teal-500/25 via-emerald-500/10 to-cyan-500/25" },
  { href: "/docs/faq", label: "FAQ & support", blurb: "Answers + contact", icon: "💬", card: "from-indigo-500/25 via-violet-500/10 to-sky-500/25" },
];

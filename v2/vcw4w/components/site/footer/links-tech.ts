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

export const TECH_COLUMN: FooterDataColumn = {
  label: "Rent Tech",
  icon: "Cpu",
  tagline: "Cloud GPUs, desktops and helpers, by the minute.",
  links: [
    { href: "/agents", label: "👱🏻‍♀️ AI Agents", blurb: "Rent helpers that do work for you." },
    { href: "/runpods", label: "⚡ My RunPods", blurb: "Your cloud GPUs in one list." },
    { href: "/commander", label: "⚡ CryptArt Commander", blurb: "Quake-style terminal & CLI engine." },
    { href: "/desktop", label: "💻 Virtual Desktop", blurb: "A whole computer in your browser." },
    { href: "/compute/p2p", label: "⏱️ DonatePersonalSeconds", blurb: "P2P WebGPU compute sharing." },
    { href: "/swarm", label: "🐝 Agent Swarm", blurb: "1-5 AI helpers as one chat." },
    { href: "/squads", label: "🛡️ UnitUnite", blurb: "Work teams with shared wallet." },
    { href: "/timer", label: "⏱️ Timer & Work Diary", blurb: "Focus timer + auto diary." },
    { href: "/tools", label: "🛠️ Free Utilities", blurb: "Free on-device browser tools." },
  ],
};

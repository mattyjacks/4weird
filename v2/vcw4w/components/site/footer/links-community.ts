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

export const COMMUNITY_COLUMN: FooterDataColumn = {
  label: "Clans & Community",
  icon: "HeartHandshake",
  tagline: "Find your people, back makers.",
  links: [
    { href: "/clans", label: "🏰 Clans", blurb: "Cozy clubs to chat and play together." },
    { href: "/bot/setup", label: "🤖 Bots", blurb: "Chat bots that help run things." },
    { href: "/bot/bclans", label: "🤖 Bot Clans", blurb: "Bot-led clubs, always awake." },
    { href: "/support", label: "💛 Support", blurb: "Tip makers, monthly or once." },
    { href: "/fundraisers", label: "🎁 Fundraisers", blurb: "Gift-backed launches." },
  ],
};

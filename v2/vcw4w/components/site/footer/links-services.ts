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

export const SERVICES_COLUMN: FooterDataColumn = {
  label: "Trust & Services",
  icon: "ShieldCheck",
  tagline: "Coins, saves, and settings.",
  links: [
    { href: "/account", label: "👑 Account", blurb: "Dashboard - coins, saves, settings." },
    { href: "/my/usage", label: "📊 Usage", blurb: "Receipts for every coin + GPU minute." },
    { href: "/my/rights", label: "⚖️ My Privacy Rights", blurb: "Download or delete your 4weird Games data." },
    { href: "/favorites", label: "⭐ Favorites", blurb: "Your starred pages, in one place." },
    { href: "/family/login", label: "👨‍👩‍👧‍👦 Family Login", blurb: "Parent-managed child sign-in." },
    { href: "/auth/login", label: "🔑 Login", blurb: "Sign in to 4weird Games to sync your saves, coins, and high scores." },
    { href: "/auth/sign-up", label: "✨ Sign Up Free", blurb: "Create a free 4weird Games account and pocket 100 welcome Vibe Coins." },
    { href: "/auth/forgot-password", label: "🔑 Reset Password", blurb: "Reset your 4weird Games password via email." },
    { href: "/terms", label: "📜 Terms of Use", blurb: "Terms governing use of the 4weird Games service." },
    { href: "/privacy", label: "🔒 Privacy Policy", blurb: "How MattyJacks LLC collects, uses, and protects information on 4weird Games." },
    { href: "/accessibility", label: "♿ Accessibility", blurb: "Play your way - text, color, voice." },
    { href: "/boss", label: "💼 Boss Mode", blurb: "See everything, safely." },
    { href: "/bouncer", label: "📧 Email Bouncer", blurb: "Verify deliverability for up to 50 emails." },
    { href: "/chat", label: "💬 Chat", blurb: "Private 1-on-1 chat threads with squad mates and clan members on 4weird Games." },
    { href: "/docs/feedback", label: "💡 Feedback", blurb: "Tell us what is broken or brilliant." },
    { href: "/it", label: "🖥️ IT Command", blurb: "Approve apps, watch usage, stop Shadow IT." },
    { href: "/code", label: "💻 Code Audits", blurb: "Look up any game submission safety audit." },
    { href: "/terminal", label: "⌨️ Terminal", blurb: "Quake-style power-user terminal." },
  ],
};

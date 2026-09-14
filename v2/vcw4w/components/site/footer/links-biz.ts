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

export const BIZ_COLUMN: FooterDataColumn = {
  label: "Creators Earn",
  icon: "HeartHandshake",
  tagline: "Business tools, tips, and fundraisers.",
  links: [
    { href: "/business", label: "💼 Business Hub", blurb: "All business tools in one place." },
    { href: "/business/crm", label: "👥 Business CRM", blurb: "Contacts and pipelines." },
    { href: "/business/invoices", label: "🧾 Invoices", blurb: "Bill clients in Vibe Coins." },
    { href: "/business/tax", label: "🤖 Tax Info Bot", blurb: "Freelance tax calculator & receipts." },
    { href: "/support", label: "💛 Support", blurb: "Tip makers, monthly or once." },
    { href: "/fundraisers", label: "🎁 Fundraisers", blurb: "Gift-backed launches." },
    { href: "/ads", label: "📢 Advertise", blurb: "House ads, all in one wall." },
    { href: "/work", label: "🏢 Work", blurb: "Safe apps your IT already approved." },
    { href: "/easydnc", label: "📵 EasyDNC", blurb: "Do-not-call checker for business leads." },
  ],
};

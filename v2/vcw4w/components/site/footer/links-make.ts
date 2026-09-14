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

export const MAKE_COLUMN: FooterDataColumn = {
  label: "Build & Ship",
  icon: "Clapperboard",
  tagline: "Remix, submit, and debug games.",
  links: [
    { href: "/newgameplus", label: "✨ NewGamePlus", blurb: "Remix a game into its sequel with AI." },
    { href: "/gamestudio", label: "🎮 GameStudio", blurb: "Godot 4.6.1 & 3-panel game hub." },
    { href: "/gamestudio/debugplay", label: "🎮 DebugPlay", blurb: "Headless game QA & AI bug analyzer." },
    { href: "/submit", label: "🚀 Submit Game", blurb: "Send us your game to list." },
    { href: "/builder", label: "🧬 Clone Tool", blurb: "Desktop & mobile installer builder." },
    { href: "/vault", label: "🗄️ Weird Vault", blurb: "Private files + rare oddities." },
    { href: "/web-apps", label: "🌐 Web Apps", blurb: "Load, poke, and debug your builds." },
    { href: "/vibecodeworker", label: "👩🏻‍💻 VibeCodeWorker", blurb: "Robot that playtests + files bugs." },
    { href: "/music/maker", label: "🎹 Music Maker", blurb: "Synth song + SFX suite, tiny files." },
    { href: "/music/all", label: "🎵 Music Library", blurb: "Every public track + SFX." },
  ],
};

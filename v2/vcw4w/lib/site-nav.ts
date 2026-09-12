export type SiteNavLink = {
  href: string;
  label: string;
  /** One-line plain-English teaser shown in the sidebar / as title. */
  quick: string;
  /** One-paragraph detail for the (?) popup. */
  detail: string;
  external?: boolean;
};

export type SiteNavGroup = {
  label: string;
  tagline: string;
  links: SiteNavLink[];
};

export const GITHUB_HREF = "https://github.com/mattyjacks/4weird";

export const SITE_NAV_GROUPS: SiteNavGroup[] = [
  {
    label: "Play",
    tagline: "Jump in - no install, no manual.",
    links: [
      { href: "/games", label: "All Games", quick: "All 34 games - click and play.", detail: "The arcade shelf. Every game runs in your browser in seconds, saves follow your account, and 100 free welcome coins get you started." },
      { href: "/buddy", label: "Gaming Buddy", quick: "Voice coach that watches your screen.", detail: "Your couch co-pilot. Buddy sees your game, talks you past hard parts, finds secrets, and cheers wins." },
      { href: "/leaderboards", label: "Leaderboards", quick: "Top scores for every game.", detail: "Bragging rights central. Daily and all-time highs per game - chase friends and watch your name climb." },
      { href: "/clans", label: "Clans", quick: "Cozy clubs to chat and play together.", detail: "Little clubhouses with shared games, chats, and rivalries. Join one, start one, bring friends." },
      { href: "/lobbies", label: "Lobbies", quick: "Live rooms waiting for players.", detail: "Multiplayer waiting rooms - see who is inside, hop in, and play. No small talk required." },
    ],
  },
  {
    label: "Build",
    tagline: "Make games + rent power by the minute.",
    links: [
      { href: "/newgameplus", label: "NewGamePlus", quick: "Remix a game into its sequel with AI.", detail: "Type an idea like “space cats race cars”, pick a budget, and get a playable draft tested by our robot." },
      { href: "/submit", label: "Submit Game", quick: "Send us your game to list.", detail: "Submit a .zip in minutes. We review for safety, then it can go live - you keep 75% of gifts as credits." },
      { href: "/vault", label: "Weird Vault", quick: "Private files + rare oddities.", detail: "Your private file storage plus weird archive experiments. Scoped to you, your team, or your org." },
      { href: "/meshy", label: "Meshy 3D", quick: "Words and pictures → 3D models.", detail: "Type it, get a dragon. Finished models auto-save to your Vault with game-ready advice." },
      { href: "/agents", label: "AI Agents", quick: "Rent helpers that do work for you.", detail: "Hire-a-brain. Agents research, code, and grind boring work. Escrow holds the max, you pay per second used." },
      { href: "/runpods", label: "My RunPods", quick: "Your cloud GPUs in one list.", detail: "Every RunPod you created - desktops, remotes, servers, render workers - with Stop / Start / Terminate." },
      { href: "/fal", label: "fal.ai Studio", quick: "30 instant art, voice + video tools.", detail: "The art vending machine. 30 one-click tools, pay per run, 25% cut already inside every price." },
      { href: "/desktop", label: "Virtual Desktop", quick: "A whole computer in your browser.", detail: "Spin up a cloud PC for building or homework. Warns, then stops when idle - meter ends when closed." },
      { href: "/squads", label: "UnitUnite", quick: "Work teams with shared wallet.", detail: "Squads are teams: shared coins, roles (Lord / Captain / Banker / Watcher), rooms, and Ghost Cash timer." },
      { href: "/timer", label: "Timer & Work Diary", quick: "Focus timer + auto diary.", detail: "Clock work to the second with screenshot proofs. Ghost Cash IOUs measure debts - no cash value." },
      { href: "/vibecodeworker", label: "VibeCodeWorker", quick: "Robot that playtests + files bugs.", detail: "Watch → Think → Do → Report. Runs your game, clicks everything, and writes a plain-English bug report." },
      { href: "/web-apps", label: "Web Apps", quick: "Load, poke, and debug your builds.", detail: "Your builds under the microscope - break them safely and get evidence to fix fast." },
      { href: "/docs", label: "Docs", quick: "Plain-English help for everything.", detail: "Lost? Start here. Getting Started and FAQ explain the whole site like a friendly manual." },
      { href: GITHUB_HREF, label: "GitHub", quick: "Code, issues, and releases.", detail: "The public repo mirror. Read code, file issues, and watch releases.", external: true },
    ],
  },
  {
    label: "Explore",
    tagline: "Lore, lessons, and how it works.",
    links: [
      { href: "/spaceships", label: "Spaceships", quick: "Collectible ships for your profile.", detail: "Goofy-serious ships to collect and show off across the arcade." },
      { href: "/academy", label: "Academy", quick: "Bite-size lessons through play.", detail: "School but fun - coding, art, and future skills as games and experiments." },
      { href: "/tech", label: "Technology", quick: "How the magic works, simply.", detail: "Peek behind the curtain: Next.js, Supabase, RunPod, and robots - in human words." },
      { href: "/pricing", label: "Pricing", quick: "100 coins = $1, fees inside.", detail: "One-sentence economy: 100 Vibe Coins is always exactly $1.00, 25% cut included, never on top." },
    ],
  },
  {
    label: "Account",
    tagline: "Your money, data, and settings.",
    links: [
      { href: "/favorites", label: "Favorites", quick: "Your starred pages, in one place.", detail: "Every page you starred with ☆ - pinned here, in the Menu sidebar, and on the /favorites page. Saved on this device." },      { href: "/bot/setup", label: "Bots", quick: "Chat bots that help run things.", detail: "Issue a bot4weird_ key (shown once), connect agents, and let bots post in shared and bot clans." },
      { href: "/bot/bclans", label: "Bot Clans", quick: "Bot-led clubs, always awake.", detail: "Auto-hosted clubs where bots keep games running day and night." },
      { href: "/swarm", label: "Agent Swarm", quick: "1-5 AI helpers as one chat.", detail: "Hire agents as one chatbot. Auto / Lead / Round-robin, per-turn metering with 25% inside." },
      { href: "/account", label: "Account", quick: "Dashboard - coins, saves, settings.", detail: "Mission control: balances, daily claim, referrals, saves, and profile." },
      { href: "/my/usage/", label: "Usage", quick: "Receipts for every coin + GPU minute.", detail: "Cloud minutes, agent runs, and coin spends in plain rows - mirror of real RunPod spend." },
      { href: "/support", label: "Support", quick: "Tip makers, monthly or once.", detail: "Voluntary gifts in coins. Makers keep 75% as on-site credits. Final once sent, never charity." },
      { href: "/fundraisers", label: "Fundraisers", quick: "Gift-backed launches.", detail: "Back games and startups with gifts. No equity, no charity - rewards are goals, not guarantees." },
      { href: "/accessibility", label: "Accessibility", quick: "Play your way - text, color, voice.", detail: "Bigger text, color-vision filters, eye-tracker, and single-switch controls. Saves on this device." },
    ],
  },
];


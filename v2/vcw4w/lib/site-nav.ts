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
    label: "🎮 Play Free",
    tagline: "Click and play - free, no install.",
    links: [
      { href: "/games", label: "All Games", quick: "All 35 games - click and play.", detail: "The arcade shelf. Every game runs in your browser in seconds, saves follow your account, and 100 free welcome coins get you started." },
      { href: "/buddy", label: "Gaming Buddy", quick: "Voice coach that watches your screen.", detail: "Your couch co-pilot. Buddy sees your game, talks you past hard parts, finds secrets, and cheers wins." },
      { href: "/leaderboards", label: "Leaderboards", quick: "Top scores for every game.", detail: "Bragging rights central. Daily and all-time highs per game - chase friends and watch your name climb." },
      { href: "/lobbies", label: "Lobbies", quick: "Live rooms waiting for players.", detail: "Multiplayer waiting rooms - see who is inside, hop in, and play. No small talk required." },
      { href: "/xonotic", label: "Xonotic Arena", quick: "Robot-played arena shooter.", detail: "VibeCodeWorker plays Xonotic for you on a GPU-boosted RunPod remote. Off-site mode needs the desktop worker installed." },
    ],
  },
  {
    label: "🛠️ Make Games",
    tagline: "Remix, submit, and debug games.",
    links: [
      { href: "/newgameplus", label: "NewGamePlus", quick: "Remix a game into its sequel with AI.", detail: "Type an idea like “space cats race cars”, pick a budget, and get a playable draft tested by our robot." },
      { href: "/submit", label: "Submit Game", quick: "Send us your game to list.", detail: "Submit a .zip in minutes. We review for safety, then it can go live - you keep 75% of gifts as credits." },
      { href: "/vault", label: "Weird Vault", quick: "Private files + rare oddities.", detail: "Your private file storage plus weird archive experiments. Scoped to you, your team, or your org." },
      { href: "/web-apps", label: "Web Apps", quick: "Load, poke, and debug your builds.", detail: "Your builds under the microscope - break them safely and get evidence to fix fast." },
      { href: "/vibecodeworker", label: "VibeCodeWorker", quick: "Robot that playtests + files bugs.", detail: "Watch → Think → Do → Report. Runs your game, clicks everything, and writes a plain-English bug report." },
    ],
  },
  {
    label: "⚡ Rent Power",
    tagline: "Cloud GPUs and helpers, by the minute.",
    links: [
      { href: "/agents", label: "AI Agents", quick: "Rent helpers that do work for you.", detail: "Hire-a-brain. Agents research, code, and grind boring work. Escrow holds the max, you pay per second used." },
      { href: "/runpods", label: "My RunPods", quick: "Your cloud GPUs in one list.", detail: "Every RunPod you created - desktops, remotes, servers, render workers - with Stop / Start / Terminate." },
      { href: "/desktop", label: "Virtual Desktop", quick: "A whole computer in your browser.", detail: "Spin up a cloud PC for building or homework. Warns, then stops when idle - meter ends when closed." },
      { href: "/swarm", label: "Agent Swarm", quick: "1-5 AI helpers as one chat.", detail: "Hire agents as one chatbot. Auto / Lead / Round-robin, per-turn metering with 25% inside." },
      { href: "/squads", label: "UnitUnite", quick: "Work teams with shared wallet.", detail: "Squads are teams: shared coins, roles (Lord / Captain / Banker / Watcher), rooms, and Ghost Cash timer." },
      { href: "/timer", label: "Timer & Work Diary", quick: "Focus timer + auto diary.", detail: "Clock work to the second with screenshot proofs. Ghost Cash IOUs measure debts - no cash value." },
    ],
  },
  {
    label: "💼 Business & Teams",
    tagline: "Squads, invoices, CRM, and the vault.",
    links: [
      { href: "/business", label: "Business Hub", quick: "All business tools in one place.", detail: "UnitUnite squads, timer, projects, invoices, CRM, team management, and the vault - one coin, 100 coins = $1." },
      { href: "/business/crm", label: "Business CRM", quick: "Contacts and pipelines.", detail: "Contacts, pipelines, and follow-ups for teams that sell things." },
      { href: "/business/invoices", label: "Invoices", quick: "Bill clients in Vibe Coins.", detail: "Itemized, escrowed invoicing settled per second in Vibe Coins." },
      { href: "/squads", label: "UnitUnite", quick: "Work teams with shared wallet.", detail: "Squads are teams: shared coins, roles, rooms, projects, and metered cloud." },
      { href: "/timer", label: "Timer & Work Diary", quick: "Focus timer + auto diary.", detail: "Clock work to the second with screenshot proofs. Ghost Cash IOUs measure debts - no cash value." },
      { href: "/vault", label: "Data Vault", quick: "Private files for teams.", detail: "Blob-based file storage with personal, team, and org scopes, strictly separated." },
    ],
  },
  {
    label: "🎨 Art & 3D",
    tagline: "Art, voice, video, and 3D renders.",
    links: [
      { href: "/fal", label: "fal.ai Studio", quick: "30 instant art, voice + video tools.", detail: "The art vending machine. 30 one-click tools, pay per run, 25% cut already inside every price." },
      { href: "/meshy", label: "Meshy 3D", quick: "Words and pictures → 3D models.", detail: "Type it, get a dragon. Finished models auto-save to your Vault with game-ready advice." },
      { href: "/blender", label: "Blender Renders", quick: "Blender scenes → mp4 on a 4090.", detail: "Upload a .blend scene, get an mp4 back rendered on a pinned RTX 4090 cloud GPU. No Blender install needed." },
      { href: "/spaceships", label: "Spaceships", quick: "Collectible ships for your profile.", detail: "Goofy-serious ships to collect and show off across the arcade." },
    ],
  },
  {
    label: "👾 Clans & Community",
    tagline: "Find your people, back makers.",
    links: [
      { href: "/clans", label: "Clans", quick: "Cozy clubs to chat and play together.", detail: "Little clubhouses with shared games, chats, and rivalries. Join one, start one, bring friends." },
      { href: "/bot/setup", label: "Bots", quick: "Chat bots that help run things.", detail: "Issue a bot4weird_ key (shown once), connect agents, and let bots post in shared and bot clans." },
      { href: "/bot/bclans", label: "Bot Clans", quick: "Bot-led clubs, always awake.", detail: "Auto-hosted clubs where bots keep games running day and night." },
      { href: "/support", label: "Support", quick: "Tip makers, monthly or once.", detail: "Voluntary gifts in coins. Makers keep 75% as on-site credits. Final once sent, never charity." },
      { href: "/fundraisers", label: "Fundraisers", quick: "Gift-backed launches.", detail: "Back games and startups with gifts. No equity, no charity - rewards are goals, not guarantees." },
    ],
  },
  {
    label: "🎓 Learn & Docs",
    tagline: "Help, lore, and how money works.",
    links: [
      { href: "/academy", label: "Academy", quick: "Bite-size lessons through play.", detail: "School but fun - coding, art, and future skills as games and experiments." },
      { href: "/tech", label: "Technology", quick: "How the magic works, simply.", detail: "Peek behind the curtain: Next.js, Supabase, RunPod, and robots - in human words." },
      { href: "/docs", label: "Docs", quick: "Plain-English help for everything.", detail: "Lost? Start here. Getting Started and FAQ explain the whole site like a friendly manual." },
      { href: "/docs/agents-compute", label: "Agents & Compute", quick: "Rent cloud by the second.", detail: "Booking, escrow, and per-second metering for agents, desktops, and squad workspaces - all in Vibe Coins." },
      { href: "/pricing", label: "Pricing", quick: "100 coins = $1, fees inside.", detail: "One-sentence economy: 100 Vibe Coins is always exactly $1.00, 25% cut included, never on top." },
      { href: "/ads", label: "Advertise", quick: "House ads, all in one wall.", detail: "Every 4weird house ad on one glorious wall. 100% skippable, 0 trackers, maximum weird." },
      { href: GITHUB_HREF, label: "GitHub", quick: "Code, issues, and releases.", detail: "The public repo mirror. Read code, file issues, and watch releases.", external: true },
    ],
  },
  {
    label: "💰 My Money & Me",
    tagline: "Coins, saves, and settings.",
    links: [
      { href: "/account", label: "Account", quick: "Dashboard - coins, saves, settings.", detail: "Mission control: balances, daily claim, referrals, saves, and profile." },
      { href: "/my/usage/", label: "Usage", quick: "Receipts for every coin + GPU minute.", detail: "Cloud minutes, agent runs, and coin spends in plain rows - mirror of real RunPod spend." },
      { href: "/favorites", label: "Favorites", quick: "Your starred pages, in one place.", detail: "Every page you starred with ☆ - pinned here, in the Menu sidebar, and on the /favorites page. Saved on this device." },
      { href: "/accessibility", label: "Accessibility", quick: "Play your way - text, color, voice.", detail: "Bigger text, color-vision filters, eye-tracker, and single-switch controls. Saves on this device." },
      { href: "/family/login", label: "Family Login", quick: "Kid login with name#1234.", detail: "Children log in with their username#1234 handle and password. No email needed." },
      { href: "/pricing", label: "Pricing", quick: "100 coins = $1, fees inside.", detail: "One-sentence economy: 100 Vibe Coins is always exactly $1.00, 25% cut included, never on top." },
    ],
  },
];

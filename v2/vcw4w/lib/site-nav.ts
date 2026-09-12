export type SiteNavLink = {
  href: string;
  label: string;
  /** One-line plain-English teaser shown in the sidebar / as title. */
  quick: string;
  /**
   * Two-paragraph detail for the (?) popover. Paragraphs are separated by a
   * blank line and rendered as real <p> blocks by InfoTip.
   */
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
      { href: "/games", label: "All Games", quick: "All 35 games - click and play.", detail: "The arcade shelf. Every game runs in your browser in seconds, saves follow your account, and 100 free welcome coins get you started.\n\nNew here? Start with any free game - no wallet needed. Your high scores and saves sync whenever you sign in." },
      { href: "/buddy", label: "Gaming Buddy", quick: "Voice coach that watches your screen.", detail: "Your couch co-pilot. Buddy sees your game, talks you past hard parts, finds secrets, and cheers wins.\n\nPress the mic and talk like a friend is beside you. Buddy only sees the game tab you share, never your files." },
      { href: "/leaderboards", label: "Leaderboards", quick: "Top scores for every game.", detail: "Bragging rights central. Daily and all-time highs per game - chase friends and watch your name climb.\n\nDaily boards reset for a fresh race; all-time boards are for legends. Ties split the glory, so play again to break them." },
      { href: "/lobbies", label: "Lobbies", quick: "Live rooms waiting for players.", detail: "Multiplayer waiting rooms - see who is inside, hop in, and play. No small talk required.\n\nEvery room shows the game, players, and ping before you join. Make your own room in one tap and friends jump straight in." },
      { href: "/xonotic", label: "Xonotic Arena", quick: "Robot-played arena shooter.", detail: "VibeCodeWorker plays Xonotic for you on a GPU-boosted RunPod remote. Off-site mode needs the desktop worker installed.\n\nRuns are metered by the minute in Vibe Coins, and replays save to your account. The robot handles hosting - you handle the aiming." },
    ],
  },
  {
    label: "🛠️ Make Games",
    tagline: "Remix, submit, and debug games.",
    links: [
      { href: "/newgameplus", label: "NewGamePlus", quick: "Remix a game into its sequel with AI.", detail: "Type an idea like “space cats race cars”, pick a budget, and get a playable draft tested by our robot.\n\nYou approve every step before coins are spent, and drafts autosave. If a draft flops, remix again from your last checkpoint." },
      { href: "/submit", label: "Submit Game", quick: "Send us your game to list.", detail: "Submit a .zip in minutes. We review for safety, then it can go live - you keep 75% of gifts as credits.\n\nYour zip stays private until you approve the listing. Once live, player gifts convert to credits with a 75% maker share." },
      { href: "/vault", label: "Weird Vault", quick: "Private files + rare oddities.", detail: "Your private file storage plus weird archive experiments. Scoped to you, your team, or your org.\n\nUpload from any device and grab a private link to share. Vault files are never listed publicly - what is yours stays yours." },
      { href: "/web-apps", label: "Web Apps", quick: "Load, poke, and debug your builds.", detail: "Your builds under the microscope - break them safely and get evidence to fix fast.\n\nPaste a build URL and the debugger pokes every button for you. Reports read like plain English, with screenshots for each failure." },
      { href: "/vibecodeworker", label: "VibeCodeWorker", quick: "Robot that playtests + files bugs.", detail: "Watch → Think → Do → Report. Runs your game, clicks everything, and writes a plain-English bug report.\n\nPoint it at a game and it plays for hours while you sleep. You wake up to ranked bugs, each with steps to reproduce." },
    ],
  },
  {
    label: "⚡ Rent Power",
    tagline: "Cloud GPUs and helpers, by the minute.",
    links: [
      { href: "/agents", label: "AI Agents", quick: "Rent helpers that do work for you.", detail: "Hire-a-brain. Agents research, code, and grind boring work. Escrow holds the max, you pay per second used.\n\nPick a helper, set a max budget, and escrow locks only that amount. Unused escrow returns automatically when the job ends." },
      { href: "/runpods", label: "My RunPods", quick: "Your cloud GPUs in one list.", detail: "Every RunPod you created - desktops, remotes, servers, render workers - with Stop / Start / Terminate.\n\nGreen means running and billing; stopped pods keep the disk but cost nothing. Terminate is the only button that deletes." },
      { href: "/desktop", label: "Virtual Desktop", quick: "A whole computer in your browser.", detail: "Spin up a cloud PC for building or homework. Warns, then stops when idle - meter ends when closed.\n\nIt opens in a browser tab - no installs, no VPN. Files you save to the Vault survive after the desktop stops." },
      { href: "/swarm", label: "Agent Swarm", quick: "1-5 AI helpers as one chat.", detail: "Hire agents as one chatbot. Auto / Lead / Round-robin, per-turn metering with 25% inside.\n\nStart with one agent and add more as the job grows. Every turn is itemized, so you always see who spent what." },
      { href: "/squads", label: "UnitUnite", quick: "Work teams with shared wallet.", detail: "Squads are teams: shared coins, roles (Lord / Captain / Banker / Watcher), rooms, and Ghost Cash timer.\n\nInvite by username - no emails, no friction. The shared wallet shows every coin in and out, down to the second." },
      { href: "/timer", label: "Timer & Work Diary", quick: "Focus timer + auto diary.", detail: "Clock work to the second with screenshot proofs. Ghost Cash IOUs measure debts - no cash value.\n\nOne tap starts the clock; screenshots prove the work. Ghost Cash tracks who owes whom without moving real money." },
    ],
  },
  {
    label: "💼 Business & Teams",
    tagline: "Squads, invoices, CRM, and the vault.",
    links: [
      { href: "/business", label: "Business Hub", quick: "All business tools in one place.", detail: "UnitUnite squads, timer, projects, invoices, CRM, team management, and the vault - one coin, 100 coins = $1.\n\nEverything bills in one coin at a fixed rate. Invite staff free and pay only for metered work and payouts." },
      { href: "/business/crm", label: "Business CRM", quick: "Contacts and pipelines.", detail: "Contacts, pipelines, and follow-ups for teams that sell things.\n\nImport contacts in seconds and every follow-up lands on the shared timeline. Pipelines stay simple: lead, talking, won." },
      { href: "/business/invoices", label: "Invoices", quick: "Bill clients in Vibe Coins.", detail: "Itemized, escrowed invoicing settled per second in Vibe Coins.\n\nClients pay from escrow, released per second of approved work. Disputes freeze the balance until both sides agree." },
      { href: "/squads", label: "UnitUnite", quick: "Work teams with shared wallet.", detail: "Squads are teams: shared coins, roles, rooms, projects, and metered cloud.\n\nRoles keep permissions obvious - Lords own, Captains run, Bankers pay, Watchers observe. Every action lands in the team diary." },
      { href: "/timer", label: "Timer & Work Diary", quick: "Focus timer + auto diary.", detail: "Clock work to the second with screenshot proofs. Ghost Cash IOUs measure debts - no cash value.\n\nDiaries export to invoices in one tap, so tracked time becomes billable time. Breaks pause the clock automatically." },
      { href: "/vault", label: "Data Vault", quick: "Private files for teams.", detail: "Blob-based file storage with personal, team, and org scopes, strictly separated.\n\nTeam and org folders inherit roles automatically. The audit log shows who opened what, forever." },
    ],
  },
  {
    label: "🎨 Art & 3D",
    tagline: "Art, voice, video, and 3D renders.",
    links: [
      { href: "/fal", label: "fal.ai Studio", quick: "30 instant art, voice + video tools.", detail: "The art vending machine. 30 one-click tools, pay per run, 25% cut already inside every price.\n\nType, pick a tool, hit run - results land in seconds. Every finished piece can save straight to your Vault." },
      { href: "/meshy", label: "Meshy 3D", quick: "Words and pictures → 3D models.", detail: "Type it, get a dragon. Finished models auto-save to your Vault with game-ready advice.\n\nDescribe materials too - “rusty robot dragon” beats “dragon”. Downloads include formats ready for Unity and Godot." },
      { href: "/blender", label: "Blender Renders", quick: "Blender scenes → mp4 on a 4090.", detail: "Upload a .blend scene, get an mp4 back rendered on a pinned RTX 4090 cloud GPU. No Blender install needed.\n\nQueue from the browser and watch progress live. You pay only for render minutes, never for upload or waiting." },
      { href: "/spaceships", label: "Spaceships", quick: "Collectible ships for your profile.", detail: "Goofy-serious ships to collect and show off across the arcade.\n\nRare ships drop from events, never from stores. Equip one and it flies beside your name everywhere." },
    ],
  },
  {
    label: "👾 Clans & Community",
    tagline: "Find your people, back makers.",
    links: [
      { href: "/clans", label: "Clans", quick: "Cozy clubs to chat and play together.", detail: "Little clubhouses with shared games, chats, and rivalries. Join one, start one, bring friends.\n\nDues are optional and always visible before you join. Clan gifts split to makers, with your cut landing as credits." },
      { href: "/bot/setup", label: "Bots", quick: "Chat bots that help run things.", detail: "Issue a bot4weird_ key (shown once), connect agents, and let bots post in shared and bot clans.\n\nKeys show exactly once - store yours like a password. Rotate anytime; old keys die instantly." },
      { href: "/bot/bclans", label: "Bot Clans", quick: "Bot-led clubs, always awake.", detail: "Auto-hosted clubs where bots keep games running day and night.\n\nBots enforce the posted rules around the clock. Humans can always appeal to a mod from the clan page." },
      { href: "/support", label: "Support", quick: "Tip makers, monthly or once.", detail: "Voluntary gifts in coins. Makers keep 75% as on-site credits. Final once sent, never charity.\n\nSet a monthly tier or send a one-time gift - both take seconds. Canceled tiers stay active until the month ends." },
      { href: "/fundraisers", label: "Fundraisers", quick: "Gift-backed launches.", detail: "Back games and startups with gifts. No equity, no charity - rewards are goals, not guarantees.\n\nGoals unlock rewards only if fully backed - no partial charges. Creators post updates so backers see real progress." },
    ],
  },
  {
    label: "🎓 Learn & Docs",
    tagline: "Help, lore, and how money works.",
    links: [
      { href: "/academy", label: "Academy", quick: "Bite-size lessons through play.", detail: "School but fun - coding, art, and future skills as games and experiments.\n\nLessons take five minutes and end with a playable experiment. Streaks earn coins, not grades." },
      { href: "/tech", label: "Technology", quick: "How the magic works, simply.", detail: "Peek behind the curtain: Next.js, Supabase, RunPod, and robots - in human words.\n\nNo jargon without a translation next to it. Each page links the real code and the live demo it describes." },
      { href: "/docs", label: "Docs", quick: "Plain-English help for everything.", detail: "Lost? Start here. Getting Started and FAQ explain the whole site like a friendly manual.\n\nSearch answers in plain words - “coins”, “gpu”, “bot” all work. Still stuck? Every page ends with where to ask." },
      { href: "/docs/agents-compute", label: "Agents & Compute", quick: "Rent cloud by the second.", detail: "Booking, escrow, and per-second metering for agents, desktops, and squad workspaces - all in Vibe Coins.\n\nEscrow math is worked with real numbers, not formulas. A 10-minute desktop rental costs less than a coffee." },
      { href: "/pricing", label: "Pricing", quick: "100 coins = $1, fees inside.", detail: "One-sentence economy: 100 Vibe Coins is always exactly $1.00, 25% cut included, never on top.\n\nTop up with a card and coins land instantly. Spending always uses the oldest coins first, before they expire." },
      { href: "/ads", label: "Advertise", quick: "House ads, all in one wall.", detail: "Every 4weird house ad on one glorious wall. 100% skippable, 0 trackers, maximum weird.\n\nHouse ads never track you and never autoplay sound. Makers can submit their own ad from the same wall." },
      { href: GITHUB_HREF, label: "GitHub", quick: "Code, issues, and releases.", detail: "The public repo mirror. Read code, file issues, and watch releases.\n\nStar the repo to follow releases. Good first issues are labeled for newcomers.", external: true },
    ],
  },
  {
    label: "💰 My Money & Me",
    tagline: "Coins, saves, and settings.",
    links: [
      { href: "/account", label: "Account", quick: "Dashboard - coins, saves, settings.", detail: "Mission control: balances, daily claim, referrals, saves, and profile.\n\nDaily coins claim in one tap when available. Referrals pay both sides the moment your friend joins." },
      { href: "/my/usage/", label: "Usage", quick: "Receipts for every coin + GPU minute.", detail: "Cloud minutes, agent runs, and coin spends in plain rows - mirror of real RunPod spend.\n\nFilter by day, game, or GPU minute. Anything surprising links straight to the charge detail." },
      { href: "/favorites", label: "Favorites", quick: "Your starred pages, in one place.", detail: "Every page you starred with ☆ - pinned here, in the Menu sidebar, and on the /favorites page. Saved on this device.\n\nStars are per device, so phone and desktop keep their own sets. Clear site data and they reset - export first." },
      { href: "/accessibility", label: "Accessibility", quick: "Play your way - text, color, voice.", detail: "Bigger text, color-vision filters, eye-tracker, and single-switch controls. Saves on this device.\n\nSettings apply instantly and save on this device. Every game respects text size and color filters automatically." },
      { href: "/family/login", label: "Family Login", quick: "Kid login with name#1234.", detail: "Children log in with their username#1234 handle and password. No email needed.\n\nParents create handles from the account page in seconds. Kids can never spend coins without approval." },
      { href: "/pricing", label: "Pricing", quick: "100 coins = $1, fees inside.", detail: "One-sentence economy: 100 Vibe Coins is always exactly $1.00, 25% cut included, never on top.\n\nMakers keep 75% of gifts as on-site credits. The 25% cut is always inside the price, never added." },
    ],
  },
];

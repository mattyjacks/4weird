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
      { href: "/games", label: "🎮 All Games", quick: "Browse every game in one place. Pick one and play in seconds. Saves follow your account.", detail: "The arcade shelf. Every game runs in your browser in seconds, saves follow your account, and 100 free welcome coins get you started.\n\nNew here? Start with any free game - no wallet needed. Your high scores and saves sync whenever you sign in." },
      { href: "/gravegain", label: "🪦 GraveGain Universe", quick: "Explore shared lore and missions across every GraveGain dimension.", detail: "Every GraveGain game shares one universe. Read the lore by age band, track what you have collected, and work toward completing every mission across every version." },
      { href: "/mmo", label: "🎮 Play MMO — live servers", quick: "Find a live realm and jump in. Rules and age bands show before you join.", detail: "The realm browser. Find a kid-safe community server, see who is online, and jump in from your browser.\n\nEvery realm lists its age band and rules before you join. Want your own? Rent a server and set the rules yourself." },
      { href: "/buddy", label: "🐶 Gaming Buddy", quick: "Talk through hard parts by voice. Buddy watches only the game you share. Hints stay short and friendly.", detail: "Your couch co-pilot. Buddy sees your game, talks you past hard parts, finds secrets, and cheers wins.\n\nPress the mic and talk like a friend is beside you. Buddy only sees the game tab you share, never your files." },
      { href: "/leaderboards", label: "🏆 Leaderboards", quick: "Check top scores for each game. Climb daily boards or chase all time highs.", detail: "Bragging rights central. Daily and all-time highs per game - chase friends and watch your name climb.\n\nDaily boards reset for a fresh race; all-time boards are for legends. Ties split the glory, so play again to break them." },
      { href: "/lobbies", label: "🎪 Lobbies", quick: "See rooms waiting for players. Join in one tap with no hassle.", detail: "Multiplayer waiting rooms - see who is inside, hop in, and play. No small talk required.\n\nEvery room shows the game, players, and ping before you join. Make your own room in one tap and friends jump straight in." },
      { href: "/mmo/rent", label: "🖥️ Rent a Realm", quick: "Start your own always on realm. Set rules and invite friends by link.", detail: "Your own always-on realm with your rules, your map, and your mods.\n\nPick a size, pay by the minute in Vibe Coins, and invite friends with a link. Pause anytime - the world saves." },
      { href: "/games/servers", label: "🌐 Game Servers", quick: "Filter shards by game and age. Join straight from the list.", detail: "The shard browser. Filter by game, age band, and population, see live coins-per-minute quotes and free-play badges.\n\nEvery server lists its age band before you join. Join links carry you straight into the game." },
      { href: "/games/servers/rent", label: "🖥️ Rent a Server", quick: "Rent a shard in five steps. Pay by the minute and pause anytime.", detail: "Rent your own shard in five steps: game, size, age band, subsidy, quote and confirm.\n\nHourly rental prorated per minute. The world saves when you pause." },
    ],
  },
  {
    label: "🛠️ Make Games",
    tagline: "Remix, submit, and debug games.",
    links: [
      { href: "/newgameplus", label: "✨ NewGamePlus", quick: "Turn an idea into a sequel draft. Approve each step before coins move.", detail: "Type an idea like “space cats race cars”, pick a budget, and get a playable draft tested by our robot.\n\nYou approve every step before coins are spent, and drafts autosave. If a draft flops, remix again from your last checkpoint." },
      { href: "/gamestudio", label: "🎮 GameStudio", quick: "Edit code and assets together. Preview builds live in the browser.", detail: "Unified game development environment combining code editor, asset pipeline, and Godot 4.6.1 engine.\n\nBuild 2D and 3D games with live preview, asset generation, and clean-room game cloning." },
      { href: "/gamestudio/debugplay", label: "🎮 DebugPlay", quick: "Let bots playtest your build. Get clear reports with steps to fix.", detail: "Autonomous game testing agent that navigates game worlds, grabs visual frames, and files verified bugs.\n\nSupports interactive human takeover, state save/load checkpoints, and automated diff patches." },
      { href: "/submit", label: "🚀 Submit Game", quick: "Pack your game as a zip. Send it for a quick safety review. Earn credits when players gift.", detail: "Submit a .zip in minutes. We review for safety, then it can go live - you keep 75% of gifts as credits.\n\nYour zip stays private until you approve the listing. Once live, player gifts convert to credits with a 75% maker share." },
      { href: "/builder", label: "🧬 Clone Tool", quick: "Build desktop installers with clicks. Ship for Windows Mac and Linux.", detail: "Visual installer generator producing standalone .exe, .dmg, and .deb packages from 4weird projects.\n\nCustomize icons, splash screens, licenses, and bundled runtimes with zero command-line hassle." },
      { href: "/vault", label: "🗄️ Weird Vault", quick: "Store private files for projects. Share them with safe private links.", detail: "Your private file storage plus weird archive experiments. Scoped to you, your team, or your org.\n\nUpload from any device and grab a private link to share. Vault files are never listed publicly - what is yours stays yours." },
      { href: "/web-apps", label: "🌐 Web Apps", quick: "Paste a build link to test. Get plain words plus screenshots.", detail: "Your builds under the microscope - break them safely and get evidence to fix fast.\n\nPaste a build URL and the debugger pokes every button for you. Reports read like plain English, with screenshots for each failure." },
      { href: "/vibecodeworker", label: "👩🏻‍💻 VibeCodeWorker", quick: "Point the robot at your game. Wake up to ranked bug reports.", detail: "Watch → Think → Do → Report. Runs your game, clicks everything, and writes a plain-English bug report.\n\nPoint it at a game and it plays for hours while you sleep. You wake up to ranked bugs, each with steps to reproduce." },
      { href: "/music/maker", label: "🎹 Music Maker", quick: "Write songs in a step sequencer. Make tiny files built for games.", detail: "Fruity-Loops-style step sequencer plus a ray-gun SFX lab, all on-device. Songs are ultra-small synth JSON made for game embeds.\n\nBots can compose too via the music API. Finished tracks appear in the public library." },
      { href: "/music/all", label: "🎵 Music Library", quick: "Browse public tracks and effects. Preview fast and download tiny files.", detail: "The public jukebox: game soundtrack transcriptions, user tracks, and one-click SFX for makers.\n\nPreview in the browser, download the tiny JSON, and drop it straight into any game." },
    ],
  },
  {
    label: "🌐 Rent Tech",
    tagline: "Cloud GPUs, desktops and helpers, by the minute.",
    links: [
      { href: "/agents", label: "👱🏻‍♀️ AI Agents", quick: "Hire helpers for boring work. Pay only for seconds actually used.", detail: "Hire-a-brain. Agents research, code, and grind boring work. Escrow holds the max, you pay per second used.\n\nPick a helper, set a max budget, and escrow locks only that amount. Unused escrow returns automatically when the job ends." },
      { href: "/runpods", label: "⚡ My RunPods", quick: "See every cloud computer you own. Stop a pod to pause billing. Terminate only to delete it.", detail: "Every RunPod you created - desktops, remotes, servers, render workers - with Stop / Start / Terminate.\n\nGreen means running and billing; stopped pods keep the disk but cost nothing. Terminate is the only button that deletes." },
      { href: "/commander", label: "⚡ CryptArt Commander", quick: "Run power commands in one terminal. Check coins systems and runs fast.", detail: "Full-screen drop-down terminal (Ctrl+Backquote) with 50+ commands for system telemetry and automation.\n\nScript multi-step pipelines, query coin balances, trigger game QA runs, and inspect API endpoints." },
      { href: "/desktop", label: "💻 Virtual Desktop", quick: "Open a full cloud computer. Work or build in a browser tab. Closing stops the meter.", detail: "Spin up a cloud PC for building or homework. Warns, then stops when idle - meter ends when closed.\n\nIt opens in a browser tab - no installs, no VPN. Files you save to the Vault survive after the desktop stops." },
      { href: "/compute", label: "⚡ Share Compute", quick: "Share idle power for coins. Or benchmark this device in private.", detail: "The compute hub. Donate idle CPU/GPU seconds for Vibe Coins, or privately benchmark what your device can do.\n\nBoth tools run in your browser - nothing is shared or uploaded unless you opt in. Need rented hardware instead? Rent a desktop." },
      { href: "/compute/p2p", label: "⏱️ DonatePersonalSeconds", quick: "Lend spare browser power. Earn coins while pages stay safe.", detail: "Micro-volunteering network where users share idle CPU/GPU seconds to earn Vibe Coins.\n\nProcesses distributed video renders, sprite compression, and game QA runs via sandboxed Web Workers." },
      { href: "/swarm", label: "🐝 Agent Swarm", quick: "Chat with one to five helpers. See each turn priced clearly.", detail: "Hire agents as one chatbot. Auto / Lead / Round-robin, per-turn metering with 25% inside.\n\nStart with one agent and add more as the job grows. Every turn is itemized, so you always see who spent what." },
      { href: "/squads", label: "🛡️ UnitUnite", quick: "Team up with shared coins. Roles keep spending clear.", detail: "Squads are teams: shared coins, roles (Lord / Captain / Banker / Watcher), rooms, and Ghost timer.\n\nInvite by username - no emails, no friction. The shared wallet shows every coin in and out, down to the second." },
      { href: "/timer", label: "⏱️ Timer & Work Diary", quick: "Time work to the second. Turn proven hours into invoices.", detail: "Clock work to the second with screenshot proofs. Ghost records measure debts - no monetary value.\n\nOne tap starts the clock; screenshots prove the work. Ghost tracks who owes whom without moving real money." },
      { href: "/tools", label: "🛠️ Free Utilities", quick: "Use free tools that run on device. No signup and no meter.", detail: "Instant browser utilities with zero signup: SEO analyzer, image compressor, game copywriter, and word counters.\n\nRuns 100% locally on your machine with no metering and no account required." },
    ],
  },
  {
    label: "💼 Business & Teams",
    tagline: "Squads, invoices, CRM, and the vault.",
    links: [
      { href: "/business", label: "💼 Business Hub", quick: "Run squads invoices and CRM together. Pay only for metered work.", detail: "UnitUnite squads, timer, projects, invoices, CRM, team management, and the vault - one coin, 100 coins = $1.\n\nEverything bills in one coin at a fixed rate. Invite staff free and pay only for metered work and payouts." },
      { href: "/business/crm", label: "👥 Business CRM", quick: "Track contacts and follow ups. Keep every deal stage visible.", detail: "Contacts, pipelines, and follow-ups for teams that sell things.\n\nImport contacts in seconds and every follow-up lands on the shared timeline. Pipelines stay simple: lead, talking, won." },
      { href: "/business/invoices", label: "🧾 Invoices", quick: "Bill clients in coins. Release escrow as work gets approved.", detail: "Itemized, escrowed invoicing settled per second in Vibe Coins.\n\nClients pay from escrow, released per second of approved work. Disputes freeze the balance until both sides agree." },
      { href: "/business/tax", label: "🤖 Tax Info Bot", quick: "Estimate freelance taxes fast. Sort receipts and export clean sheets.", detail: "Autonomous tax and expense organizer for digital creators, freelancers, and game developers.\n\nEstimates quarterly taxes, parses receipt images, categorizes business write-offs, and exports clean CSVs." },
      { href: "/squads", label: "🛡️ UnitUnite", quick: "Team up with shared coins. Roles keep spending clear.", detail: "Squads are teams: shared coins, roles, rooms, projects, and metered cloud.\n\nRoles keep permissions obvious - Lords own, Captains run, Bankers pay, Watchers observe. Every action lands in the team diary." },
      { href: "/timer", label: "⏱️ Timer & Work Diary", quick: "Time work to the second. Turn proven hours into invoices.", detail: "Clock work to the second with screenshot proofs. Ghost records measure debts - no monetary value.\n\nDiaries export to invoices in one tap, so tracked time becomes billable time. Breaks pause the clock automatically." },
      { href: "/vault", label: "🗄️ Data Vault", quick: "Keep team files private and scoped. See who opened what anytime.", detail: "Blob-based file storage with personal, team, and org scopes, strictly separated.\n\nTeam and org folders inherit roles automatically. The audit log shows who opened what, forever." },
    ],
  },
  {
    label: "🎨 Art & 3D",
    tagline: "Art, voice, video, and 3D renders.",
    links: [
      { href: "/studio/video", label: "📺 Media Mogul", quick: "Cut video on a timeline. Export sharp files from the browser.", detail: "Professional multi-track video editing, DaVinci color grading, and AI auto-edit studio with zero hardcoded limits.\n\nCut, trim, arrange tracks, add transitions, and export high-bitrate video directly in your browser." },
      { href: "/studio/paint", label: "🎨 DictatePic", quick: "Paint with layers and undo. Add smart fixes by voice.", detail: "GIMP-style layered image editor with drawing tools, blend modes, and voice-guided AI inpainting.\n\nDraw game sprites, tweak textures, and composite layered artwork with full undo history." },
      { href: "/studio/recorder", label: "🎥 DemoRecorder", quick: "Record screen and inputs together. Export video plus clean data.", detail: "Record screens, windows, and webcam while logging frame-accurate keyboard and mouse inputs for AI training.\n\nExport high-FPS webm/mp4 video and structured JSON input datasets in one click." },
      { href: "/studio/audio", label: "🗣️ AliveSpeech Lab", quick: "Make voices and clean audio. Add subtitles ready for video.", detail: "Multi-voice dialogue generation powered by ElevenLabs and EBU R128 web audio mastering at -14 LUFS.\n\nGenerate character voiceovers, podcasts, and frame-accurate SRT subtitle tracks." },
      { href: "/luck", label: "🍀 Luck Factory", quick: "Set a focus and meditate short. Save lucky seeds for games.", detail: "Cryptographic intention hashing and quantum luck seed synthesizer for game RNG and AI prompts.\n\nSet an intention, meditate on your goal, and anchor deterministic seeds across all 4weird arcade games." },
      { href: "/pet", label: "🐶 Virtual Pet Room", quick: "Raise a small 3D friend. Feed play and decorate its room.", detail: "A living 3D virtual companion built in Three.js that lives in your room, plays games, and learns your habits.\n\nFeed, pet, customize decorations, and chat with your companion using AliveSpeech." },
      { href: "/fal", label: "🎨 fal.ai Studio", quick: "Run thirty quick art tools. Save finished work to the Vault.", detail: "The art vending machine. 30 one-click tools, pay per run, 25% cut already inside every price.\n\nType, pick a tool, hit run - results land in seconds. Every finished piece can save straight to your Vault." },
      { href: "/meshy", label: "🧊 Meshy 3D", quick: "Turn words into 3D models. Download files ready for engines.", detail: "Type it, get a dragon. Finished models auto-save to your Vault with game-ready advice.\n\nDescribe materials too - “rusty robot dragon” beats “dragon”. Downloads include formats ready for Unity and Godot." },
      { href: "/blender", label: "🎥 Blender Renders", quick: "Upload a Blender scene. Get video back rendered fast.", detail: "Upload a .blend scene, get an mp4 back rendered on a pinned RTX 4090 cloud GPU. No Blender install needed.\n\nQueue from the browser and watch progress live. You pay only for render minutes, never for upload or waiting." },
      { href: "/game/spaceships", label: "🛸 Spaceships", quick: "Collect ships for your profile. Show rare finds beside your name.", detail: "Goofy-serious ships to collect and show off across the arcade.\n\nRare ships drop from events, never from stores. Equip one and it flies beside your name everywhere." },
    ],
  },
  {
    label: "👾 Clans & Community",
    tagline: "Find your people, back makers.",
    links: [
      { href: "/clans", label: "🏰 Clans", quick: "Join a small friendly club. Chat play and share gifts together.", detail: "Little clubhouses with shared games, chats, and rivalries. Join one, start one, bring friends.\n\nDues are optional and always visible before you join. Clan gifts split to makers, with your cut landing as credits." },
      { href: "/bot/setup", label: "🤖 Bots", quick: "Create a bot key in seconds. Let bots post where allowed.", detail: "Issue a bot4weird_ key (shown once), connect agents, and let bots post in shared and bot clans.\n\nKeys show exactly once - store yours like a password. Rotate anytime; old keys die instantly." },
      { href: "/bot/bclans", label: "🤖 Bot Clans", quick: "Visit clubs that stay awake. Bots host games around the clock.", detail: "Auto-hosted clubs where bots keep games running day and night.\n\nBots enforce the posted rules around the clock. Humans can always appeal to a mod from the clan page." },
      { href: "/support", label: "💛 Support", quick: "Send a gift to a maker. Makers keep most of each gift. Gifts are final once sent.", detail: "Voluntary gifts in coins. Makers keep 75% as on-site credits. Final once sent, never charity.\n\nSet a monthly tier or send a one-time gift - both take seconds. Canceled tiers stay active until the month ends." },
      { href: "/fundraisers", label: "🎁 Fundraisers", quick: "Back new games with gifts. Unlock rewards when goals fill.", detail: "Back games and startups with gifts. No equity, no charity - rewards are goals, not guarantees.\n\nGoals unlock rewards only if fully backed - no partial charges. Creators post updates so backers see real progress." },
      { href: "/feedback", label: "💬 Feedback", quick: "Report a bug or share praise. Humans read every note.", detail: "Tell us what is weird. Humans review every report - no account needed, no coins involved.\n\nPlease skip passwords and keys; bots can post to the same store via the feedback API." },
    ],
  },
  {
    label: "🎓 Learn & Docs",
    tagline: "Help, lore, and how money works.",
    links: [
      { href: "/academy", label: "🎓 Academy", quick: "Learn coding and art by play. Finish five minute lessons fast.", detail: "School but fun - coding, art, and future skills as games and experiments.\n\nLessons take five minutes and end with a playable experiment. Streaks earn coins, not grades." },
      { href: "/vocrehab", label: "🧭 Voc Rehab", quick: "Try short work scenarios. Earn XP and retry anything freely.", detail: "Figure out work at your pace: play short work scenarios, rehearse conversations out loud, and sketch decisions visually. Bite-size lessons earn XP and badges — no exam energy, retry anything.\n\nTeaching sketches only, never a benefits promise or a label. Runs save only when you ask, and your export (JSON or CSV) is yours to take." },
      { href: "/tech", label: "⚙️ Technology", quick: "See how the site is built. Read plain words with live demos.", detail: "Peek behind the curtain: Next.js, Supabase, RunPod, and robots - in human words.\n\nNo jargon without a translation next to it. Each page links the real code and the live demo it describes." },
      { href: "/docs", label: "📖 Docs", quick: "Learn how the whole site works. Search in plain words. Find where to ask next.", detail: "Lost? Start here. Getting Started and FAQ explain the whole site like a friendly manual.\n\nSearch answers in plain words - “coins”, “gpu”, “bot” all work. Still stuck? Every page ends with where to ask." },
      { href: "/docs/agents-compute", label: "💻 Agents & Compute", quick: "Rent agents and desktops by second. Learn escrow with real examples.", detail: "Booking, escrow, and per-second metering for agents, desktops, and squad workspaces - all in Vibe Coins.\n\nEscrow math is worked with real numbers, not formulas. A 10-minute desktop rental costs less than a coffee." },
      { href: "/docs/future-proof-web", label: "🏗️ Future-Proof Web", quick: "Read past web mistakes listed. See fixes and owners clearly.", detail: "Every bad website-architecture decision we found, with severity and fix status: terminal vs server-exec confusion, desktop coupling, swarm state limits, route sprawl.\n\nBreaking items are filed to their owning lanes; doc-level items are fixed inline. For builders, not first-day setup." },
      { href: "/docs/mmo", label: "🐉 MMORPG Guide", quick: "Learn realms roles and safety. Pick a band that fits you.", detail: "How MMORPG realms work: picking a server, age bands, and staying safe while playing with others.\n\nStart with a public realm that matches your age band. Every realm shows its rules before you join, and mods keep the peace." },
      { href: "/docs/mmo/hosting", label: "🖥️ Hosting a Realm", quick: "Rent and set up a realm. Invite friends with one link.", detail: "Rent your own always-on MMORPG server: sizes, costs, mods, and inviting friends.\n\nYou pay only for minutes the server runs, and the world saves when you pause. Share one link and friends jump straight in." },
      { href: "/docs/mmo/age-bands", label: "🛡️ Age Bands", quick: "Match with players near your age. Bands enforce safety by default.", detail: "How age bands keep kids playing with kids: what each band allows and how enforcement works.\n\nParents pick the band once and realms enforce it automatically. Reports from the wrong band jump the mod queue." },
      { href: "/docs/mmo/player", label: "🎮 MMO Player Guide", quick: "Join a shard and split costs. Kids rooms often play free.", detail: "How to join an MMO shard: check the age band first, split server + load per minute with the room, and play free in kids and host-treated rooms.\n\n100 coins is exactly $1.00." },
      { href: "/docs/mmo/host", label: "🖥️ MMO Host Guide", quick: "Pick game size and subsidy. Pay hourly split by minute.", detail: "How to rent an MMO server: pick a game and age band, set the hostFree subsidy, and pay the hourly rental prorated per minute.\n\nPopulation defaults to 32 players." },
      { href: "/docs/mmo/safety", label: "🛡️ MMO Safety", quick: "Play in three safe bands. Chat stays short and reported fast.", detail: "How MMO shards stay kid-safe: three age bands, birthdays checked in memory and never stored, 140-character chat limits, and in-product reporting." },
      { href: "/docs/mmo/faq", label: "❓ MMO FAQ", quick: "Get billing and access answers. Fix common join errors fast.", detail: "MMO billing and access answers: why per-minute metering, what 402 and 403 mean, quote-mismatch retries, and what happens when the host runs dry." },
      { href: "/docs/vocrehab/schedule-juggle", label: "🗓️ Schedule Juggle Guide", quick: "Learn monthly play and travel. Pick Easy Medium or Hard.", detail: "How Schedule Juggle monthly play works: the 24-hour day, travel modes including plane and Alaska trips, Easy, Medium, and Hard levels, saves, and privacy.\n\nPlanning practice that starts from what you already do well — every month you finish teaches you something reusable." },
      { href: "/pricing", label: "🪙 Pricing", quick: "One coin math for everything. One hundred coins equal one dollar. Fees stay inside the price.", detail: "One-sentence economy: 100 Vibe Coins is always exactly $1.00, 25% cut included, never on top.\n\nTop up with a card and coins land instantly. Spending always uses the oldest coins first, before they expire." },
      { href: "/ads", label: "📢 Advertise", quick: "Browse every house ad together. Skip all with zero trackers.", detail: "Every 4weird house ad on one glorious wall. 100% skippable, 0 trackers, maximum weird.\n\nHouse ads never track you and never autoplay sound. Makers can submit their own ad from the same wall." },
      { href: GITHUB_HREF, label: "🐙 GitHub", quick: "Read code and track releases. File issues for newcomers and pros.", detail: "The public repo mirror. Read code, file issues, and watch releases.\n\nStar the repo to follow releases. Good first issues are labeled for newcomers.", external: true },
    ],
  },
  {
    label: "💰 My Money & Me",
    tagline: "Coins, saves, and settings.",
    links: [
      { href: "/account", label: "👑 Account", quick: "Check coins and daily rewards. Manage saves and profile. Update settings in one place.", detail: "Mission control: balances, daily claim, referrals, saves, and profile.\n\nDaily coins claim in one tap when available. Referrals pay both sides the moment your friend joins." },
      { href: "/my/usage", label: "📊 Usage", quick: "See every coin and minute spent. Filter by day game or GPU.", detail: "Cloud minutes, agent runs, and coin spends in plain rows - mirror of real RunPod spend.\n\nFilter by day, game, or GPU minute. Anything surprising links straight to the charge detail." },
      { href: "/favorites", label: "⭐ Favorites", quick: "Open everything you starred. Stars save on this device. Pin more with one tap.", detail: "Every page you starred with ☆ - pinned here, in the Menu sidebar, and on the /favorites page. Saved on this device.\n\nStars are per device, so phone and desktop keep their own sets. Clear site data and they reset - export first." },
      { href: "/accessibility", label: "♿ Accessibility", quick: "Tune text color and voice. Settings apply right away.", detail: "Bigger text, color-vision filters, eye-tracker, and single-switch controls. Saves on this device.\n\nSettings apply instantly and save on this device. Every game respects text size and color filters automatically." },
      { href: "/theme-css", label: "🎨 Site Themes", quick: "Pick from five simple themes. Your choice saves on device.", detail: "Pick the site palette: five CSS-only themes with no tracking. Your choice saves on this device only.\n\nSwitch anytime from the theme switcher in the site header. Pair with Accessibility settings to play your way." },
      { href: "/family", label: "👨‍👩‍👧‍👦 Family", quick: "Link parent and kid accounts. Kids play within parent-set limits.", detail: "Play together, safely. Parents create child accounts and set game access, budgets, rate limits, and time controls. Play charges the parent's coin balance directly.\n\nKids log in with a username handle - no email needed - and never own coins." },
      { href: "/family/login", label: "👨‍👩‍👧‍👦 Family Login", quick: "Sign kids in with handles. No email needed for play.", detail: "For families only: parents create a username#1234 handle from Account → Family, then the child signs in here. No email needed.\n\nKept out of the main nav on purpose — kids can never spend coins without approval." },
      { href: "/pricing", label: "🪙 Pricing", quick: "One coin math for everything. One hundred coins equal one dollar. Fees stay inside the price.", detail: "One-sentence economy: 100 Vibe Coins is always exactly $1.00, 25% cut included, never on top.\n\nMakers keep 75% of gifts as on-site credits. The 25% cut is always inside the price, never added." },
    ],
  },
];

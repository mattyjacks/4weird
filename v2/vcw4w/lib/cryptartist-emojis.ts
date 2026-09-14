/**
 * 🎨 CryptArtist Studio & 4weird Programmatic Logo & Emoji Transfer Registry
 *
 * Transfers the official emoji logos from the CryptArtist Studio Hub
 * (SuiteLauncher / programs) to their 1:1 equivalents inside 4weird.com.
 */

export interface CryptArtistProgramDefinition {
  id: string;
  name: string;
  shortCode: string;
  emoji: string;
  fourWeirdEquivalent: string;
  fourWeirdRoute: string;
  description: string;
  category: "creative" | "development" | "gaming" | "automation" | "compute" | "business" | "utilities";
}

/**
 * The 17 Canonical Programs from CryptArtist Studio Hub with their official emoji logos.
 */
export const CRYPTARTIST_HUB_PROGRAMS: Record<string, CryptArtistProgramDefinition> = {
  "media-mogul": {
    id: "media-mogul",
    name: "Media Mogul",
    shortCode: "MMo",
    emoji: "📺",
    fourWeirdEquivalent: "Media Mogul Video NLE & Player",
    fourWeirdRoute: "/studio/video",
    description: "Browser-native video editor, DaVinci color grading, and AI auto-edit studio",
    category: "creative",
  },
  "vibecode-worker": {
    id: "vibecode-worker",
    name: "VibeCodeWorker",
    shortCode: "VCW",
    emoji: "👩🏻‍💻",
    fourWeirdEquivalent: "VibeCodeWorker IDE & Autoplay QA",
    fourWeirdRoute: "/vibecodeworker",
    description: "In-browser vibe-coding IDE powered by Monaco, API keys, and autonomous game QA",
    category: "development",
  },
  "demo-recorder": {
    id: "demo-recorder",
    name: "DemoRecorder",
    shortCode: "DRe",
    emoji: "🎥",
    fourWeirdEquivalent: "Screen Recorder, Live Streamer & Blender Renders",
    fourWeirdRoute: "/studio/recorder",
    description: "Web screen recorder, live streamer, and synchronized user input action logger",
    category: "creative",
  },
  "valley-net": {
    id: "valley-net",
    name: "ValleyNet",
    shortCode: "VNt",
    emoji: "👱🏻‍♀️",
    fourWeirdEquivalent: "AI Agents Hub & Autonomous Swarm",
    fourWeirdRoute: "/agents",
    description: "Autonomous AI agent inspired by OpenClaw with web automation and skills",
    category: "automation",
  },
  "game-studio": {
    id: "game-studio",
    name: "GameStudio",
    shortCode: "GSt",
    emoji: "🎮",
    fourWeirdEquivalent: "Arcade Games, GameStudio & NewGamePlus",
    fourWeirdRoute: "/games",
    description: "2D/3D Game Studio engine combining Media Mogul, Three.js, and VibeCode",
    category: "gaming",
  },
  "virtual-pet": {
    id: "virtual-pet",
    name: "Virtual Pet",
    shortCode: "VPt",
    emoji: "🐶",
    fourWeirdEquivalent: "Gaming Buddy AI & 3D Pet Room",
    fourWeirdRoute: "/buddy",
    description: "AI companion creature that lives on your screen and learns your habits",
    category: "gaming",
  },
  "commander": {
    id: "commander",
    name: "CryptArt Commander",
    shortCode: "Cmd",
    emoji: "⚡",
    fourWeirdEquivalent: "Cloud Terminal & My RunPods (RTX 4090s)",
    fourWeirdRoute: "/commander",
    description: "Unified terminal and natural language CLI orchestrator for all suite tools",
    category: "utilities",
  },
  "donate-personal-seconds": {
    id: "donate-personal-seconds",
    name: "DonatePersonalSeconds",
    shortCode: "DPS",
    emoji: "⏱️",
    fourWeirdEquivalent: "Timer & Work Diary + DPS P2P Compute",
    fourWeirdRoute: "/timer",
    description: "Micro-volunteering network and drift-free time tracking for creative contributions",
    category: "compute",
  },
  "donate-computer": {
    id: "donate-computer",
    name: "Donate Computer",
    shortCode: "DCo",
    emoji: "💻",
    fourWeirdEquivalent: "Virtual Desktop & Cloud Computer",
    fourWeirdRoute: "/desktop",
    description: "Peer-to-peer compute sharing network and browser-based cloud desktops",
    category: "compute",
  },
  "clone-tool": {
    id: "clone-tool",
    name: "Clone Tool",
    shortCode: "Cln",
    emoji: "🧬",
    fourWeirdEquivalent: "NewGamePlus Remix & Game Submissions",
    fourWeirdRoute: "/newgameplus",
    description: "Instant repository cloner, project templater, and asset forker",
    category: "utilities",
  },
  "luck-factory": {
    id: "luck-factory",
    name: "Luck Factory",
    shortCode: "Lck",
    emoji: "🍀",
    fourWeirdEquivalent: "Luck Factory & Deterministic Game Seeds",
    fourWeirdRoute: "/luck",
    description: "Quantum random number generator and lucky creative prompt synthesizer",
    category: "utilities",
  },
  "dictate-pic": {
    id: "dictate-pic",
    name: "DictatePic",
    shortCode: "DPc",
    emoji: "🎨",
    fourWeirdEquivalent: "fal.ai Studio & Layered Sprite Canvas",
    fourWeirdRoute: "/fal",
    description: "Voice-driven generative image canvas and AI inpainting studio",
    category: "creative",
  },
  "tax-info-bot": {
    id: "tax-info-bot",
    name: "Tax Info Bot",
    shortCode: "Tax",
    emoji: "🤖",
    fourWeirdEquivalent: "Business Hub Invoices & Bot Clans",
    fourWeirdRoute: "/business/invoices",
    description: "Autonomous freelance and creator tax calculator & expense categorizer",
    category: "business",
  },
  "alive-speech": {
    id: "alive-speech",
    name: "Alive Speech",
    shortCode: "ALv",
    emoji: "🗣️",
    fourWeirdEquivalent: "Gaming Buddy Voice & Audio Mastering",
    fourWeirdRoute: "/studio/audio",
    description: "Ultra-realistic text-to-speech voice clone and interactive conversational avatar",
    category: "creative",
  },
  "master": {
    id: "master",
    name: "Master Dashboard",
    shortCode: "Mst",
    emoji: "👑",
    fourWeirdEquivalent: "Account Dashboard & Mission Control",
    fourWeirdRoute: "/account",
    description: "Central command dashboard for suite telemetry, projects, and active tasks",
    category: "utilities",
  },
  "settings": {
    id: "settings",
    name: "Settings",
    shortCode: "Set",
    emoji: "⚙️",
    fourWeirdEquivalent: "Our Technology & Accessibility Controls",
    fourWeirdRoute: "/tech",
    description: "API key management, appearance, and telemetry settings",
    category: "utilities",
  },
  "suite-launcher": {
    id: "suite-launcher",
    name: "Suite Launcher",
    shortCode: "SLr",
    emoji: "🗺️",
    fourWeirdEquivalent: "4weird Full Directory & Navigation",
    fourWeirdRoute: "/games",
    description: "The home screen - launch any program, open files, and view system status",
    category: "utilities",
  },
};

/**
 * 4weird Equivalent Programmatic Things with their assigned CryptArtist Emoji Logos.
 */
export const FOURWEIRD_PROGRAMMATIC_THINGS: Array<{
  name: string;
  emoji: string;
  route: string;
  sourceCryptArtistProgram: string;
  blurb: string;
}> = [
  // Creative Suite
  { name: "Media Mogul", emoji: "📺", route: "/studio/video", sourceCryptArtistProgram: "Media Mogul", blurb: "Browser NLE video editing and multi-track timeline." },
  { name: "VibeCodeWorker", emoji: "👩🏻‍💻", route: "/vibecodeworker", sourceCryptArtistProgram: "VibeCodeWorker", blurb: "Autoplay QA and browser-native vibe coding IDE." },
  { name: "DemoRecorder", emoji: "🎥", route: "/studio/recorder", sourceCryptArtistProgram: "DemoRecorder", blurb: "Screen capture, live streaming, and AI action dataset logging." },
  { name: "Blender Renders", emoji: "🎥", route: "/blender", sourceCryptArtistProgram: "DemoRecorder", blurb: "4090-backed .blend scene to MP4 video renderer." },
  { name: "DictatePic", emoji: "🎨", route: "/studio/paint", sourceCryptArtistProgram: "DictatePic", blurb: "Layered canvas, sprite editing, and AI inpainting." },
  { name: "fal.ai Studio", emoji: "🎨", route: "/fal", sourceCryptArtistProgram: "DictatePic", blurb: "30 instant art, voice, and video generation tools." },
  { name: "AliveSpeech Lab", emoji: "🗣️", route: "/studio/audio", sourceCryptArtistProgram: "Alive Speech", blurb: "Multi-voice dialogue lab and -14 LUFS loudness mastering." },
  { name: "Meshy 3D", emoji: "🧊", route: "/meshy", sourceCryptArtistProgram: "GameStudio", blurb: "Text and image to game-ready 3D models." },

  // Gaming & Simulation
  { name: "All Games", emoji: "🎮", route: "/games", sourceCryptArtistProgram: "GameStudio", blurb: "35 free browser games running instantly with cloud saves." },
  { name: "GameStudio", emoji: "🎮", route: "/gamestudio", sourceCryptArtistProgram: "GameStudio", blurb: "Godot 4.6.1 integration and clean-room game cloner." },
  { name: "DebugPlay", emoji: "🎮", route: "/gamestudio/debugplay", sourceCryptArtistProgram: "GameStudio", blurb: "Headless game testing, visual bug analysis, and state saves." },
  { name: "Gaming Buddy", emoji: "🐶", route: "/buddy", sourceCryptArtistProgram: "Virtual Pet", blurb: "Voice co-pilot and real-time screen-aware coaching." },
  { name: "Virtual Pet Room", emoji: "🐶", route: "/pet", sourceCryptArtistProgram: "Virtual Pet", blurb: "Interactive 3D Three.js pet room companion." },
  { name: "Luck Factory", emoji: "🍀", route: "/luck", sourceCryptArtistProgram: "Luck Factory", blurb: "Intention meditation and deterministic cryptographic luck seeds." },
  { name: "NewGamePlus", emoji: "✨", route: "/newgameplus", sourceCryptArtistProgram: "Clone Tool", blurb: "Prompt-to-game remix engine verified by VibeCodeWorker." },
  { name: "Submit Game", emoji: "🚀", route: "/submit", sourceCryptArtistProgram: "Clone Tool", blurb: "Publish .zip game releases and keep 75% credits." },
  { name: "Leaderboards", emoji: "🏆", route: "/leaderboards", sourceCryptArtistProgram: "Master Dashboard", blurb: "Top daily and all-time scores across every game." },
  { name: "Game Lobbies", emoji: "🎪", route: "/lobbies", sourceCryptArtistProgram: "GameStudio", blurb: "Live multiplayer waiting rooms across the arcade." },
  { name: "Xonotic Arena", emoji: "🔫", route: "/xonotic", sourceCryptArtistProgram: "GameStudio", blurb: "Robot-played GPU arena shooter with desktop streaming." },
  { name: "Spaceships", emoji: "🛸", route: "/game/spaceships", sourceCryptArtistProgram: "GameStudio", blurb: "Collectible spaceship hangar and physics experiments." },

  // Cloud & Compute
  { name: "AI Agents", emoji: "👱🏻‍♀️", route: "/agents", sourceCryptArtistProgram: "ValleyNet", blurb: "Hire-a-brain: rent hourly AI helpers on GPU iron." },
  { name: "Agent Swarm", emoji: "🐝", route: "/swarm", sourceCryptArtistProgram: "ValleyNet", blurb: "1-5 agent coordinated chatbot with auto tool use." },
  { name: "Virtual Desktop", emoji: "💻", route: "/desktop", sourceCryptArtistProgram: "Donate Computer", blurb: "Real cloud computer in your browser, metered per second." },
  { name: "My RunPods", emoji: "⚡", route: "/runpods", sourceCryptArtistProgram: "CryptArt Commander", blurb: "Dedicated RTX 4090 GPU pods and remote servers." },
  { name: "DonatePersonalSeconds", emoji: "⏱️", route: "/compute/p2p", sourceCryptArtistProgram: "DonatePersonalSeconds", blurb: "P2P WebGPU compute resource sharing network." },
  { name: "Timer & Work Diary", emoji: "⏱️", route: "/timer", sourceCryptArtistProgram: "DonatePersonalSeconds", blurb: "Second-by-second focus clock with Ghost Cash books." },
  { name: "CryptArt Commander", emoji: "⚡", route: "/commander", sourceCryptArtistProgram: "CryptArt Commander", blurb: "Quake-style dropdown CLI terminal and scripting engine." },

  // Business & Productivity
  { name: "UnitUnite Squads", emoji: "🛡️", route: "/squads", sourceCryptArtistProgram: "Master Dashboard", blurb: "Work teams with shared wallet, roles, and Kanban boards." },
  { name: "Business Hub", emoji: "💼", route: "/business", sourceCryptArtistProgram: "Master Dashboard", blurb: "Squads, invoices, CRM, pipelines, and the vault." },
  { name: "Business CRM", emoji: "👥", route: "/business/crm", sourceCryptArtistProgram: "Master Dashboard", blurb: "Contacts, pipelines, and follow-ups for selling teams." },
  { name: "Invoices", emoji: "🧾", route: "/business/invoices", sourceCryptArtistProgram: "Tax Info Bot", blurb: "Itemized billing with 30-day trash and PDF export." },
  { name: "Tax Info Bot", emoji: "🤖", route: "/business/tax", sourceCryptArtistProgram: "Tax Info Bot", blurb: "Creator tax calculator, receipt parser, and expense bot." },
  { name: "Weird Vault", emoji: "🗄️", route: "/vault", sourceCryptArtistProgram: "Clone Tool", blurb: "Scoped private file storage for individuals and teams." },
  { name: "Free Utilities", emoji: "🛠️", route: "/tools", sourceCryptArtistProgram: "CryptArt Commander", blurb: "Free SEO, image, writing, and word counting tools." },

  // Community & Clans
  { name: "Clans", emoji: "🏰", route: "/clans", sourceCryptArtistProgram: "Suite Launcher", blurb: "Cozy clubhouses to chat, compete, and share games." },
  { name: "Bots Hub", emoji: "🤖", route: "/bot/setup", sourceCryptArtistProgram: "Tax Info Bot", blurb: "Issue bot keys and connect external autonomous agents." },
  { name: "Bot Clans", emoji: "🤖", route: "/bot/bclans", sourceCryptArtistProgram: "Tax Info Bot", blurb: "Bot-hosted 24/7 gaming and chatter clubs." },
  { name: "Support", emoji: "💛", route: "/support", sourceCryptArtistProgram: "Master Dashboard", blurb: "Tip creators and back verified developers." },
  { name: "Fundraisers", emoji: "🎁", route: "/fundraisers", sourceCryptArtistProgram: "Master Dashboard", blurb: "Gift-backed launches for community games." },

  // Platform & Account
  { name: "Account Dashboard", emoji: "👑", route: "/account", sourceCryptArtistProgram: "Master Dashboard", blurb: "Mission control: wallet, daily coin claims, and profile." },
  { name: "Pricing & Coins", emoji: "🪙", route: "/pricing", sourceCryptArtistProgram: "Master Dashboard", blurb: "100 Vibe Coins = exactly $1.00, 25% cut included." },
  { name: "Usage Ledger", emoji: "📊", route: "/my/usage/", sourceCryptArtistProgram: "Master Dashboard", blurb: "Itemized receipts for every coin and GPU minute." },
  { name: "Favorites", emoji: "⭐", route: "/favorites", sourceCryptArtistProgram: "Suite Launcher", blurb: "Your starred pages, pinned on this device." },
  { name: "Our Technology", emoji: "⚙️", route: "/tech", sourceCryptArtistProgram: "Settings", blurb: "How the stack works: Next.js, Supabase, and RunPod." },
  { name: "Docs Hub", emoji: "📖", route: "/docs", sourceCryptArtistProgram: "Suite Launcher", blurb: "Plain-English guides explaining the entire platform." },
  { name: "Academy", emoji: "🎓", route: "/academy", sourceCryptArtistProgram: "GameStudio", blurb: "Bite-sized interactive lessons through play." },
  { name: "Accessibility", emoji: "♿", route: "/accessibility", sourceCryptArtistProgram: "Settings", blurb: "High contrast, big text, and assistive controls." },
  { name: "Family Login", emoji: "👨‍👩‍👧‍👦", route: "/family/login", sourceCryptArtistProgram: "Master Dashboard", blurb: "Child login using friendly name#1234 handles." },
];

/**
 * Universal lookup to get the official CryptArtist emoji logo for any program or route.
 */
export function getProgramEmoji(nameOrRoute: string): string {
  const norm = nameOrRoute.trim().toLowerCase().replace(/^\//, "").replace(/\/$/, "");
  
  // Exact match on 4weird programmatic things
  for (const item of FOURWEIRD_PROGRAMMATIC_THINGS) {
    const itemNorm = item.route.toLowerCase().replace(/^\//, "").replace(/\/$/, "");
    if (item.name.toLowerCase() === norm || itemNorm === norm) {
      return item.emoji;
    }
  }

  // Check CryptArtist programs
  for (const prog of Object.values(CRYPTARTIST_HUB_PROGRAMS)) {
    if (
      prog.id === norm ||
      prog.shortCode.toLowerCase() === norm ||
      prog.name.toLowerCase() === norm
    ) {
      return prog.emoji;
    }
  }

  // Keyword heuristic match
  if (norm.includes("vibecode") || norm.includes("vcw")) return "👩🏻‍💻";
  if (norm.includes("video") || norm.includes("mogul")) return "📺";
  if (norm.includes("record") || norm.includes("blender")) return "🎥";
  if (norm.includes("paint") || norm.includes("dictate") || norm.includes("fal")) return "🎨";
  if (norm.includes("game") || norm.includes("arcade") || norm.includes("play")) return "🎮";
  if (norm.includes("pet") || norm.includes("buddy")) return "🐶";
  if (norm.includes("commander") || norm.includes("runpod") || norm.includes("gpu")) return "⚡";
  if (norm.includes("timer") || norm.includes("dps") || norm.includes("clock")) return "⏱️";
  if (norm.includes("desktop") || norm.includes("computer")) return "💻";
  if (norm.includes("clone") || norm.includes("remix") || norm.includes("builder")) return "🧬";
  if (norm.includes("luck") || norm.includes("seed")) return "🍀";
  if (norm.includes("agent") || norm.includes("valley") || norm.includes("swarm")) return "👱🏻‍♀️";
  if (norm.includes("tax") || norm.includes("bot")) return "🤖";
  if (norm.includes("invoice")) return "🧾";
  if (norm.includes("speech") || norm.includes("voice") || norm.includes("audio")) return "🗣️";
  if (norm.includes("account") || norm.includes("dashboard") || norm.includes("master")) return "👑";
  if (norm.includes("tech") || norm.includes("setting")) return "⚙️";
  if (norm.includes("squad") || norm.includes("unite")) return "🛡️";
  if (norm.includes("vault")) return "🗄️";
  if (norm.includes("clan")) return "🏰";
  if (norm.includes("coin") || norm.includes("price")) return "🪙";

  return "✨";
}

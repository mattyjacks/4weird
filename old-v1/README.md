# 4weird Games 🎮

**The open HTML5 game platform where weird ideas become playable reality.**

Started 6/6/26 | A [MattyJacks.com](https://mattyjacks.com) Company

---

## 🚀 CONTRIBUTE YOUR GAME - GET FEATURED TODAY

**Have a weird game idea? We want it.** 4weird is an **open, contributor-first platform**. Every accepted game gets:

- ✅ **Permanent featuring** on 4weird.games
- ✅ **Dedicated game page** with credits & your bio
- ✅ **Social promotion** across our channels
- ✅ **GitHub contributor credit** in the repo
- ✅ **Backlink to your portfolio** from a live site

### It takes 4 steps to go from idea to live:

```bash
# 1. Fork & clone
gh repo fork mattyjacks/4weird --clone

# 2. Copy the template
cp -r website/v1/games/html/_TEMPLATE website/v1/games/html/yourgame

# 3. Build your game (index.html + game.js + game.css)
# Edit game.json with your credits and bio

# 4. PR and ship
git add . && git commit -m "Add: Your Game Name" && git push
# Open PR -> We review fast -> You're live!
```

### 🎯 The Template Does The Heavy Lifting

Our **`_TEMPLATE/`** folder gives you everything:
- Pre-built game page structure
- Shared nav/footer (automatic)
- Credits section (populated from `game.json`)
- Maker bio section (your story, your links)
- Mobile-ready responsive layout
- "More Games" cross-promotion

**Max 10MB per game.** Big assets? Host externally and link. No build tools needed.

### [👉 CLICK HERE TO FORK AND START BUILDING](https://github.com/mattyjacks/4weird/fork)

Full details, conventions, and code standards in **[CONTRIBUTING.md](CONTRIBUTING.md)**.

---

## 🎮 Play Games

Visit [4weird.games](https://4weird.games) or open `website/v1/index.html` locally.

Current lineup:
- **Demo Lichdom** - Command skeletons to demolish buildings
- **Server Saver Shield** - Cyber defense arcade shooter
- **Fridge Simulator** - Global food logistics management
- **Madi AI: Discover America** - Sort data to chart a voyage
- **Template Demo** - See how the template works

---

---

---

## 🤖 4WEIRD VIBECODEWORKER: Autonomous Agentic Web & Game QA Platform

**[4weird VibeCodeWorker](website/v1/ai/vibecodeworker)** (`vibecodeworker-4weird`) is an enterprise-grade autonomous playtesting, QA auditing, and self-healing runtime created by **Matt Jackson ([mattyjacks.com](https://mattyjacks.com))**. It turns visual models into active playtesters and web QA engineers that navigate sites, audit UI/UX, sniff backend errors, and auto-fix code.

### 🌟 Key Superpowers:
1. **🌐 Test Any Website or SaaS Application**:
   - Point VibeCodeWorker at any URL (SaaS, eCommerce, internal tools, landing pages).
   - **UI/UX Heuristic Audits**: Visual hierarchy, responsiveness, accessibility, dead-end discovery.
   - **Backend & Network Error Sniffer**: Detects failed REST/GraphQL payloads, 4xx/5xx drops, and JS exceptions.
   - **Synthetic Form & Flow Automation**: Types into inputs, clicks buttons, scrolls pages, and validates form funnels.
2. **🛡️ Human-in-the-Loop (HITL) CAPTCHA Resolution**:
   - When encountering Cloudflare Turnstile, Google reCAPTCHA, or hCaptcha, VibeCodeWorker immediately pauses execution, alerts the user to solve the barrier in the viewport, and **seamlessly resumes autonomous QA the instant it is solved**.
3. **⚡ Ultralight WebKit Engine & Native Game Scanning**:
   - Integrated lightweight WebKit GPU runtime (`ultralight-sdk`) for fast headless telemetry.
   - Process scanner hooks directly into native games (Roblox, Godot, Unity, Unreal).
4. **☁️ 4weird Cloud Fleet Compute Orchestration (AWS EC2 Style)**:
   - **Democratized QA on Budget Hardware**: Developers on \$50 Android phones, chromebooks, or low-spec laptops can rent ephemeral cloud compute instances (*Micro*, *Standard*, *Ultra GPU*).
   - Remote machines handle heavy headless WebKit instances and WebGL rendering while streaming the interactive viewport back to client devices with near-zero latency.

---

### 💼 Business Model & Monetization: The Triple-Engine Architecture

4weird VibeCodeWorker is built around a sustainable, developer-friendly economic model:

1. **🔑 Bring Your Own Key (BYOK)**:
   - Connect OpenAI, Anthropic, Google Gemini, or OpenRouter API keys directly. Complete privacy, zero markup on your direct provider accounts.
2. **🔄 Managed 4weird AI Proxy (LiteLLM / OpenRouter Gateway)**:
   - Users subscribe to the unified 4weird API Gateway. We orchestrate model failover, rate limits, caching, and model auto-routing with a transparent **10% premium** on underlying model tokens.
3. **🖥️ Ephemeral Cloud Compute Rental**:
   - Rent orchestrated compute fleets by the second or hour (AWS EC2 style):
     - **Micro Node** (1 vCPU, 2GB RAM): \$0.046 / hr
     - **Standard Node** (4 vCPU, 8GB RAM, WebGL Accel): \$0.184 / hr
     - **Ultra GPU Node** (8 vCPU, 16GB RAM, RTX GPU): \$0.747 / hr
   - All compute instances include a transparent **15% orchestration margin** covering autoscaling, WebRTC low-latency streaming, and fleet health checks.

### 🚀 How to Run VibeCodeWorker
```bash
# Navigate to the vibecodeworker directory
cd website/v1/ai/vibecodeworker

# Install dependencies & run tests
npm install
npm test

# Start the desktop application
npm start

# Or build native desktop Windows executable via Tauri
npm run tauri:build
```

Executable output: **`vibecodeworker-4weird.exe`**

Visit **[mattyjacks.com](https://mattyjacks.com)** to learn more about the creator and enterprise partnership opportunities.

---

## 🛠️ Tech Stack

| Requirement | Specification |
|-------------|---------------|
| **Engine** | Pure HTML5 Canvas + vanilla JS |
| **Styling** | CSS variables from `styles.css` |
| **Template** | `_TEMPLATE/` folder with namespaced classes (`TEMPLATE-4weird-*`) |
| **Size Limit** | 10MB max (external assets for large files) |
| **Build Step** | None. Zero. Just open in browser. |

---

## 📋 Quick Reference for Contributors

```
website/v1/games/html/yourgame/
├── index.html          # Uses TEMPLATE-4weird-* classes
├── game.js             # Your game logic
├── game.css            # Your styles (optional)
└── game.json           # Credits, bio, controls info
```

**Naming convention:** All template classes are prefixed with `TEMPLATE-4weird-` to avoid CSS conflicts with your game-specific styles.

---

## 🤝 Why Contribute?

- **Visibility:** Your game on a curated platform
- **Portfolio:** Live demo + source code + credits
- **Community:** Join other weird game makers
- **Simple:** Copy template, build game, PR, done

**Weird is welcome. Polished is appreciated. Both together? That's 4weird.**

---

## 🤖 VibeCodeWorker AI Engine & API Keys

The **4weird VibeCodeWorker** (`website/v1/ai/vibecodeworker`) is an autonomous QA playtesting sandbox, auto-code debugger, and self-improving agent suite.

### 🔑 API Key Requirements: Only 1 Minimum Key Needed!
> **IMPORTANT:** You **DO NOT** need keys for every model. VibeCodeWorker only requires **A MINIMUM OF 1 API KEY** of your choice to be fully functional (or use a free local Ollama endpoint without any API key at all).

Supported AI engines & keys:
1. **DeepSeek (`DEEPSEEK_API_KEY`)**:
   - Native **DeepSeek Harness (`dsh`)** self-improvement loops.
   - Models: `deepseek-chat` (V3), `deepseek-reasoner` (R1), `deepseek-v4-flash`, `deepseek-v4-pro`, `deepseek-v4-flash-vision-exp`.
   - Sign up: [DeepSeek Platform](https://platform.deepseek.com)
2. **Meta Muse Spark (`META_API_KEY` or `OPENROUTER_API_KEY`)**:
   - Model: `meta/muse-spark-1.3-contributor` — ultra-low cost ($0.10/1M in, $0.20/1M out) multimodal reasoning with a massive 1,048,576 token context.
3. **OpenAI (`OPENAI_API_KEY`)**:
   - Flagship default models: `gpt-5.6-luna`, `gpt-5.4-mini`, `gpt-4o-mini`, `gpt-4o`.
   - Sign up: [OpenAI Platform](https://platform.openai.com)
4. **Google Gemini (`GEMINI_API_KEY`)**:
   - Models: `gemini-2.5-flash`, `gemini-2.5-pro`.
5. **Local Models (Free / No Key)**:
   - Ollama / LM Studio at `http://localhost:11434/api/chat`.
6. **ElevenLabs (`ELEVENLABS_API_KEY`) — optional BYOK voice layer**:
   - Text-to-speech (spoken bug alerts, streamer commentary, NPC/tutorial VO), Scribe speech-to-text (voice-command playtests, dialogue QA), sound-effect generation (auto-covers for 404'd game audio), and music composition.
   - Sign up: [ElevenLabs](https://elevenlabs.io). Game-audio QA (`/api/audio/analyze`) works fully offline with no key: **mono** single-stream by default, **stereo** opt-in reports L/R differences (imbalance, correlation, dropouts, phase).
   - Muse Spark 1.3 hears it too: PCM telemetry + transcripts ride the brain prompt, with native audio parts on supported providers.

### 🛡️ Persistent Build-Consistent Local Key Storage
Any API key you input into VibeCodeWorker is stored locally in your operating system's personal profile directory:
- **Windows**: `%APPDATA%\vibecodeworker\credentials.json`
- **macOS/Linux**: `~/.vibecodeworker/credentials.json`

Keys are **never baked into the `.exe`** and **never overwritten** when new builds, desktop installers, or updates are deployed.

You can also create a `.env` file in the repository root or in `website/v1/ai/vibecodeworker/` based on `.env.example`.

---

## 📚 Documentation & Sub-Project READMEs

Explore specific components, sub-projects, and game architectures across the repository:

- **[VibeCodeWorker Web App Player & Debugger](website/v1/ai/vibecodeworker/README_WEB_APP_FEATURES.md)** (`website/v1/ai/vibecodeworker/README_WEB_APP_FEATURES.md`)  
  Complete documentation index for the Electron-based runtime, static site player, framework auto-detection, and agentic debugging tools.
- **[Overtake Game README](website/v1/games/html/overtake/README.md)** (`website/v1/games/html/overtake/README.md`)  
  Out Run / Horizon Chase style pseudo-3D canvas racer: run instructions, controls, project structure, and external asset hosting details.
- **[Server Saver Shield Modular Architecture](website/v1/games/html/serversavershield/js/README.md)** (`website/v1/games/html/serversavershield/js/README.md`)  
  Architecture and component breakdown for the refactored modular game systems (entities, audio, game loop, collision, UI).
- **[Spaceships Game Clean Architecture](website/v1/spaceships/README.md)** (`website/v1/spaceships/README.md`)  
  Clean architecture overview, system design (starfield, lighting, ships, input), controls, and performance optimizations.
- **Additional Repository Docs:**
  - **[CONTRIBUTING.md](CONTRIBUTING.md)**: Guidelines for adding and submitting new games.
  - **[CODING_STANDARD.md](CODING_STANDARD.md)**: Coding standards, conventions, and practices.
  - **[DEPLOY.md](DEPLOY.md)**: Deployment and release workflows.

---

## 📜 License

This project is open source but not free. A private license applies: we reserve all rights to the games.

---

*Do and/or DIE TRYING!!!*


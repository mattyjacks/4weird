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

**[4weird VibeCodeWorker](ai/v1/vibecodeworker)** (`vibecodeworker-4weird`) is an enterprise-grade autonomous playtesting, QA auditing, and self-healing runtime created by **Matt Jackson ([mattyjacks.com](https://mattyjacks.com))**. It turns visual models into active playtesters and web QA engineers that navigate sites, audit UI/UX, sniff backend errors, and auto-fix code.

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
cd ai/v1/vibecodeworker

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

## 📚 Documentation & Sub-Project READMEs

Explore specific components, sub-projects, and game architectures across the repository:

- **[VibeCodeWorker Web App Player & Debugger](ai/v1/VibeCodeWorker/README_WEB_APP_FEATURES.md)** (`ai/v1/VibeCodeWorker/README_WEB_APP_FEATURES.md`)  
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


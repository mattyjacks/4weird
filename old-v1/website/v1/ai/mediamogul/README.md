# 🎬 MediaMogul - Autonomous AI Video Editor & Shotcut Copilot

> **Part of CryptArtist Studio Suite** | **Module**: `/CryptArtistStudio/v2/MediaMogul/`  
> **License**: GNU General Public License v3.0 (GPL-3.0-or-later)  
> **Based Fully On**: **Shotcut Video Editor** + **Agentic Commander Multi-Agent Swarm**

---

## ⚖️ Legal Status & Commercial Repository Separation

**IMPORTANT LEGAL NOTICE**:
- **MediaMogul is licensed under the GNU General Public License Version 3.0 (GPLv3)** to allow full modification, derivation, and redistribution of Shotcut code and MLT multimedia framework components.
- **Strict Legal Separation**: This GPLv3 license applies **exclusively** to the contents of `/CryptArtistStudio/v2/MediaMogul/`. Under Section 5 of the GPLv3 (Aggregates), MediaMogul is an isolated modular component communicating strictly via arm's-length inter-process protocols (CLI, pipes, JSON-RPC, file exchange).
- **The rest of the CryptArtist Studio repository remains under its private commercial proprietary license**. The GPLv3 copyleft terms do NOT extend, contaminate, or apply to any files, modules, or services outside of `/CryptArtistStudio/v2/MediaMogul/`.
- For complete legal terms and architectural firewall specifications, see [LEGAL_BOUNDARY.md](./LEGAL_BOUNDARY.md) and [LICENSE](./LICENSE).

---

## 🌟 What is MediaMogul?

**MediaMogul** is an autonomous AI video editing copilot and command center based directly on **Shotcut Video Editor** and the **Agentic Commander Swarm**.

It gives video creators, editors, and studios an intelligent co-director that can inspect timelines, orchestrate editing consensus, and execute physical video modifications directly onto Shotcut projects and media files.

### 🎖️ Core Architecture: Shotcut + Agentic Commander

1. **Shotcut Foundation**:
   - Native QML filters and on-screen interactive VUI gizmos.
   - Deep `.mlt` timeline XML project parsing, editing, track creation (e.g. dedicated V2 overlay tracks), and live preview capture.
   - Direct Shotcut remote control (play/pause, clip splitting `S`, ripple delete `X`, frame stepping, undo).
   - Live timeline change auto-watcher that proactively detects external edits made in Shotcut.

2. **Agentic Commander Swarm**:
   - **ScriptAgent**: Analyzes narrative hooks, retention pacing, and viral dialogue structure.
   - **TimelineAgent**: Evaluates scene transitions, pacing cuts, and dedicated overlay tracks.
   - **StylistAgent**: Curates color LUTs, lower-thirds, 9:16 vertical conversions, and elements.
   - **AudioAgent**: Masters loudness normalization (-14 LUFS), audio ducking, and voiceovers.
   - **ReviewerAgent**: Quality-controls sync, black frame detection, and file integrity.
   - **Supreme Commander**: Synthesizes expert sub-agent reports into an executive production plan.

3. **Google Antigravity-Style Prepared Plans**:
   - Generates structured implementation plans before applying destructive video edits.
   - Dual execution modes:
     - **Request to Proceed**: Prompts the user with interactive `[ 🚀 Proceed / Execute Plan ]` and `[ ❌ Decline ]` buttons.
     - **Auto-Proceed**: Runs prepared plans autonomously based on user settings.

4. **3-Tier AI Fingerprint Detection & Policy**:
   - **🟢 Fingerprint-Free**: 0 frames or audio of AI used. Authentic camera/human footage with deterministic edits (roughcuts, ducking, normalization, filters) for optimal social media algorithmic reach without AI labels.
   - **🟡 Fingerprint-Parts**: 1+ frames of AI assets used (<50% duration).
   - **🟣 Fingerprint-Full**: Majority of video is AI-generated (>=50%).
   - Option in Settings to disable all AI fingerprinting features (blocks DALL-E and TTS).

5. **Accurate Cost Calculator & Gateway Preparation**:
   - Tracks real-time spend across **Daily Budget** and **Lifetime Budget**.
   - Accurate unit pricing:
     - GPT-5.6 Luna / GPT-4o: $2.50 in / $10.00 out per 1M tokens
     - GPT-4o-mini: $0.15 in / $0.60 out per 1M tokens
     - Whisper STT: $0.006 per minute ($0.0001 per second)
     - OpenAI TTS: $0.015 per 1k characters
     - DALL-E 3: $0.040 standard / $0.080 HD
     - Local FFmpeg / Shotcut: $0.00 (100% Free)
   - Custom API Key Gateway preparation for future enterprise billing and routing.

---

### 0. Contained Shotcut Engine
MediaMogul directly contains Shotcut inside `/v2/MediaMogul/shotcut/`:
- Bundles/links `shotcut.exe`, `melt.exe`, and full MLT multimedia libraries directly inside the module.
- Run `python setup_contained_shotcut.py` to verify or establish the contained junction.
- All binary lookups prioritize the contained Shotcut engine before checking system paths.

### 1. Autonomous Video Producer (100% Fingerprint-Free)
- Multi-clip automatic narrative assembly (`tool_auto_produce_video`):
  - Ingests raw video takes and voiceover recordings (e.g. from `C:\Users\ventu\Videos\drive-download-20260906T004623Z-1-001`).
  - Sorts voiceovers chronologically and syncs video camera takes across narration.
  - Masters audio loudness to broadcast standard (-14 LUFS).
  - Generates valid `.mlt` timeline projects with producers, tracks, and mix transitions.
  - Headlessly renders export-ready MP4s using Shotcut's MLT Melt engine (`melt.exe`).
  - Scrubs all AI metadata, C2PA claims, and generator tags to ensure **🟢 Fingerprint-Free** algorithmic reach.

---

## 🚀 Quick Start

### 1. Launch MediaMogul Command Center
```cmd
run_mediamogul_command_center.bat
```
*(Or launch `python companion/mediamogul_agent_center.py`)*

### 2. Auto-Produce Videos with Shotcut
In the Command Center's **Auto-Director** tab:
1. Click **🧪 Test Video Set** (or browse to any footage folder).
2. Click **[ 🚀 Auto-Produce Video with Shotcut (Fingerprint-Free) ]**.
3. MediaMogul automatically creates the timeline, renders the finished MP4 via Shotcut's MLT engine, and pulls up the project in Shotcut!

### 3. Install Shotcut Filter
```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

---

## 📁 Directory Structure

```
/CryptArtistStudio/v2/MediaMogul/
├── companion/                 # Agentic Commander, Core Engines & Studio Tabs
│   ├── core/                  # Engine logic (agent_engine, commander, cost_calc, fingerprint, plan)
│   ├── tools/                 # 50+ video editing tools (audio, video, fx, mlt, subtitles, vision)
│   ├── ui/                    # Tkinter UI tabs and Onboarding dialog
│   └── mediamogul_agent_center.py  # Main Command Center application controller
├── filters/                   # Shotcut QML filter plugins
│   └── mediamogul/           # QML metadata, UI, and on-screen interactive VUI gizmo
├── tests/                     # Unit test suites (budget, fingerprint, prepared plan)
├── LICENSE                    # GNU General Public License v3.0
├── LEGAL_BOUNDARY.md          # Formal legal separation and dual-licensing architecture
└── README.md                  # This documentation
```

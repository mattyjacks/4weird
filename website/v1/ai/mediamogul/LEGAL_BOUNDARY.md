# ⚖️ MediaMogul Legal Boundary & Dual-Licensing Architecture

**Project**: MediaMogul (formerly MediaMogul)  
**Parent Suite**: CryptArtist Studio  
**Directory Scope**: `/CryptArtistStudio/v2/MediaMogul/`  
**License for MediaMogul**: GNU General Public License v3.0 (GPL-3.0-or-later)  
**License for Sibling / Parent Repo**: Private Commercial Proprietary License (CryptArtist Studio / MattyJacks)  

---

## 1. Executive Summary

This document establishes the **formal legal separation** between:
1. **MediaMogul** (`/CryptArtistStudio/v2/MediaMogul/`): An open-source, GPLv3-licensed video editing and AI copilot engine based directly on **Shotcut Video Editor** and the **Agentic Commander Swarm**.
2. **CryptArtist Studio (The Rest of the Repository)**: A proprietary commercial creative suite governed by a private commercial license.

```
+------------------------------------------------------------------------------------+
|                       CryptArtist Studio (Root Repository)                        |
|                     [ PRIVATE COMMERCIAL PROPRIETARY LICENSE ]                     |
|                                                                                    |
|  - Tauri v2 Rust Backend & Core Architecture                                      |
|  - CryptArtist Web & Desktop UI (React 18 / Vite / Tailwind)                       |
|  - VibeCodeWorker (VCW) IDE                                                       |
|  - ValleyNet Autonomous AI Agent Engine                                            |
|  - GameStudio (Godot Engine Pipeline)                                             |
|  - Proprietary Services, Monetization & API Gateways                              |
|                                                                                    |
|   ========================= [ LEGAL FIREWALL ] =========================           |
|   Communication via Arm's-Length IPC (CLI, Process Pipes, JSON-RPC, REST, Files)  |
|   ======================================================================           |
|                                                                                    |
|  +------------------------------------------------------------------------------+  |
|  |                /CryptArtistStudio/v2/MediaMogul/                            |  |
|  |                 [ GNU GENERAL PUBLIC LICENSE v3.0 ]                          |  |
|  |                                                                              |  |
|  |  - Shotcut Video Editor Integration & Code Modifications                      |  |
|  |  - Shotcut QML Filters & VUI Gizmo (`filters/mediamogul`)                   |  |
|  |  - MLT Multimedia Framework Timeline Generators & Transcoders               |  |
|  |  - Agentic Commander Multi-Agent Swarm (Script, Timeline, Stylist, Audio)   |  |
|  |  - 50+ Deterministic Video Tools & FFmpeg Automation Engine                 |  |
|  |  - 3-Tier Fingerprint Tracker & Cost / Budget Calculator                     |  |
|  +------------------------------------------------------------------------------+  |
+------------------------------------------------------------------------------------+
```

---

## 2. MediaMogul Licensing (GPLv3 Compliance)

### 2.1 Shotcut Derivation
Shotcut is an open-source video editor created by Meltytech, LLC, licensed under the **GNU General Public License Version 3 (GPLv3)**. Because MediaMogul:
- Incorporates, adapts, and builds upon Shotcut's QML UI filters, MLT project XML architecture, and video timeline pipeline;
- Directly executes and interfaces with Shotcut binaries (`shotcut.exe`, `melt.exe`, and MLT framework modules);
- Modifies and extends Shotcut filter specifications (`meta.qml`, `ui.qml`, `vui.qml`);

**MediaMogul is licensed in full compliance with the GNU General Public License v3.0 (GPLv3)**. All source code within `/CryptArtistStudio/v2/MediaMogul/` is subject to the freedoms and obligations of GPLv3.

### 2.2 Right to Modify Shotcut Code
Under the GPLv3 license:
- Any developer or user has the legal right to modify, adapt, rebrand, and distribute Shotcut code and MediaMogul modifications.
- Modified versions must carry prominent notices documenting changes and must remain licensed under GPLv3.

---

## 3. Strict Legal Separation from the Rest of the Repository

### 3.1 Non-Contamination under Section 5 (Aggregates)
Section 5 of the GNU General Public License explicitly states:

> *"A compilation of a covered work with other separate and independent works, which are not by their nature extensions of the covered work, and which are not combined with it such as to form a larger program, in or on a volume of a storage or distribution medium, is called an 'aggregate' if the compilation and its resulting copyright are not used to limit the access or legal rights of the compilation's users beyond what the individual works permit. Inclusion of a covered work in an aggregate does not cause this License to apply to the other parts of the aggregate."*

### 3.2 Arm's-Length Inter-Process Communication (IPC)
MediaMogul is intentionally architected as a **separate, decoupled executable program** (`mediamogul_command_center.exe` / `mediamogul_agent_center.py`):
1. **No Proprietary Linking**: MediaMogul does **not** statically or dynamically link to any proprietary CryptArtistStudio libraries (`.dll`, `.so`, or compiled Rust crates).
2. **Standard Inter-Process Interfaces**: Communication between MediaMogul and the host CryptArtistStudio suite occurs strictly through arm's-length boundaries:
   - Operating system process execution (`subprocess`, `std::process::Command`);
   - Command-line arguments (`--mlt <path>`, `--action <name>`);
   - Standard input/output streams (stdin/stdout JSON messages);
   - Local filesystem project manifests (`.mlt`, `.edl`, `.CryptArt`, `.json`);
   - HTTP/REST local loopback APIs (`127.0.0.1`).
3. **No Sublicensing of the Host Suite**: Distributing, building, or compiling MediaMogul does **not** convey, license, open-source, or encumber any code, patents, or assets of the private commercial parts of CryptArtistStudio.

---

## 4. Scope and Directory Mapping

| Directory / Component | Applicable License | Terms |
| :--- | :--- | :--- |
| `/CryptArtistStudio/v2/MediaMogul/*` | **GNU General Public License v3.0 (GPLv3)** | Open source, copyleft, allows Shotcut modifications. |
| `/CryptArtistStudio/v2/src/*` | **Private Commercial License** | Proprietary to CryptArtist Studio / MattyJacks. |
| `/CryptArtistStudio/v2/api/*` | **Private Commercial License** | Proprietary backend and API gateway services. |
| `/CryptArtistStudio/v1/*` | **Private Commercial License** | Proprietary v1 suite code. |
| `/CryptArtistStudio/website/*` | **Private Commercial License** | Proprietary marketing, portal, and web assets. |
| All other root files and repositories | **Private Commercial License** | Proprietary, all rights reserved. |

---

## 5. Third-Party Notices & Acknowledgments

- **Shotcut**: Copyright (C) 2011-2026 Meltytech, LLC. Licensed under GNU GPLv3.
- **MLT Multimedia Framework**: Copyright (C) 2002-2026 Ushodaya Enterprises Limited. Licensed under GNU GPLv2.1 / GPLv3.
- **FFmpeg**: Licensed under LGPLv2.1+ / GPLv2+. MediaMogul interfaces with FFmpeg via standard CLI execution.
- **OpenAI API**: Third-party proprietary cloud AI service accessed via standard HTTPS REST calls.

---

## 6. Summary for Downstream Users and Contributors

- When working inside `/CryptArtistStudio/v2/MediaMogul/`, you are developing under the **GPLv3**. Your modifications to Shotcut integrations, filters, and the Agentic Commander are open-source and copyleft.
- When working anywhere else in `CryptArtistStudio`, you are developing under the **Private Commercial License**.
- This separation is legally binding and protects the commercial independence of CryptArtist Studio while fully honoring and adhering to Shotcut's open-source copyleft obligations.

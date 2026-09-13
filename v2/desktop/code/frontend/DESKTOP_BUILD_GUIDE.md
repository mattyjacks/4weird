# 🖥️ 4WEIRD VIBECODEWORKER // Antigravity 2.0 Desktop Application Build Guide

Full compilation, development, and packaging documentation for **4WEIRD VIBECODEWORKER** built with **Tauri v2** for Windows, macOS, and Linux (Ubuntu / Debian).

---

## 🚀 Overview

4WEIRD VIBECODEWORKER can run as both a browser application and a cross-platform native desktop application powered by **Tauri v2** and **Rust**. The desktop runtime provides:
- ⚡ **Direct GPU Hardware Acceleration** & low-latency canvas rendering.
- 🔔 **Native OS Desktop Notifications** when bugs or defects are detected.
- 💾 **Native File System Dialog Integration** for report exports (`.json` and `.csv`).
- 🖥️ **Desktop Runtime Status Badge** visible in the application status bar.

---

## 📋 System Prerequisites

Before building the desktop application, ensure you have Installed Node.js (v18+) and Rust on your host OS.

### 1. 🪟 Windows (PC) Prerequisites
1. **Node.js**: Install Node.js v18 or higher from [nodejs.org](https://nodejs.org/).
2. **Rust Toolchain**: Install `rustup` from [rustup.rs](https://rustup.rs/). Ensure `x86_64-pc-windows-msvc` target is installed:
   ```bash
   rustup target add x86_64-pc-windows-msvc
   ```
3. **C++ Build Tools**: Install Visual Studio Build Tools (with C++ workload) or Visual Studio 2022.
4. **WebView2**: Pre-installed on Windows 10 & 11.

---

### 2. 🍎 macOS (Apple Silicon & Intel) Prerequisites
1. **Node.js**: Install via Homebrew (`brew install node`) or [nodejs.org](https://nodejs.org/).
2. **Xcode Command Line Tools**:
   ```bash
   xcode-select --install
   ```
3. **Rust Toolchain**: Install `rustup` from [rustup.rs](https://rustup.rs/):
   ```bash
   rustup target add universal-apple-darwin
   ```

---

### 3. 🐧 Linux (Ubuntu / Debian) Prerequisites
1. **Node.js**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
2. **Rust Toolchain**:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   rustup target add x86_64-unknown-linux-gnu
   ```
3. **System Dependencies**:
   ```bash
   sudo apt update
   sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libayatana-appindicator3-dev librsvg2-dev
   ```

---

## 🛠️ Installation & Setup

1. **Navigate to the Tauri app project directory**:
   ```bash
    cd v2/desktop/code
   ```

2. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

---

## 💻 Launching Development Mode

To run 4WEIRD VIBECODEWORKER desktop app with live reload:

```bash
npm run tauri:dev
```

This compiles the Rust backend (`src-tauri`) and connects it to the 4WEIRD VIBECODEWORKER frontend UI.

---

## 📦 Building Standalone Executables & Packages

### 1. Build for Current OS Target
```bash
npm run tauri:build
```

### 2. Build for Windows (.msi / .exe)
```bash
npm run tauri:build:win
```
Outputs binaries to: `src-tauri/target/release/bundle/msi/` and `src-tauri/target/release/bundle/nsis/`.
Binary output: `src-tauri/target/release/vibecodeworker-4weird.exe`.

### 3. Build for macOS (.dmg / .app)
```bash
npm run tauri:build:mac
```
Outputs binaries to: `src-tauri/target/release/bundle/dmg/` and `src-tauri/target/release/bundle/macos/`.

### 4. Build for Linux (.AppImage / .deb)
```bash
npm run tauri:build:linux
```
Outputs binaries to: `src-tauri/target/release/bundle/appimage/` and `src-tauri/target/release/bundle/deb/`.

---

## 🔌 Native IPC API Architecture

4WEIRD VIBECODEWORKER defines custom Rust IPC handlers in `src-tauri/src/lib.rs`:

| Command Name | Input Arguments | Description |
| :--- | :--- | :--- |
| `get_gpu_info` | None | Returns native GPU hardware acceleration stats & VRAM allocation |
| `save_report_file` | `filename: String`, `content: String` | Saves report files directly to the host filesystem |
| `show_native_notification` | `title: String`, `body: String` | Dispatches OS-level system desktop notification |

Frontend integration is automatically handled in `website/v1/vibecodeworker/app.js` via runtime feature detection of `window.__TAURI__`.

---

## 🔍 Verification & Testing Checklist

- [x] Status bar displays `🖥️ DESKTOP TAURI RUNTIME` badge when app runs natively inside Tauri.
- [x] Clicking Export JSON/CSV in Desktop mode saves natively and notifies user.
- [x] Triggering defects automatically dispatches native OS desktop notifications.
- [x] Custom IPC command `get_gpu_info` retrieves hardware telemetry.

---

## 🪟 Windows .exe: paste key + run opencode inside

1. **Install the .exe** — build with `npm run tauri:build:win` (in `v2/desktop/code`), then run the installer from `src-tauri/target/release/bundle/nsis/` (`.exe`; `.msi` beside it).
2. **Open BOT TOKEN** — in the app header click **BOT TOKEN**, paste a `bot4weird_…` key (human issues it once at `4weird.com/bot/setup`, auto-hides after 60s), press **SAVE**.
3. **Press VERIFY** — live read-only check: `GET /api/bot/me` with the `x-bot-key` header; the drawer shows the linked `@username` / `human_id` / scopes. Rejected key → re-copy (no spaces) or revoke + reissue at `/bot/setup`.
4. **Enable OpenCode** — tick **Enable**, pick `cli` (`opencode` binary on PATH) or `server` (`opencode serve --port 4096` running); status dot goes 🟢 when ready.
5. **Export / Fix / Heal** — **Export** writes `BUGFIX-<game>-<stamp>.{md,json}` (paste via `opencode run -f file` or press **Fix** so OpenCode edits code itself and shows the git diff); **Heal** loops test → fix → re-test until clean or the iteration budget is spent.
6. **🔒 Leak rule: never print the full key** — UI shows a masked preview (`bot4weird_…` prefix) only; the desktop build stores it in a local-only OS app-data file, never logged, never committed. If a key may be exposed, revoke instantly at `/bot/setup` and reissue.

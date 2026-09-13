// DS-REMASTER-W2-DESKTOP — Remastery Wave-2 desktop parity board data.
// NEW file only. No secrets. No Tauri/Rust surface.
// Source of Wave-2 scope: v2/vcw4w/public/swarm/remastery/README.md §7
// (WAVE 2: AI Infrastructure, MCP, Chat Bot, & P2P Compute — @4weird/mcp
// package, Chat Bot, DebugPlay, DPS WebGPU Worker) mapped onto the
// envelope's five route groups (DPS console, skills API, MCP/chat-bot
// packages, DPS pricing API, Wave-2 docs) plus DebugPlay rows.
// Parity model: native-first + authenticated iframe/webview fallback
// (per envelope goal; mirrors the Wave-1 board in ../remastery/parity.ts,
// which is owned by rem-desktop and is pattern reference only).

export type DesktopPosture =
  | "native"
  | "authenticated-webview-fallback";

export interface ParityRoute {
  group:
    | "dps console"
    | "skills API"
    | "mcp/chat-bot packages"
    | "dps pricing API"
    | "debug-play"
    | "wave-2 docs";
  label: string;
  webRoute: string;
  posture: DesktopPosture;
  offline: string;
}

export const PARITY_MODEL =
  "native-first + authenticated iframe fallback" as const;

export const WAVE2_PARITY_ROUTES: ParityRoute[] = [
  {
    group: "dps console",
    label: "DPS donor dashboard",
    webRoute: "/compute/dps",
    posture: "authenticated-webview-fallback",
    offline:
      "Donor share controls are disabled offline; last-known hardware readout renders read-only and share changes queue until reconnect.",
  },
  {
    group: "dps pricing API",
    label: "DPS compute pricing",
    webRoute: "/api/cloud/services",
    posture: "authenticated-webview-fallback",
    offline:
      "Last-synced price snapshot is display-only; no new quotes or provisioning estimates offline.",
  },
  {
    group: "mcp/chat-bot packages",
    label: "@4weird/mcp package",
    webRoute: "(@4weird/mcp npm package)",
    posture: "authenticated-webview-fallback",
    offline:
      "Package docs render from the cached snapshot; installs and inspector sessions require connectivity.",
  },
  {
    group: "mcp/chat-bot packages",
    label: "Chat bot status",
    webRoute: "/bot/setup",
    posture: "authenticated-webview-fallback",
    offline:
      "Last-synced bot status is read-only; setup steps and command verification are unavailable offline.",
  },
  {
    group: "skills API",
    label: "VCW skills",
    webRoute: "/skill.md (+ /bot/skill.md)",
    posture: "authenticated-webview-fallback",
    offline:
      "Cached skill markdown stays readable offline; key verification and live skill fetches fail closed until reconnect.",
  },
  {
    group: "debug-play",
    label: "DebugPlay headless game-test console",
    webRoute: "/vibecodeworker/debug-play",
    posture: "authenticated-webview-fallback",
    offline:
      "Unavailable offline (cloud execution required); run requests queue and dispatch on reconnect.",
  },
  {
    group: "debug-play",
    label: "DebugPlay frame-analyzer API",
    webRoute: "/api/vcw/debug-play",
    posture: "authenticated-webview-fallback",
    offline:
      "Unavailable offline (cloud execution required); analysis jobs queue and dispatch on reconnect.",
  },
  {
    group: "wave-2 docs",
    label: "Wave-2 remastery docs",
    webRoute: "/docs/remastery",
    posture: "authenticated-webview-fallback",
    offline:
      "Bundled cached snapshot when available; otherwise an offline notice with a retry on reconnect.",
  },
];

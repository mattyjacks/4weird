// DS-REM-03 — Remastery Wave-1 desktop parity board data.
// NEW file only. No secrets. No Tauri/Rust surface.
// Source of Wave-1 scope: v2/vcw4w/public/swarm/remastery/README.md §7.1
// (Squad Workspaces, Kanban Boards, Time Tracking, Invoicing Suite,
// Real-Time Notifications, 1-on-1 Direct Chat) mapped onto the envelope's
// five route groups (tools, games/mods, budgets/squad-pools API,
// vcw/debug-play API, docs/remastery).
// Parity model: native-first + authenticated iframe/webview fallback
// (per envelope goal; v2/desktop/vibecodeworker/docs/PARITY.md absent).

export type DesktopPosture =
  | "native"
  | "authenticated-webview-fallback";

export interface ParityRoute {
  group:
    | "tools"
    | "games/mods"
    | "budgets/squad-pools API"
    | "vcw/debug-play API"
    | "docs/remastery";
  label: string;
  webRoute: string;
  posture: DesktopPosture;
  offline: string;
}

export const PARITY_MODEL =
  "native-first + authenticated iframe fallback" as const;

export const WAVE1_PARITY_ROUTES: ParityRoute[] = [
  {
    group: "tools",
    label: "Free Utilities Suite",
    webRoute: "/tools",
    posture: "authenticated-webview-fallback",
    offline:
      "Cached client-side utilities (converter, counter, SEO preview) keep working offline; AI writing helper is unavailable offline.",
  },
  {
    group: "tools",
    label: "Squad Kanban Boards",
    webRoute: "/squads/[id]/kanban",
    posture: "authenticated-webview-fallback",
    offline:
      "Last-synced board renders read-only; card moves are queued and applied on reconnect, never silently dropped.",
  },
  {
    group: "tools",
    label: "Time Tracking",
    webRoute: "/timer",
    posture: "authenticated-webview-fallback",
    offline:
      "Timer keeps ticking locally via the Web Worker engine; entries sync to the project budget on reconnect.",
  },
  {
    group: "tools",
    label: "Invoicing Suite",
    webRoute: "/business/invoices",
    posture: "authenticated-webview-fallback",
    offline:
      "Cached invoice list and drafts are read-only; PDF export works for cached drafts only; no new sends offline.",
  },
  {
    group: "tools",
    label: "Real-Time Notification Center",
    webRoute: "(global dropdown)",
    posture: "authenticated-webview-fallback",
    offline:
      "No realtime delivery offline; unread badge stays frozen at the last-synced count until reconnect.",
  },
  {
    group: "tools",
    label: "Direct 1-on-1 Chat",
    webRoute: "/chat",
    posture: "authenticated-webview-fallback",
    offline:
      "Cached threads readable offline; outbound messages queue locally and send on reconnect.",
  },
  {
    group: "games/mods",
    label: "Community Mods browser",
    webRoute: "/mods (games/mods)",
    posture: "authenticated-webview-fallback",
    offline:
      "Installed-mods list only; browsing, install, and verification are disabled offline.",
  },
  {
    group: "budgets/squad-pools API",
    label: "Squad Workspaces + pooled wallet",
    webRoute: "/squads/[id]",
    posture: "authenticated-webview-fallback",
    offline:
      "Last-synced workspace snapshot is read-only; wallet balance is display-only with no transfers offline.",
  },
  {
    group: "vcw/debug-play API",
    label: "DebugPlay headless game-test runs",
    webRoute: "/api/vcw/debug-play",
    posture: "authenticated-webview-fallback",
    offline:
      "Unavailable offline (cloud execution required); run requests queue and dispatch on reconnect.",
  },
  {
    group: "docs/remastery",
    label: "Remastery docs",
    webRoute: "/docs/remastery",
    posture: "authenticated-webview-fallback",
    offline:
      "Bundled cached snapshot when available; otherwise an offline notice with a retry on reconnect.",
  },
];

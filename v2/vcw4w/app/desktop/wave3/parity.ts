// DS-REMASTER-W3-DESKTOP — Remastery Wave-3 desktop parity board data.
// NEW file only. No secrets. No Tauri/Rust surface.
// Source of Wave-3 scope: the envelope goal's seven route groups
// (studio video/image, terminal, luck, plugins, studio docs, recordings
// API) plus the studio render-quote API (W3-ECON scope), mapped onto the
// sibling Wave-3 lanes: Media Mogul video NLE (DS-REMASTER-W3-MOGUL /
// DS-REMASTER-W3-WEB1), DictatePic canvas editor (DS-REMASTER-W3-DICTATE /
// DS-REMASTER-W3-WEB2), Commander terminal + Luck Factory
// (DS-REMASTER-W3-WEB3), sandboxed mod/plugin loader (DS-REMASTER-W3-GAMES),
// studio guides (DS-REMASTER-W3-DOCS), DemoRecorder capture pipeline
// (DS-REMASTER-W3-VCW), studio render metering (DS-REMASTER-W3-ECON).
// Parity model: native-first + authenticated iframe/webview fallback
// (per envelope goal; mirrors the Wave-1 board in ../remastery/parity.ts
// and the Wave-2 board in ../wave2/parity.ts, both of which are owned by
// other envelopes and are pattern reference only — never edited here).

export type DesktopPosture =
  | "native"
  | "authenticated-webview-fallback";

export interface ParityRoute {
  group:
    | "studio video"
    | "studio image"
    | "terminal"
    | "luck"
    | "plugins"
    | "studio docs"
    | "recordings API"
    | "studio render quotes";
  label: string;
  webRoute: string;
  posture: DesktopPosture;
  offline: string;
}

export const PARITY_MODEL =
  "native-first + authenticated iframe fallback" as const;

export const WAVE3_PARITY_ROUTES: ParityRoute[] = [
  {
    group: "studio video",
    label: "Media Mogul video NLE",
    webRoute: "/studio/video",
    posture: "authenticated-webview-fallback",
    offline:
      "Last-opened timeline renders read-only; clip edits queue locally and cloud render export is unavailable until reconnect.",
  },
  {
    group: "studio image",
    label: "DictatePic canvas editor",
    webRoute: "/studio/image",
    posture: "authenticated-webview-fallback",
    offline:
      "Local layers, brush tools, and PNG export keep working offline; AI brushes stay disabled-with-copy until reconnect.",
  },
  {
    group: "terminal",
    label: "Commander terminal",
    webRoute: "/terminal",
    posture: "authenticated-webview-fallback",
    offline:
      "Allow-listed local commands and history keep working offline; script-runner fetches fail open and queue until reconnect.",
  },
  {
    group: "luck",
    label: "Luck Factory draws",
    webRoute: "/luck",
    posture: "authenticated-webview-fallback",
    offline:
      "Intention-meditation flow and transparent odds copy stay readable offline; draws are free and stay free on reconnect.",
  },
  {
    group: "plugins",
    label: "Sandboxed mod/plugin loader",
    webRoute: "/games/plugins",
    posture: "authenticated-webview-fallback",
    offline:
      "Enabled-plugin list only; browsing, enable/disable, and verification are disabled offline.",
  },
  {
    group: "studio docs",
    label: "Creative-studio guides",
    webRoute: "/docs/studio",
    posture: "authenticated-webview-fallback",
    offline:
      "Bundled cached snapshot when available; otherwise an offline notice with a retry on reconnect.",
  },
  {
    group: "recordings API",
    label: "DemoRecorder capture pipeline",
    webRoute: "/api/vcw/recordings",
    posture: "authenticated-webview-fallback",
    offline:
      "Capture buffers locally in the ring buffer; session ingest queues and posts on reconnect.",
  },
  {
    group: "studio render quotes",
    label: "Studio render metering quotes",
    webRoute: "/api/budgets/studio-renders",
    posture: "authenticated-webview-fallback",
    offline:
      "Last-synced quote snapshot is display-only; no new render quotes offline.",
  },
];

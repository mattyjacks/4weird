"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type TemplateId = "platformer-2d" | "top-down" | "arcade";

type Template = {
  id: TemplateId;
  label: string;
  emoji: string;
  blurb: string;
  scenes: string[];
  controls: string;
};

const TEMPLATES: Template[] = [
  {
    id: "platformer-2d",
    label: "2D Platformer",
    emoji: "🏃",
    blurb: "Run, jump, and collect across side-scrolling levels.",
    scenes: ["player.tscn", "level-1.tscn", "hud.tscn"],
    controls: "Move: A/D or arrows · Jump: Space · Pause: Esc",
  },
  {
    id: "top-down",
    label: "Top-Down Adventure",
    emoji: "🗺️",
    blurb: "Explore an overworld, talk to NPCs, clear dungeons.",
    scenes: ["overworld.tscn", "player.tscn", "npc.tscn"],
    controls: "Move: WASD or arrows · Interact: E · Pause: Esc",
  },
  {
    id: "arcade",
    label: "Arcade Cabinet",
    emoji: "👾",
    blurb: "Attract mode, one-credit loop, and a game-over screen.",
    scenes: ["attract.tscn", "game.tscn", "game-over.tscn"],
    controls: "Move: arrows · Action: Space or Z · Insert coin: C",
  },
];

const GODOT_VERSIONS = ["4.3-stable", "4.2.2-stable", "4.1.4-stable"] as const;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API unavailable (permissions / insecure context) — fall back.
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function downloadText(filename: string, text: string, mime: string): void {
  downloadBlob(filename, new Blob([text], { type: mime }));
}

// --- Minimal stored (uncompressed) ZIP writer — no dependencies. ---

const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32Bytes(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u16(v: number): Uint8Array {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, v & 0xffff, true);
  return b;
}

function u32(v: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, v >>> 0, true);
  return b;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

// Fixed DOS date 2024-01-01 so exports are deterministic.
const DOS_DATE = (44 << 9) | (1 << 5) | 1;

/** Build a stored-method ZIP (UTF-8 names) from text files. */
function buildStoredZip(files: { name: string; text: string }[]): Blob {
  const enc = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const nameB = enc.encode(f.name);
    const dataB = enc.encode(f.text);
    const crc = crc32Bytes(dataB);
    const local = concatBytes([
      u32(0x04034b50),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(0),
      u16(DOS_DATE),
      u32(crc),
      u32(dataB.length),
      u32(dataB.length),
      u16(nameB.length),
      u16(0),
      nameB,
      dataB,
    ]);
    const central = concatBytes([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(0),
      u16(DOS_DATE),
      u32(crc),
      u32(dataB.length),
      u32(dataB.length),
      u16(nameB.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameB,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const cd = concatBytes(centrals);
  const end = concatBytes([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(cd.length),
    u32(offset),
    u16(0),
  ]);
  const all = concatBytes([...locals, cd, end]);
  return new Blob([all.buffer as ArrayBuffer], { type: "application/zip" });
}

type TabId = "project" | "readme";

export function GamestudioClient() {
  const [name, setName] = useState("My Weird Game");
  const [templateId, setTemplateId] = useState<TemplateId>("platformer-2d");
  const [godot, setGodot] = useState<string>(GODOT_VERSIONS[0]);
  const [tab, setTab] = useState<TabId>("project");
  const [copied, setCopied] = useState<TabId | null>(null);

  const slug = slugify(name);
  const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];

  const projectJson = useMemo(() => {
    return (
      JSON.stringify(
        {
          name: name.trim() || "Untitled Game",
          slug: slug || "untitled-game",
          template: template.id,
          godot: godot,
          engine: "godot",
          createdAt: new Date().toISOString(),
          scenes: template.scenes,
          settings: {
            window: { width: 1152, height: 648, stretch: "canvas_items" },
            input: template.controls,
          },
        },
        null,
        2,
      ) + "\n"
    );
  }, [name, slug, template, godot]);

  const readme = useMemo(() => {
    const title = name.trim() || "Untitled Game";
    return (
      `# ${title}\n\n` +
      `${template.emoji} A **${template.label}** starter scaffolded with 4weird GameStudio.\n\n` +
      `> ${template.blurb}\n\n` +
      `## Open it\n\n` +
      `1. Install Godot **${godot}** (pin this exact build so web exports match).\n` +
      `2. Import \`project.json\` alongside the \`scenes/\` folder.\n` +
      `3. Press **F5** — the main scene is \`${template.scenes[0]}\`.\n\n` +
      `## Scenes\n\n` +
      template.scenes.map((s) => `- \`scenes/${s}\``).join("\n") +
      `\n\n## Controls\n\n${template.controls}\n\n` +
      `## Ship it on 4weird\n\n` +
      `- Playtest with DebugPlay: \`/gamestudio/debugplay\`\n` +
      `- Automate QA with VibeCodeWorker: \`/vibecodeworker\`\n` +
      `- Submit your build: \`/submit\`\n`
    );
  }, [name, template, godot]);

  const valid = slug.length > 0;
  const activeText = tab === "project" ? projectJson : readme;

  async function handleCopy(kind: TabId) {
    const ok = await copyText(kind === "project" ? projectJson : readme);
    if (ok) {
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1600);
    }
  }

  function handleExportZip() {
    if (!valid) return;
    const base = slug || "untitled-game";
    const zip = buildStoredZip([
      { name: `${base}.project.json`, text: projectJson },
      { name: `${base}.README.md`, text: readme },
    ]);
    downloadBlob(`${base}-gamestudio.zip`, zip);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.03]">
      {/* Row 1: Name + Engine + slug — full flow above the fold */}
      <div className="grid gap-2 border-b border-white/10 p-3 sm:grid-cols-[minmax(0,1fr)_220px_200px] sm:items-end">
        <div>
          <label htmlFor="gs-name" className="text-[11px] font-bold text-slate-200">
            Project name
          </label>
          <input
            id="gs-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="My Weird Game"
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/60 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="gs-godot" className="text-[11px] font-bold text-slate-200">
            Engine target
          </label>
          <select
            id="gs-godot"
            value={godot}
            onChange={(e) => setGodot(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-sm text-white focus:border-emerald-400/60 focus:outline-none"
          >
            {GODOT_VERSIONS.map((v) => (
              <option key={v} value={v}>
                Godot {v}
              </option>
            ))}
          </select>
        </div>
        <p className="font-mono text-[11px] text-slate-400 sm:pb-2" aria-live="polite">
          slug: <span className="text-emerald-300">{slug || "untitled-game"}</span>
          {!valid && " — use a letter or number."}
        </p>
      </div>

      {/* Row 2: 52px horizontal segmented template selector */}
      <div
        className="grid grid-cols-1 gap-1.5 p-3 sm:grid-cols-3"
        role="radiogroup"
        aria-label="Template"
      >
        {TEMPLATES.map((t) => {
          const active = t.id === templateId;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={active}
              title={t.blurb}
              onClick={() => setTemplateId(t.id)}
              className={`flex h-[52px] items-center gap-2 overflow-hidden rounded-xl border px-2.5 text-left transition ${
                active
                  ? "border-emerald-400/70 bg-emerald-400/10"
                  : "border-white/10 bg-slate-900 hover:border-white/25"
              }`}
            >
              <span className="shrink-0 text-xl leading-none" aria-hidden="true">
                {t.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold text-white">{t.label}</span>
                <span className="block truncate font-mono text-[10px] text-slate-500">
                  {t.scenes.join(" · ")}
                </span>
              </span>
              <span className="shrink-0 rounded-full border border-emerald-400/40 bg-emerald-950/60 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-300">
                Godot
              </span>
            </button>
          );
        })}
      </div>
      <p className="px-3 pb-1 text-[11px] text-slate-500">
        {template.emoji} {template.blurb} - {template.controls} - Pin the exact Godot build —
        desktop and web exports must match.
      </p>

      {/* Row 3: single tabbed previewer with Copy + Export Zip */}
      <div className="p-3 pt-1">
        <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-950 p-2">
          <div className="flex shrink-0 rounded-lg bg-white/[.04] p-0.5" role="tablist" aria-label="Preview file">
            {(["project", "readme"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`rounded-md px-3 py-1 font-mono text-[11px] font-bold transition ${
                  tab === t ? "bg-emerald-400/20 text-emerald-200" : "text-slate-400 hover:text-white"
                }`}
              >
                {t === "project" ? "project.json" : "README.md"}
              </button>
            ))}
          </div>
          <div className="ml-auto flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={() => handleCopy(tab)}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/10"
            >
              {copied === tab ? "Copied - ok" : "Copy"}
            </button>
            <button
              type="button"
              onClick={() =>
                downloadText(
                  `${slug || "untitled-game"}.${tab === "project" ? "project.json" : "README.md"}`,
                  activeText,
                  tab === "project" ? "application/json" : "text/markdown",
                )
              }
              disabled={!valid}
              title={tab === "project" ? "Download project.json" : "Download README.md"}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              .{tab === "project" ? "json" : "md"} download
            </button>
            <button
              type="button"
              onClick={handleExportZip}
              disabled={!valid}
              className="rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Export Zip
            </button>
          </div>
        </div>
        <pre className="mt-1.5 max-h-[300px] min-h-[180px] overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-200">
          {activeText}
        </pre>
        <nav aria-label="Game tool links" className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
          {[
            { href: "/vibecodeworker", label: "🤖 VibeCodeWorker — automated playtests" },
            { href: "/submit", label: "📦 Submit — ship your build" },
            { href: "/tools", label: "🧰 Tools — more builders" },
          ].map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-lg border border-white/10 bg-white/[.03] px-2.5 py-1 font-semibold text-slate-300 transition hover:border-emerald-400/50 hover:text-white"
            >
              {c.label} -&gt;
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

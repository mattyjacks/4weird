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

function downloadText(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function GamestudioClient() {
  const [name, setName] = useState("My Weird Game");
  const [templateId, setTemplateId] = useState<TemplateId>("platformer-2d");
  const [godot, setGodot] = useState<string>(GODOT_VERSIONS[0]);
  const [copied, setCopied] = useState<"project" | "readme" | null>(null);

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

  async function handleCopy(kind: "project" | "readme") {
    const ok = await copyText(kind === "project" ? projectJson : readme);
    if (ok) {
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1600);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Configurator */}
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
        <label htmlFor="gs-name" className="text-sm font-bold text-slate-200">
          Project name
        </label>
        <input
          id="gs-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="My Weird Game"
          className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-400/60 focus:outline-none"
        />
        <p className="mt-2 font-mono text-xs text-slate-400" aria-live="polite">
          slug: <span className="text-emerald-300">{slug || "untitled-game"}</span>
          {!valid && " — give your game a name with a letter or number."}
        </p>

        <p className="mt-6 text-sm font-bold text-slate-200" id="gs-template-label">
          Template
        </p>
        <div className="mt-2 grid gap-3" role="radiogroup" aria-labelledby="gs-template-label">
          {TEMPLATES.map((t) => {
            const active = t.id === templateId;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTemplateId(t.id)}
                className={`rounded-xl border p-4 text-left transition ${
                  active
                    ? "border-emerald-400/70 bg-emerald-400/10"
                    : "border-white/10 bg-slate-900 hover:border-white/25"
                }`}
              >
                <span className="text-2xl" aria-hidden="true">
                  {t.emoji}
                </span>
                <span className="ml-2 font-bold">{t.label}</span>
                <span className="mt-1 block text-sm text-slate-400">{t.blurb}</span>
                <span className="mt-1 block font-mono text-xs text-slate-500">
                  {t.scenes.join(" · ")}
                </span>
              </button>
            );
          })}
        </div>

        <label htmlFor="gs-godot" className="mt-6 block text-sm font-bold text-slate-200">
          Godot version
        </label>
        <select
          id="gs-godot"
          value={godot}
          onChange={(e) => setGodot(e.target.value)}
          className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-emerald-400/60 focus:outline-none"
        >
          {GODOT_VERSIONS.map((v) => (
            <option key={v} value={v}>
              Godot {v}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-slate-400">
          Godot version note: pin the exact editor build above — desktop and
          web exports must match, or physics and fonts will drift between your
          machine and the 4weird arcade.
        </p>
      </div>

      {/* Live output */}
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-mono text-sm font-bold text-emerald-300">project.json</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleCopy("project")}
                className="rounded-full border border-white/20 px-4 py-1.5 text-sm font-semibold transition hover:bg-white/10"
              >
                {copied === "project" ? "Copied ✓" : "Copy"}
              </button>
              <button
                type="button"
                disabled={!valid}
                onClick={() => downloadText(`${slug || "untitled-game"}.project.json`, projectJson, "application/json")}
                className="rounded-full bg-emerald-400 px-4 py-1.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Download
              </button>
            </div>
          </div>
          <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200">
            {projectJson}
          </pre>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-mono text-sm font-bold text-emerald-300">README.md</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleCopy("readme")}
                className="rounded-full border border-white/20 px-4 py-1.5 text-sm font-semibold transition hover:bg-white/10"
              >
                {copied === "readme" ? "Copied ✓" : "Copy"}
              </button>
              <button
                type="button"
                disabled={!valid}
                onClick={() => downloadText(`${slug || "untitled-game"}.README.md`, readme, "text/markdown")}
                className="rounded-full bg-emerald-400 px-4 py-1.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Download
              </button>
            </div>
          </div>
          <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200">
            {readme}
          </pre>
        </div>

        <nav aria-label="Game tool links" className="grid gap-3 sm:grid-cols-3">
          {[
            { href: "/vibecodeworker", label: "VibeCodeWorker", emoji: "🤖", blurb: "Automated playtests" },
            { href: "/submit", label: "Submit", emoji: "📦", blurb: "Ship your build" },
            { href: "/tools", label: "Tools", emoji: "🧰", blurb: "More builders" },
          ].map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-xl border border-white/10 bg-white/[.03] p-4 transition hover:-translate-y-0.5 hover:border-emerald-400/50"
            >
              <span className="text-2xl" aria-hidden="true">
                {c.emoji}
              </span>
              <span className="mt-1 block font-bold">{c.label} →</span>
              <span className="block text-xs text-slate-400">{c.blurb}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

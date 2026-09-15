"use client";

import { useEffect, useMemo, useState } from "react";

type PlatformId = "windows" | "macos" | "linux";
type RuntimeId = "node" | "python" | "ffmpeg";

const PLATFORMS: { id: PlatformId; label: string; artifact: string }[] = [
  { id: "windows", label: "Windows", artifact: ".exe" },
  { id: "macos", label: "macOS", artifact: ".dmg" },
  { id: "linux", label: "Linux", artifact: ".deb" },
];

const RUNTIMES: { id: RuntimeId; label: string; blurb: string }[] = [
  { id: "node", label: "Node.js", blurb: "No install step." },
  { id: "python", label: "Python", blurb: "Scripted helpers." },
  { id: "ffmpeg", label: "FFmpeg", blurb: "Audio/video export." },
];

const LICENSES = ["MIT", "Apache-2.0", "GPL-3.0", "Proprietary"] as const;

const ICON_CHOICES = ["🚀", "🎮", "📦", "⚙️", "🎨", "🤖", "👾", "⭐"];

const DRAFT_KEY = "4weird-builder-draft-v1";
const VERSION_RE = /^\d+\.\d+\.\d+$/;

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "my-app";
}

export function BuilderClient() {
  const [name, setName] = useState("My Weird App");
  const [version, setVersion] = useState("1.0.0");
  const [platforms, setPlatforms] = useState<PlatformId[]>(["windows"]);
  const [icon, setIcon] = useState(ICON_CHOICES[0]);
  const [license, setLicense] = useState<(typeof LICENSES)[number]>("MIT");
  const [runtimes, setRuntimes] = useState<RuntimeId[]>(["node"]);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Load the autosaved draft once, on the client only.
  /* eslint-disable react-hooks/set-state-in-effect -- localStorage restore must run post-hydration to avoid an SSR mismatch; single mount sync is intentional. */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as {
          name?: unknown;
          version?: unknown;
          platforms?: unknown;
          icon?: unknown;
          license?: unknown;
          runtimes?: unknown;
        };
        if (typeof draft.name === "string" && draft.name.trim()) setName(draft.name);
        if (typeof draft.version === "string" && draft.version.trim()) setVersion(draft.version);
        if (
          Array.isArray(draft.platforms) &&
          draft.platforms.every((p) => p === "windows" || p === "macos" || p === "linux")
        ) {
          setPlatforms(draft.platforms as PlatformId[]);
        }
        if (typeof draft.icon === "string" && draft.icon) setIcon(draft.icon);
        if (typeof draft.license === "string" && (LICENSES as readonly string[]).includes(draft.license)) {
          setLicense(draft.license as (typeof LICENSES)[number]);
        }
        if (
          Array.isArray(draft.runtimes) &&
          draft.runtimes.every((r) => r === "node" || r === "python" || r === "ffmpeg")
        ) {
          setRuntimes(draft.runtimes as RuntimeId[]);
        }
      }
    } catch {
      // Corrupt draft: ignore it and start fresh.
    }
    setLoaded(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Autosave every change once the initial load has finished.
  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ name, version, platforms, icon, license, runtimes }),
      );
    } catch {
      // Storage full or blocked: the form keeps working without persistence.
    }
  }, [loaded, name, version, platforms, icon, license, runtimes]);

  const errors = useMemo(() => {
    const list: string[] = [];
    if (!name.trim()) list.push("Give the project a name.");
    if (!VERSION_RE.test(version.trim()))
      list.push("Version must look like 1.0.0 (major.minor.patch).");
    if (platforms.length === 0) list.push("Pick at least one platform.");
    return list;
  }, [name, version, platforms]);

  const config = useMemo(() => {
    const slug = slugify(name);
    return {
      tool: "4weird-clone-tool",
      version: 1,
      project: {
        name: name.trim(),
        slug,
        appVersion: version.trim(),
        icon,
        license,
      },
      targets: [...platforms]
        .sort()
        .map((id) => {
          const meta = PLATFORMS.find((p) => p.id === id) ?? PLATFORMS[0];
          return {
            platform: id,
            artifact: `${slug}-setup-${version.trim()}${meta.artifact}`,
          };
        }),
      runtimes: {
        node: runtimes.includes("node"),
        python: runtimes.includes("python"),
        ffmpeg: runtimes.includes("ffmpeg"),
      },
    };
  }, [name, version, icon, license, platforms, runtimes]);

  const configText = useMemo(() => JSON.stringify(config, null, 2), [config]);

  function toggle<T>(list: T[], value: T, set: (next: T[]) => void) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function downloadJson() {
    if (errors.length > 0) {
      setNotice(errors[0]);
      return;
    }
    try {
      const blob = new Blob([configText], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${config.project.slug}-installer-config.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setNotice(`Downloaded ${config.project.slug}-installer-config.json.`);
    } catch {
      setNotice("Download failed in this browser — use Copy instead.");
    }
  }

  async function copyJson() {
    if (errors.length > 0) {
      setNotice(errors[0]);
      return;
    }
    try {
      await navigator.clipboard.writeText(configText);
      setNotice("Config JSON copied to the clipboard.");
    } catch {
      setNotice("Clipboard is blocked in this browser — select the preview and copy manually.");
    }
  }

  function buildPackage() {
    if (errors.length > 0) {
      setNotice(errors[0]);
      return;
    }
    downloadJson();
    setNotice(
      `Build staged: ${config.project.slug}-setup-${config.project.appVersion} for ${config.targets.length} target${config.targets.length === 1 ? "" : "s"} (${config.targets.map((t) => t.artifact).join(", ")}). Config downloaded — hand it to your packager.`,
    );
  }

  function resetDraft() {
    setName("My Weird App");
    setVersion("1.0.0");
    setPlatforms(["windows"]);
    setIcon(ICON_CHOICES[0]);
    setLicense("MIT");
    setRuntimes(["node"]);
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Non-fatal.
    }
    setNotice("Draft reset to defaults.");
  }

  return (
    <div className="flex h-[calc(100vh-120px)] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[.03]">
      {/* Sticky top-right command bar: Copy + Download + Build */}
      <div className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b border-white/10 bg-slate-950/90 px-3 py-2 backdrop-blur">
        <p className="min-w-0 flex-1 truncate text-[11px] text-slate-400" role="status">
          {errors.length > 0 ? (
            <span className="text-amber-300">Warning: {errors[0]}</span>
          ) : (
            <>
              Ready: {config.targets.length} target{config.targets.length === 1 ? "" : "s"} -{" "}
              {config.project.slug} {config.project.appVersion}
            </>
          )}
          {notice ? <span className="text-cyan-200"> — {notice}</span> : null}
        </p>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={copyJson}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-white transition hover:border-cyan-300/50"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={downloadJson}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-white transition hover:border-cyan-300/50"
          >
            Download
          </button>
          <button
            type="button"
            onClick={buildPackage}
            className="rounded-lg bg-cyan-300 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-200"
          >
            Build
          </button>
        </div>
      </div>

      {/* 2-col split: dense inputs | fixed-height JSON preview */}
      <div className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-2">
        <div className="min-h-0 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/60 p-3">
          {/* Name + Version side-by-side */}
          <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-2">
            <label className="block text-[11px] font-semibold text-slate-200">
              Project name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Weird App"
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2.5 py-1.5 text-sm text-white placeholder:text-slate-500"
              />
            </label>
            <label className="block text-[11px] font-semibold text-slate-200">
              Version
              <input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.0.0"
                inputMode="numeric"
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2.5 py-1.5 font-mono text-sm text-white placeholder:text-slate-500"
              />
            </label>
          </div>

          {/* Platform pills */}
          <fieldset className="mt-3">
            <legend className="text-[11px] font-semibold text-slate-200">Platforms</legend>
            <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-label="Platforms">
              {PLATFORMS.map((p) => {
                const active = platforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggle(platforms, p.id, setPlatforms)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                      active
                        ? "border-cyan-300/70 bg-cyan-300/15 text-cyan-100"
                        : "border-white/10 bg-slate-900 text-slate-400 hover:border-cyan-300/40"
                    }`}
                  >
                    {p.label} <span className="font-mono font-normal opacity-70">{p.artifact}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Icon + License compact row */}
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_130px] items-start gap-2">
            <fieldset>
              <legend className="text-[11px] font-semibold text-slate-200">App icon</legend>
              <div className="mt-1 flex flex-wrap gap-1" role="radiogroup" aria-label="App icon">
                {ICON_CHOICES.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    role="radio"
                    aria-checked={icon === choice}
                    onClick={() => setIcon(choice)}
                    className={`rounded-lg border px-2 py-1 text-lg leading-none transition ${
                      icon === choice
                        ? "border-cyan-300/70 bg-cyan-300/10 text-white"
                        : "border-white/10 bg-slate-900 text-slate-400 hover:border-cyan-300/40"
                    }`}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="block text-[11px] font-semibold text-slate-200">
              License
              <select
                value={license}
                onChange={(e) => setLicense(e.target.value as (typeof LICENSES)[number])}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-xs text-white"
              >
                {LICENSES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Runtime 2x2 grid */}
          <fieldset className="mt-3">
            <legend className="text-[11px] font-semibold text-slate-200">Bundled runtimes</legend>
            <div className="mt-1 grid grid-cols-2 gap-1.5">
              {RUNTIMES.map((r) => {
                const active = runtimes.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggle(runtimes, r.id, setRuntimes)}
                    className={`rounded-lg border px-2.5 py-1.5 text-left transition ${
                      active
                        ? "border-cyan-300/60 bg-cyan-300/10"
                        : "border-white/10 bg-slate-900 hover:border-cyan-300/40"
                    }`}
                  >
                    <span className="block text-xs font-bold text-white">
                      [{active ? "x" : " "}] {r.label}
                    </span>
                    <span className="block text-[10px] text-slate-400">{r.blurb}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={resetDraft}
                className="rounded-lg border border-dashed border-white/15 px-2.5 py-1.5 text-left text-xs font-semibold text-slate-400 transition hover:border-cyan-300/50 hover:text-white"
              >
                Reset draft
                <span className="block text-[10px] font-normal opacity-70">Defaults + clear autosave</span>
              </button>
            </div>
          </fieldset>

          {errors.length > 0 ? (
            <ul className="mt-3 space-y-0.5 rounded-lg border border-amber-300/30 bg-amber-300/10 p-2.5 text-[11px] text-amber-200">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* Fixed-height highlighted JSON preview */}
        <div className="flex min-h-0 flex-col rounded-xl border border-cyan-300/20 bg-slate-950 p-3">
          <div className="flex shrink-0 items-center justify-between">
            <h2 className="font-mono text-[11px] font-bold text-cyan-300">config.json — live</h2>
            <span className="font-mono text-[10px] text-slate-500">
              {configText.length} chars - Copy/Download/Build emit this exact JSON
            </span>
          </div>
          <pre className="mt-2 min-h-0 flex-1 overflow-auto rounded-lg border border-white/10 bg-black p-3 font-mono text-[11px] leading-relaxed text-cyan-100">
            {configText}
          </pre>
        </div>
      </div>
    </div>
  );
}

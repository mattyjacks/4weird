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
  { id: "node", label: "Node.js runtime", blurb: "Bundle Node so the app runs with no install step." },
  { id: "python", label: "Python runtime", blurb: "Bundle Python for scripted tools and helpers." },
  { id: "ffmpeg", label: "FFmpeg", blurb: "Bundle FFmpeg for audio and video export." },
];

const LICENSES = ["MIT", "Apache-2.0", "GPL-3.0", "Proprietary"] as const;

const ICON_CHOICES = ["\u{1F680}", "\u{1F3AE}", "\u{1F4E6}", "\u{2699}\u{FE0F}", "\u{1F3A8}", "\u{1F916}", "\u{1F47E}", "\u{2B50}"];

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
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-3xl border border-white/10 bg-white/[.04] p-6 sm:p-8">
        <h2 className="text-xl font-black">Configure</h2>

        <label className="mt-6 block text-sm font-semibold text-slate-200">
          Project name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Weird App"
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white placeholder:text-slate-500"
          />
        </label>

        <label className="mt-4 block text-sm font-semibold text-slate-200">
          Version
          <input
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="1.0.0"
            inputMode="numeric"
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white placeholder:text-slate-500"
          />
        </label>

        <fieldset className="mt-6">
          <legend className="text-sm font-semibold text-slate-200">Platforms</legend>
          <div className="mt-2 space-y-2">
            {PLATFORMS.map((p) => (
              <label
                key={p.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={platforms.includes(p.id)}
                  onChange={() => toggle(platforms, p.id, setPlatforms)}
                  className="h-4 w-4 accent-cyan-300"
                />
                <span className="font-semibold">{p.label}</span>
                <span className="text-slate-400">({p.artifact})</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="text-sm font-semibold text-slate-200">App icon</legend>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="App icon">
            {ICON_CHOICES.map((choice) => (
              <button
                key={choice}
                type="button"
                role="radio"
                aria-checked={icon === choice}
                onClick={() => setIcon(choice)}
                className={`rounded-xl border px-3 py-2 text-2xl transition ${
                  icon === choice
                    ? "border-cyan-300/70 bg-cyan-300/10"
                    : "border-white/10 bg-slate-900 hover:border-cyan-300/40"
                }`}
              >
                {choice}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="mt-6 block text-sm font-semibold text-slate-200">
          License
          <select
            value={license}
            onChange={(e) => setLicense(e.target.value as (typeof LICENSES)[number])}
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white"
          >
            {LICENSES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="mt-6">
          <legend className="text-sm font-semibold text-slate-200">Bundled runtimes</legend>
          <div className="mt-2 space-y-2">
            {RUNTIMES.map((r) => (
              <label
                key={r.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={runtimes.includes(r.id)}
                  onChange={() => toggle(runtimes, r.id, setRuntimes)}
                  className="mt-0.5 h-4 w-4 accent-cyan-300"
                />
                <span>
                  <span className="block font-semibold">{r.label}</span>
                  <span className="block text-slate-400">{r.blurb}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={downloadJson}
            className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
          >
            Download JSON
          </button>
          <button
            type="button"
            onClick={copyJson}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-white transition hover:border-cyan-300/50"
          >
            Copy JSON
          </button>
          <button
            type="button"
            onClick={resetDraft}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-cyan-300/50"
          >
            Reset
          </button>
        </div>

        {errors.length > 0 ? (
          <ul className="mt-4 space-y-1 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-200">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-400">
            Ready: {config.targets.length} target{config.targets.length === 1 ? "" : "s"} for{" "}
            {config.project.slug} {config.project.appVersion}.
          </p>
        )}
        {notice ? (
          <p role="status" className="mt-2 text-sm text-cyan-200">
            {notice}
          </p>
        ) : null}
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[.04] p-6 sm:p-8">
        <h2 className="text-xl font-black">Live config preview</h2>
        <p className="mt-2 text-sm text-slate-400">
          This exact JSON is what Download and Copy produce.
        </p>
        <pre className="mt-4 max-h-[560px] overflow-auto rounded-xl border border-white/10 bg-slate-950 p-4 text-xs leading-relaxed text-cyan-100">
          {configText}
        </pre>
      </div>
    </div>
  );
}

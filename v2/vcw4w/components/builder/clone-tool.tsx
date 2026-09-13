"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TargetOs = "windows" | "macos" | "linux";
type Runtime = "none" | "node" | "python";

interface BuilderConfig {
  appName: string;
  version: string;
  targets: TargetOs[];
  runtime: Runtime;
  includeLicense: boolean;
  includeSplash: boolean;
}

interface BuildArtifact {
  os: TargetOs;
  label: string;
  extension: string;
  filename: string;
}

const STORAGE_KEY = "4weird_builder_clone_tool_config";
const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const SAFE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

const TARGET_META: Array<{ id: TargetOs; label: string; extension: string }> = [
  { id: "windows", label: ".exe · Windows", extension: ".exe" },
  { id: "macos", label: ".dmg · macOS", extension: ".dmg" },
  { id: "linux", label: ".deb · Linux", extension: ".deb" },
];

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return slug || "app";
}

function artifactFor(os: TargetOs, slug: string, version: string): BuildArtifact {
  const meta = TARGET_META.find((t) => t.id === os) ?? TARGET_META[0];
  const suffix = os === "windows" ? "win" : os === "macos" ? "mac" : "linux";
  return {
    os,
    label: meta.label,
    extension: meta.extension,
    filename: `${slug}-${version}-${suffix}${meta.extension}`,
  };
}

function readStoredConfig(): BuilderConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const p = parsed as Partial<BuilderConfig>;
    return {
      appName: typeof p.appName === "string" ? p.appName : "",
      version: typeof p.version === "string" ? p.version : "",
      targets: Array.isArray(p.targets)
        ? p.targets.filter(
            (t): t is TargetOs =>
              t === "windows" || t === "macos" || t === "linux",
          )
        : [],
      runtime:
        p.runtime === "node" || p.runtime === "python" || p.runtime === "none"
          ? p.runtime
          : "none",
      includeLicense: p.includeLicense === true,
      includeSplash: p.includeSplash === true,
    };
  } catch {
    return null;
  }
}

// Clone Tool: client-side installer-config generator. Hydration-safe: form
// state starts with static defaults and localStorage is only touched inside
// useEffect (restore) and event handlers (persist) — never during render.
export function CloneTool() {
  const [appName, setAppName] = useState("");
  const [version, setVersion] = useState("");
  const [targets, setTargets] = useState<TargetOs[]>([]);
  const [runtime, setRuntime] = useState<Runtime>("none");
  const [includeLicense, setIncludeLicense] = useState(false);
  const [includeSplash, setIncludeSplash] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "ok" | "fail">("idle");
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    // Deferred restore (callback, not effect body) so hydration stays static
    // and the set-state-in-effect lint passes; localStorage is client-only.
    const timer = window.setTimeout(() => {
      const stored = readStoredConfig();
      if (stored) {
        setAppName(stored.appName);
        setVersion(stored.version);
        setTargets(stored.targets);
        setRuntime(stored.runtime);
        setIncludeLicense(stored.includeLicense);
        setIncludeSplash(stored.includeSplash);
      }
      setRestored(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const nameError =
    appName.trim().length === 0
      ? "App name is required."
      : appName.trim().length > 60
        ? "App name must be 60 characters or fewer."
        : null;
  const nameWarning =
    !nameError && !SAFE_NAME_RE.test(appName.trim())
      ? "Heads up: unusual characters or spaces will be converted to dashes in file names."
      : null;

  const versionError =
    version.trim().length === 0
      ? "Version is required."
      : !SEMVER_RE.test(version.trim())
        ? "Use semver, e.g. 1.0.0 or 2.1.0-beta.1."
        : null;

  const targetsError =
    targets.length === 0 ? "Pick at least one target OS." : null;

  const isValid = !nameError && !versionError && !targetsError;

  const slug = useMemo(() => slugify(appName || "app"), [appName]);
  const cleanVersion = version.trim() || "0.0.0";

  const matrix: BuildArtifact[] = useMemo(
    () => targets.map((os) => artifactFor(os, slug, cleanVersion)),
    [targets, slug, cleanVersion],
  );

  const manifest = useMemo(
    () =>
      JSON.stringify(
        {
          tool: "4weird-clone-tool",
          app: appName.trim(),
          slug,
          version: version.trim(),
          targets,
          runtime,
          includeLicense,
          includeSplash,
          artifacts: matrix.map((a) => ({
            os: a.os,
            file: a.filename,
          })),
          generatedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    [
      appName,
      slug,
      version,
      targets,
      runtime,
      includeLicense,
      includeSplash,
      matrix,
    ],
  );

  const manifestFilename = `${slug}-installer-manifest.json`;

  const toggleTarget = (os: TargetOs) => {
    setGenerated(false);
    setTargets((prev) =>
      prev.includes(os) ? prev.filter((t) => t !== os) : [...prev, os],
    );
  };

  const persist = (cfg: BuilderConfig) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    } catch {
      // Storage blocked — tool keeps working without persistence.
    }
  };

  const handleGenerate = () => {
    if (!isValid) return;
    persist({
      appName,
      version,
      targets,
      runtime,
      includeLicense,
      includeSplash,
    });
    setGenerated(true);
    setCopyState("idle");
  };

  const handleDownload = () => {
    const blob = new Blob([manifest], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = manifestFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleCopy = () => {
    const done = (ok: boolean) => {
      setCopyState(ok ? "ok" : "fail");
      window.setTimeout(() => setCopyState("idle"), 2500);
    };
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(manifest).then(
        () => done(true),
        () => done(false),
      );
    } else {
      try {
        const ta = document.createElement("textarea");
        ta.value = manifest;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        done(true);
      } catch {
        done(false);
      }
    }
  };

  return (
    <div className="grid gap-4">
      <Card className="border-white/10 bg-white/[.03] text-white">
        <CardHeader>
          <CardTitle className="text-lg font-black">
            Installer configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="clone-app-name">App name</Label>
            <Input
              id="clone-app-name"
              value={appName}
              onChange={(e) => {
                setAppName(e.target.value);
                setGenerated(false);
              }}
              placeholder="My Awesome Game"
              maxLength={80}
              aria-invalid={nameError ? true : undefined}
              aria-describedby="clone-app-name-msg"
              className="border-white/10 bg-black/40 text-white placeholder:text-slate-500"
            />
            <p
              id="clone-app-name-msg"
              aria-live="polite"
              className={`text-sm ${nameError ? "text-rose-300" : nameWarning ? "text-amber-300" : "text-slate-500"}`}
            >
              {nameError ?? nameWarning ?? "1–60 characters. File-safe names use letters, numbers, dots, dashes."}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="clone-version">Version</Label>
            <Input
              id="clone-version"
              value={version}
              onChange={(e) => {
                setVersion(e.target.value);
                setGenerated(false);
              }}
              placeholder="1.0.0"
              inputMode="text"
              autoComplete="off"
              aria-invalid={versionError ? true : undefined}
              aria-describedby="clone-version-msg"
              className="border-white/10 bg-black/40 text-white placeholder:text-slate-500"
            />
            <p
              id="clone-version-msg"
              aria-live="polite"
              className={`text-sm ${versionError ? "text-rose-300" : "text-slate-500"}`}
            >
              {versionError ?? "Semantic version, e.g. 1.0.0."}
            </p>
          </div>

          <fieldset>
            <legend className="text-sm font-medium">Target OS</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {TARGET_META.map((t) => {
                const checked = targets.includes(t.id);
                return (
                  <label
                    key={t.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm transition focus-within:ring-2 focus-within:ring-cyan-300/60 ${checked ? "border-cyan-300/60 bg-cyan-300/10 text-white" : "border-white/15 text-slate-300 hover:bg-white/5"}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTarget(t.id)}
                      className="h-4 w-4 accent-cyan-300"
                    />
                    {t.label}
                  </label>
                );
              })}
            </div>
            <p aria-live="polite" className={`mt-2 text-sm ${targetsError ? "text-rose-300" : "text-slate-500"}`}>
              {targetsError ?? `${targets.length} target${targets.length === 1 ? "" : "s"} selected.`}
            </p>
          </fieldset>

          <div className="grid gap-2">
            <Label htmlFor="clone-runtime">Bundled runtime</Label>
            <select
              id="clone-runtime"
              value={runtime}
              onChange={(e) => {
                setRuntime(e.target.value as Runtime);
                setGenerated(false);
              }}
              className="h-9 w-full rounded-md border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:ring-1 focus:ring-cyan-300/60"
            >
              <option value="none">None — static/native only</option>
              <option value="node">Node.js runtime</option>
              <option value="python">Python runtime</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/5 focus-within:ring-2 focus-within:ring-cyan-300/60">
              <input
                type="checkbox"
                checked={includeLicense}
                onChange={(e) => {
                  setIncludeLicense(e.target.checked);
                  setGenerated(false);
                }}
                className="h-4 w-4 accent-cyan-300"
              />
              Include license text
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/5 focus-within:ring-2 focus-within:ring-cyan-300/60">
              <input
                type="checkbox"
                checked={includeSplash}
                onChange={(e) => {
                  setIncludeSplash(e.target.checked);
                  setGenerated(false);
                }}
                className="h-4 w-4 accent-cyan-300"
              />
              Include splash screen
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={!isValid}
              className="bg-cyan-300 font-bold text-slate-950 hover:bg-cyan-200 disabled:opacity-40"
            >
              Generate manifest
            </Button>
            {!restored ? null : (
              <p aria-live="polite" className="w-full text-xs text-slate-500">
                Last config auto-saves to this browser and restores on load.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div aria-live="polite">
        {!generated || !isValid ? (
          <Card className="border-white/10 bg-white/[.03] text-white">
            <CardContent className="p-6 text-sm text-slate-400">
              <p className="font-bold text-slate-200">No manifest yet.</p>
              <p className="mt-1">
                Fill in an app name, a semver version, and at least one target
                OS — then hit Generate to preview the build matrix and download
                your installer manifest.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            <Card className="border-emerald-300/20 bg-emerald-300/[.05] text-white">
              <CardHeader>
                <CardTitle className="text-lg font-black text-emerald-200">
                  Build matrix ready ✓
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2">
                  {matrix.map((a) => (
                    <li
                      key={a.os}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm"
                    >
                      <span className="font-semibold text-slate-200">
                        {a.label}
                      </span>
                      <code className="rounded bg-white/10 px-2 py-1 font-mono text-xs text-cyan-200">
                        {a.filename}
                      </code>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[.03] text-white">
              <CardHeader>
                <CardTitle className="text-base font-black">
                  Build manifest preview
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <pre className="max-h-80 overflow-auto rounded-2xl border border-white/10 bg-black/60 p-4 font-mono text-xs leading-relaxed text-slate-200">
                  {manifest}
                </pre>
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    onClick={handleDownload}
                    className="bg-cyan-300 font-bold text-slate-950 hover:bg-cyan-200"
                  >
                    Download {manifestFilename}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopy}
                    className="border-white/20 bg-transparent text-white hover:bg-white/10"
                  >
                    {copyState === "ok"
                      ? "Copied!"
                      : copyState === "fail"
                        ? "Copy failed"
                        : "Copy manifest"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

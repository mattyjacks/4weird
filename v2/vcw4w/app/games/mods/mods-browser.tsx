"use client";

/**
 * /games/mods browser (Remastery Feature 12, Wave 1 slice).
 *
 * Reads local bundled manifest data, then tries a live fetch; ANY failure
 * (offline, 404, bad payload) falls back to the validated local bundle so
 * the page never bricks navigation (fail-open safety).
 */

import { useEffect, useMemo, useState } from "react";
import {
  validateModList,
  validateThemeList,
  type CommunityModRow,
  type CommunityThemeRow,
} from "@/lib/game-mods";

const LOCAL_MODS: CommunityModRow[] = [
  {
    name: "Neon Arena Nights",
    slug: "neon-arena-nights",
    description: "Night-mode arena lighting + synthwave skybox overlay.",
    version: "1.2.0",
    target_game: "gravegain3d",
    manifest_json: {
      entry: "mod.js",
      permissions: ["storage", "audio"],
      assets: { skybox: "assets/skybox.png" },
      author: "crypt-artist",
      description: "Night-mode arena lighting + synthwave skybox overlay.",
    },
    script_url: "https://cdn.example.com/mods/neon-arena-nights/mod.js",
    is_verified: true,
    downloads_count: 1204,
  },
  {
    name: "Pixel Trails",
    slug: "pixel-trails",
    description: "Retro motion-trail sprites for 2D runners.",
    version: "0.9.1",
    target_game: "gravegain2d",
    manifest_json: {
      entry: "trails.js",
      permissions: ["storage"],
      author: "sprite-smith",
    },
    script_url: "https://cdn.example.com/mods/pixel-trails/trails.js",
    is_verified: false,
    downloads_count: 87,
  },
];

const LOCAL_THEMES: CommunityThemeRow[] = [
  {
    name: "Void Neon",
    slug: "void-neon",
    css_tokens: {
      "--bg": "#070912",
      "--surface": "#0f1424",
      "--accent": "#22d3ee",
      "--text": "#e2e8f0",
    },
    is_public: true,
    likes_count: 342,
  },
  {
    name: "Grave Moss",
    slug: "grave-moss",
    css_tokens: {
      "--bg": "#0b120c",
      "--surface": "#16211a",
      "--accent": "#4ade80",
      "--text": "#d1fae5",
    },
    is_public: true,
    likes_count: 129,
  },
];

type Source = "local" | "live";

export function ModsBrowser() {
  const [mods, setMods] = useState<CommunityModRow[]>(LOCAL_MODS);
  const [themes, setThemes] = useState<CommunityThemeRow[]>(LOCAL_THEMES);
  const [source, setSource] = useState<Source>("local");
  const [filter, setFilter] = useState("");
  const [activeThemeSlug, setActiveThemeSlug] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function tryLive() {
      try {
        const res = await fetch("/api/games/mods", { cache: "no-store" });
        if (!res.ok) return; // stay on local bundle
        const data: unknown = await res.json();
        if (typeof data !== "object" || data === null) return;
        const { mods: liveMods, themes: liveThemes } = data as {
          mods?: unknown[];
          themes?: unknown[];
        };
        if (!cancelled && Array.isArray(liveMods) && Array.isArray(liveThemes)) {
          const validMods = validateModList(liveMods).flatMap((r) => (r.ok ? [r.value] : []));
          const validThemes = validateThemeList(liveThemes).flatMap((r) =>
            r.ok ? [r.value] : []
          );
          if (validMods.length > 0 || validThemes.length > 0) {
            setMods(validMods.length > 0 ? validMods : LOCAL_MODS);
            setThemes(validThemes.length > 0 ? validThemes : LOCAL_THEMES);
            setSource("live");
          }
        }
      } catch {
        // Offline or unreachable — local bundle already rendered.
      }
    }
    void tryLive();
    try {
      const saved = window.localStorage.getItem("vcw-mod-theme");
      if (saved) setActiveThemeSlug(saved);
    } catch {
      // storage unavailable — ignore
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const activeTheme = useMemo(
    () => themes.find((t) => t.slug === activeThemeSlug) ?? null,
    [themes, activeThemeSlug]
  );

  const q = filter.trim().toLowerCase();
  const visibleMods = q
    ? mods.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.slug.includes(q) ||
          m.target_game.toLowerCase().includes(q)
      )
    : mods;

  function applyTheme(slug: string | null) {
    setActiveThemeSlug(slug);
    try {
      if (slug) window.localStorage.setItem("vcw-mod-theme", slug);
      else window.localStorage.removeItem("vcw-mod-theme");
    } catch {
      // storage unavailable — theme still applies for this session
    }
  }

  const previewStyle = activeTheme
    ? ({
        backgroundColor: activeTheme.css_tokens["--bg"],
        color: activeTheme.css_tokens["--text"],
        borderColor: activeTheme.css_tokens["--accent"],
      } as React.CSSProperties)
    : undefined;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 text-white">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
          Remastery Feature 12 · Community Mods &amp; Themes
        </p>
        <h1 className="mt-2 text-3xl font-black">Mods &amp; Themes Browser</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Community mod manifests (sandboxed iframe, strict origin) and CSS token themes.
          {source === "local" ? (
            <span> Showing the offline bundle — connect to refresh live data.</span>
          ) : (
            <span> Live data loaded.</span>
          )}
        </p>
      </header>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter mods by name, slug, or target game…"
          aria-label="Filter mods"
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white placeholder:text-slate-500"
        />
        <span className="shrink-0 rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
          source: {source === "live" ? "live" : "offline bundle"}
        </span>
      </div>

      <section aria-label="Community mods" className="mt-8">
        <h2 className="text-xl font-bold">Mods ({visibleMods.length})</h2>
        {visibleMods.length === 0 ? (
          <p className="mt-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
            No mods match “{filter}”. Clear the filter to see the offline bundle.
          </p>
        ) : (
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {visibleMods.map((m) => (
              <li
                key={m.slug}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold">{m.name}</h3>
                  {m.is_verified ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                      ✓ verified
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-400">
                      unverified
                    </span>
                  )}
                </div>
                <p className="mt-1 font-mono text-xs text-slate-400">
                  {m.slug} · v{m.version} · target: {m.target_game}
                </p>
                {m.description ? (
                  <p className="mt-2 text-sm text-slate-300">{m.description}</p>
                ) : null}
                <p className="mt-2 font-mono text-[11px] text-slate-500">
                  entry: {m.manifest_json.entry} · downloads: {m.downloads_count ?? 0}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Community themes" className="mt-10">
        <h2 className="text-xl font-bold">Themes ({themes.length})</h2>
        {activeTheme ? (
          <div
            style={previewStyle}
            className="mt-4 rounded-2xl border-2 p-5"
            aria-live="polite"
          >
            <p className="text-sm font-bold">Preview: {activeTheme.name}</p>
            <p className="mt-1 text-sm opacity-80">
              Tokens: {Object.keys(activeTheme.css_tokens).join(", ")}
            </p>
            <button
              onClick={() => applyTheme(null)}
              className="mt-3 rounded-lg border border-current px-3 py-1 text-xs font-bold"
            >
              Clear preview
            </button>
          </div>
        ) : null}
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {themes.map((t) => (
            <li key={t.slug} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold">{t.name}</h3>
                <span className="font-mono text-xs text-slate-400">♥ {t.likes_count ?? 0}</span>
              </div>
              <div className="mt-3 flex gap-2" aria-label={`${t.name} swatches`}>
                {Object.entries(t.css_tokens).map(([token, value]) => (
                  <span
                    key={token}
                    title={`${token}: ${value}`}
                    style={{ backgroundColor: value }}
                    className="h-8 w-8 rounded-lg border border-white/20"
                  />
                ))}
              </div>
              <p className="mt-2 font-mono text-[11px] text-slate-500">
                {t.slug} · {Object.keys(t.css_tokens).length} tokens
              </p>
              <button
                onClick={() => applyTheme(t.slug)}
                className="mt-3 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-400"
              >
                {activeThemeSlug === t.slug ? "Previewing ✓" : "Preview theme"}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

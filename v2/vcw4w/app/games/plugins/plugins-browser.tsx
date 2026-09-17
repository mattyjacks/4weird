"use client";

/**
 * Plugins browser — client UI for the sandboxed mod/plugin runtime loader.
 *
 * - Paste (or demo-load) a mod manifest JSON → validated by the loader.
 * - Verified-only gate (default ON) rejects unverified mods with a reason.
 * - Enable/disable per game; registry persists to localStorage.
 * - Enabled mods mount in `allow-scripts`-only sandboxed iframes.
 * - Fail-open everywhere: bad input renders errors, never a blank page.
 */

import { useEffect, useMemo, useState } from "react";
import {
  RUNTIME_CAPABILITIES,
  deserializeRegistry,
  enabledModsForGame,
  loadModManifestJson,
  modMountFor,
  registerMod,
  removeMod,
  serializeRegistry,
  setModEnabled,
  type LoadedMod,
  type ModRegistry,
} from "@/lib/game-mod-loader";
import { MOD_IFRAME_SANDBOX } from "@/lib/game-mods";

const STORAGE_PREFIX = "4weird:plugins:";

const DEMO_MANIFEST = JSON.stringify(
  {
    name: "Ember Demo Pack",
    slug: "ember-demo-pack",
    version: "0.1.0",
    target_game: "global",
    description: "Reviewer smoke-test mod: declares one granted and one runtime-denied capability.",
    script_url: "https://4weird.com/mods/ember-demo-pack/mod.js",
    permissions: ["audio:play", "clipboard:read"],
    author: "4weird-games-lane",
    is_verified: true,
  },
  null,
  2,
);

function storageKey(gameSlug: string): string {
  return `${STORAGE_PREFIX}${gameSlug}`;
}

export function PluginsBrowser() {
  const [gameSlug, setGameSlug] = useState("gravegain3dA");
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [draft, setDraft] = useState("");
  const [registry, setRegistry] = useState<ModRegistry>({});
  const [lastLoad, setLastLoad] = useState<LoadedMod | null>(null);
  const [restoredNote, setRestoredNote] = useState<string | null>(null);

  const activeSlug = gameSlug.trim() || "gravegain3dA";

  // Restore this game's registry from localStorage (re-validated fail-open).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey(activeSlug));
      if (!raw) {
        setRegistry({});
        setRestoredNote(null);
        return;
      }
      const { registry: next, dropped } = deserializeRegistry(raw, {
        gameSlug: activeSlug,
        verifiedOnly,
      });
      setRegistry(next);
      setRestoredNote(
        dropped.length > 0
          ? `Restored with ${dropped.length} dropped entr${dropped.length === 1 ? "y" : "ies"}: ${dropped.map((d) => `${d.slug} (${d.reason})`).join(", ")}`
          : null,
      );
    } catch {
      setRegistry({});
      setRestoredNote("Stored registry was unreadable — starting empty (fail-open).");
    }
    // Re-validate on game/gate change only; registry writes persist below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlug]);

  // Persist on every registry change.
  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey(activeSlug), serializeRegistry(registry));
    } catch {
      // Storage full / blocked — the page keeps working in memory (fail-open).
    }
  }, [registry, activeSlug]);

  const entries = useMemo(() => Object.values(registry), [registry]);
  const enabled = useMemo(() => enabledModsForGame(registry, activeSlug), [registry, activeSlug]);

  function handleLoad(json: string) {
    const loaded = loadModManifestJson(json, { gameSlug: activeSlug, verifiedOnly });
    setLastLoad(loaded);
    if (!loaded.ok) return;
    const { registry: next } = registerMod(registry, JSON.parse(json) as unknown, {
      gameSlug: activeSlug,
      verifiedOnly,
    });
    setRegistry(next);
  }

  function toggle(slug: string, next: boolean) {
    setRegistry((prev) => setModEnabled(prev, slug, next));
  }

  function remove(slug: string) {
    setRegistry((prev) => removeMod(prev, slug));
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-xs uppercase tracking-widest text-cyan-300">Games · Plugins (beta)</p>
      <h1 className="mt-2 text-3xl font-bold">Sandboxed mod loader</h1>
      <p className="mt-2 text-sm text-slate-300">
        Load a community mod manifest, enable it for one game, and run it inside an{" "}
        <code className="rounded bg-white/10 px-1">allow-scripts</code>-only sandbox (
        {MOD_IFRAME_SANDBOX}). Bad manifests are rejected with a reason — the page never bricks.
      </p>

      <section aria-label="Loader controls" className="mt-6 grid gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Game slug</span>
          <input
            value={gameSlug}
            onChange={(e) => setGameSlug(e.target.value)}
            placeholder="gravegain3dA"
            className="rounded-md border border-white/15 bg-black/40 px-3 py-2 text-white"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
          />
          <span>
            Verified-only gate{" "}
            <span className="text-slate-400">(unverified mods are rejected with reason “unverified-blocked”)</span>
          </span>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Mod manifest JSON</span>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={10}
            placeholder='Paste a .4weird-mod.json manifest here…'
            className="rounded-md border border-white/15 bg-black/40 px-3 py-2 font-mono text-xs text-white"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleLoad(draft)}
            className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-400"
          >
            Validate + enable mod
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(DEMO_MANIFEST);
              handleLoad(DEMO_MANIFEST);
            }}
            className="rounded-md border border-cyan-400/50 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-400/10"
          >
            Load demo manifest
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Runtime grants only: {RUNTIME_CAPABILITIES.join(", ")}. Anything else declared is denied
          with a reason — the mod still loads without it.
        </p>
      </section>

      {restoredNote ? (
        <p role="status" className="mt-4 rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
          {restoredNote}
        </p>
      ) : null}

      {lastLoad && !lastLoad.ok ? (
        <div role="alert" className="mt-4 rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm">
          <p className="font-semibold text-red-200">Rejected: {lastLoad.reason}</p>
          <ul className="mt-1 list-disc pl-5 text-red-100/90">
            {lastLoad.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {lastLoad?.ok ? (
        <div role="status" className="mt-4 rounded-md border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
          <p className="font-semibold">Admitted “{lastLoad.manifest?.slug}” for {activeSlug}.</p>
          {lastLoad.denied.length > 0 ? (
            <ul className="mt-1 list-disc pl-5">
              {lastLoad.denied.map((d) => (
                <li key={d.capability}>
                  Denied {d.capability}: {d.reason}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1">All declared capabilities granted.</p>
          )}
        </div>
      ) : null}

      <section aria-label="Enabled mods" className="mt-8">
        <h2 className="text-xl font-bold">
          Mods for {activeSlug} ({entries.length})
        </h2>
        {entries.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">
            No mods loaded yet — paste a manifest above or try the demo manifest.
          </p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {entries.map((entry) => {
              const mount = entry.enabled ? modMountFor(entry.manifest) : null;
              return (
                <li key={entry.manifest.slug} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">
                        {entry.manifest.name}{" "}
                        <span className="text-xs text-slate-400">v{entry.manifest.version}</span>{" "}
                        {entry.manifest.is_verified ? (
                          <span className="rounded bg-emerald-400/20 px-1.5 py-0.5 text-xs text-emerald-200">verified</span>
                        ) : (
                          <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-xs text-amber-200">unverified</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        {entry.manifest.slug} → {entry.manifest.target_game}
                        {entry.manifest.author ? ` · by ${entry.manifest.author}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={entry.enabled}
                          onChange={(e) => toggle(entry.manifest.slug, e.target.checked)}
                        />
                        Enabled
                      </label>
                      <button
                        type="button"
                        onClick={() => remove(entry.manifest.slug)}
                        className="rounded-md border border-white/15 px-2 py-1 text-xs hover:bg-white/10"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  {entry.manifest.description ? (
                    <p className="mt-1 text-sm text-slate-300">{entry.manifest.description}</p>
                  ) : null}
                  {mount ? (
                    <iframe
                      src={mount.src}
                      sandbox={mount.sandbox}
                      title={mount.title}
                      className="mt-3 h-40 w-full rounded-md border border-white/15 bg-black"
                    />
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">Disabled — enable to mount the sandbox.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {enabled.length > 0 ? (
          <p className="mt-3 text-xs text-slate-400">
            {enabled.length} enabled for {activeSlug}; each runs in its own {MOD_IFRAME_SANDBOX}{" "}
            sandbox with no access to session tokens or the parent DOM.
          </p>
        ) : null}
      </section>
    </main>
  );
}

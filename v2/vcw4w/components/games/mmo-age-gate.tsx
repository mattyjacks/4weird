"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DEFAULT_DOB_ISO, checkDob } from "@/lib/age-gate";
import {
  SERVER_BAND_LABEL,
  SERVER_AGE_BANDS,
  allowedServerBandsFor,
  filterServersForPlayer,
  type ServerAgeBand,
} from "@/lib/mmo-age";

/**
 * MMO server age gate: DOB check -> band-attestation cookie -> filtered
 * server browser with a per-band content policy.
 *
 * PRIVACY: the entered date of birth lives only in this component's React
 * state. It is sent once, in the body of a single same-origin POST to
 * /api/age-verify, which uses it purely in memory to mint the httpOnly band
 * cookie and then discards it. The DOB is never written to Supabase,
 * localStorage, or any cookie, never logged, and the input is cleared from
 * state as soon as the check resolves. Only the attested *band* (kids / teens
 * / adults — never the birth date) is remembered, inside an httpOnly cookie
 * JavaScript cannot read.
 *
 * DISPLAY RULE (fail-closed): unattested guests are treated as kids — they
 * see kids servers only, exactly like lib/content-modes.ts treats
 * unknown/guest viewers. The browser hides ineligible servers via
 * filterServersForPlayer; the authoritative re-check stays server-side in
 * the join route via readAttestedBand (see app/api/age-verify/route.ts), so
 * hiding here is convenience, never the enforcement.
 */

export type MmoServerRow = {
  id: string;
  name: string;
  band: ServerAgeBand;
};

export type MmoGoreTier = {
  /** 1D: text-glyph hits (none / soft glyphs / full glyphs). */
  oneD: string;
  /** 2D: sprite particle budget + palette. */
  twoD: string;
  /** 3D: volumetric gore config, generalized from the horror content tiers. */
  threeD: string;
};

export type MmoContentPolicy = {
  label: string;
  gore: MmoGoreTier;
  /** Chat discipline for the band. Kids get preset phrases only. */
  chat: "preset" | "filtered" | "open";
  chatBlurb: string;
};

/**
 * Per-band content policy, generalizing the horror gore tiers (kid sparkles /
 * teen budget / uncut max) from 3D-only to 1D + 2D + 3D. Kids additionally
 * get preset-phrase chat (KIDS_PRESET_PHRASES) instead of free text.
 */
export const MMO_CONTENT_POLICY: Record<ServerAgeBand, MmoContentPolicy> = {
  kids: {
    label: SERVER_BAND_LABEL.kids,
    gore: {
      oneD: "No gore glyphs — hits render as soft stars.",
      twoD: "No blood particles — sparkle puffs only (budget 0).",
      threeD: "No blood — sparkle puffs only, kid palette.",
    },
    chat: "preset",
    chatBlurb: "Preset phrases only — no free text, nothing to moderate.",
  },
  teens: {
    label: SERVER_BAND_LABEL.teens,
    gore: {
      oneD: "Mild hit glyphs — no dismemberment text.",
      twoD: "Gore ON (teen budget ~160 particles, muted palette).",
      threeD: "Gore ON (teen tuning — no dismemberment set-pieces).",
    },
    chat: "filtered",
    chatBlurb: "Filtered open chat — hard swears and slurs blocked.",
  },
  adults: {
    label: SERVER_BAND_LABEL.adults,
    gore: {
      oneD: "Full hit glyphs per game script.",
      twoD: "Gore ON max (budget ~320 particles, full palette).",
      threeD: "Gore ON max (full uncut tuning — intense violence/horror only).",
    },
    chat: "open",
    chatBlurb: "Open chat — standard conduct rules still apply.",
  },
};

/** The only free-text substitutes kids may send; everything else is picker-only. */
export const KIDS_PRESET_PHRASES: readonly string[] = [
  "Hello!",
  "Good game!",
  "Let's team up!",
  "Follow me!",
  "Help!",
  "Thanks!",
  "Nice!",
  "Bye!",
] as const;

type AttestState =
  | { status: "checking" }
  | { status: "unverified" }
  | { status: "failed"; message: string }
  | { status: "attested"; band: ServerAgeBand };

async function readAttestation(): Promise<ServerAgeBand | null> {
  try {
    const res = await fetch("/api/age-verify", { cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as { band?: unknown };
    return body.band === "kids" || body.band === "teens" || body.band === "adults"
      ? body.band
      : null;
  } catch {
    return null;
  }
}

export function MmoAgeGate({
  servers,
  onJoin,
}: {
  servers: readonly MmoServerRow[];
  onJoin?: (serverId: string) => void;
}) {
  const [attest, setAttest] = useState<AttestState>({ status: "checking" });
  const [dob, setDob] = useState(DEFAULT_DOB_ISO);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    readAttestation().then((band) => {
      if (!live) return;
      setAttest(band ? { status: "attested", band } : { status: "unverified" });
    });
    return () => {
      live = false;
    };
  }, []);

  // Fail-closed display band: guests see the kids slice until attested.
  const viewerBand: ServerAgeBand =
    attest.status === "attested" ? attest.band : "kids";

  const visibleServers = useMemo(
    () =>
      filterServersForPlayer(
        viewerBand,
        (Array.isArray(servers) ? servers : []).filter((s) => (SERVER_AGE_BANDS as readonly string[]).includes(s?.band)),
      ),
    [viewerBand, servers],
  );

  const policy = MMO_CONTENT_POLICY[viewerBand];

  async function verify() {
    // Local in-memory pre-check first: the DOB never leaves this component
    // for the display decision — only the mint POST below carries it, once.
    if (!checkDob(dob, 0).ok) {
      setAttest({ status: "failed", message: "That date doesn't look right — please pick your real date of birth." });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/age-verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dob }),
      });
      const body = (await res.json()) as { band?: unknown };
      // Drop the DOB from memory the moment the check resolves.
      setDob(DEFAULT_DOB_ISO);
      if (!res.ok || (body.band !== "kids" && body.band !== "teens" && body.band !== "adults")) {
        setAttest({ status: "failed", message: "We couldn't verify that date — please try again." });
        return;
      }
      setAttest({ status: "attested", band: body.band });
    } catch {
      setDob(DEFAULT_DOB_ISO);
      setAttest({ status: "failed", message: "Verification is down — try again shortly." });
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    try {
      await fetch("/api/age-verify", { method: "DELETE" });
    } catch {
      /* cookie clear is best-effort; the display resets regardless */
    }
    setDob(DEFAULT_DOB_ISO);
    setAttest({ status: "unverified" });
  }

  if (attest.status === "checking") {
    return (
      <div className="rounded-2xl border border-white/15 bg-black p-6" data-testid="mmo-age-gate-loading">
        <p className="text-sm text-slate-300">Checking your server pass…</p>
      </div>
    );
  }

  if (attest.status === "unverified" || attest.status === "failed") {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-black p-6 sm:p-10" data-testid="mmo-age-gate">
        <p className="text-lg font-black text-white">🛡️ Server age check</p>
        <p className="mt-2 text-sm text-slate-300">
          MMO servers are rated Kids (0-12), Teens (13-17), and Adults (18+).
          Enter your date of birth once — we attest your band into a sealed
          cookie and forget the date.
        </p>
        {attest.status === "failed" && (
          <p role="alert" className="mt-3 text-sm text-amber-200">
            {attest.message}
          </p>
        )}
        <label htmlFor="mmo-age-gate-dob" className="mt-4 block text-sm font-semibold text-slate-200">
          Date of birth
        </label>
        <input
          id="mmo-age-gate-dob"
          name="dateOfBirth"
          type="date"
          autoComplete="bday"
          className="mt-2 rounded-lg border border-white/15 bg-white/[.06] px-3 py-2 text-white [color-scheme:dark]"
          value={dob}
          min="1900-01-01"
          onChange={(e) => setDob(e.target.value)}
        />
        <p className="mt-3 text-xs text-slate-500">
          🔒 Your date of birth is checked in memory only and is never stored anywhere — not in our database, not in
          your browser. Only the band (kids / teens / adults) is remembered, sealed server-side.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={verify}
            disabled={busy}
            className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
          >
            {busy ? "Verifying…" : "Verify my band"}
          </button>
          <Link
            href="/games"
            className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold hover:bg-white/10"
          >
            Back to games
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/15 bg-black p-6 sm:p-10" data-testid="mmo-server-browser">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-lg font-black text-white">
          🛰️ Servers for {SERVER_BAND_LABEL[attest.band]}
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold hover:bg-white/10"
        >
          Re-verify
        </button>
      </div>
      <p className="mt-2 text-sm text-slate-300">
        Showing {(visibleServers ?? []).length} of {(servers ?? []).length} servers — ineligible bands are hidden
        (adults see all {(allowedServerBandsFor("adults") ?? []).length}, teens see{" "}
        {(allowedServerBandsFor("teens") ?? []).length}, kids see {(allowedServerBandsFor("kids") ?? []).length}).
        Entry is re-checked server-side when you join.
      </p>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[.03] p-4" data-testid="mmo-content-policy">
        <p className="text-sm font-bold text-white">Content policy — {policy.label}</p>
        <ul className="mt-2 space-y-1 text-xs text-slate-300">
          <li><b className="text-white">1D:</b> {policy.gore.oneD}</li>
          <li><b className="text-white">2D:</b> {policy.gore.twoD}</li>
          <li><b className="text-white">3D:</b> {policy.gore.threeD}</li>
          <li><b className="text-white">Chat:</b> {policy.chatBlurb}</li>
        </ul>
        {policy.chat === "preset" && (
          <div className="mt-3 flex flex-wrap gap-1.5" data-testid="mmo-kids-phrases">
            {(Array.isArray(KIDS_PRESET_PHRASES) ? KIDS_PRESET_PHRASES : []).map((phrase, index) => (
              <span key={String(phrase ?? "") || index} className="rounded-full border border-white/15 px-3 py-1 text-xs text-slate-200">
                {String(phrase ?? "")}
              </span>
            ))}
          </div>
        )}
      </div>

      {(visibleServers ?? []).length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No servers in your band right now — check back soon.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {(Array.isArray(visibleServers) ? visibleServers : []).map((server, index) => (
            <li
              key={server?.id ?? index}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[.03] px-4 py-3"
              data-testid={`mmo-server-${String(server?.id ?? index)}`}
            >
              <div>
                <p className="text-sm font-bold text-white">{String(server?.name ?? "—")}</p>
                <p className="text-xs text-slate-400">{SERVER_BAND_LABEL[server?.band as ServerAgeBand] ?? "—"}</p>
              </div>
              <button
                type="button"
                onClick={() => onJoin?.(String(server?.id ?? ""))}
                className="rounded-full bg-cyan-300 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-200"
              >
                Join
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

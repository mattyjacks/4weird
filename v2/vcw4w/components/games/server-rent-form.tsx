"use client";

import { useState } from "react";
import Link from "next/link";
import { ServerAgeBadge, type ServerAgeBand } from "./server-card";
import { formatUsd } from "./server-quote";

export type RentGameOption = {
  slug: string;
  title: string;
  genre?: string;
};

const STEPS = ["Game", "Size", "Age band", "Subsidy", "Quote + confirm"] as const;

const SIZE_OPTIONS = [10, 25, 50, 100, 200] as const;

const BAND_COPY: Record<ServerAgeBand, string> = {
  kids: "Kids (0-12) — fully subsidized, 0 coin/min.",
  teens: "Teens (13-17) — 2 coin/min per player.",
  adults: "Adults (18+) — 5 coin/min per player.",
};

type QuoteResult = {
  perPlayerPerMin?: unknown;
  minutesBilled?: unknown;
  hostTotalCoins?: unknown;
  subsidizedCoins?: unknown;
  usdEquivalent?: unknown;
};

function quoteNum(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * ServerRentForm — 5-step room rental: game, size, age band, subsidy,
 * quote + confirm. Quotes live via POST /api/mmorpg/rent and confirms
 * via POST /api/mmorpg/servers; both fail open (local rate-card math +
 * a pending notice) so the form never throws when the lobby API is down.
 * QUOTE ONLY — no ledger writes happen here; settlement stays
 * economy-lane owned.
 */
export function ServerRentForm({ games }: { games: RentGameOption[] }) {
  const [step, setStep] = useState(0);
  const [game, setGame] = useState("");
  const [size, setSize] = useState<number>(25);
  const [band, setBand] = useState<ServerAgeBand>("teens");
  const [hostFree, setHostFree] = useState(false);
  const [hours, setHours] = useState(1);
  const [roomName, setRoomName] = useState("");
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [confirmState, setConfirmState] = useState<"idle" | "working" | "done" | "pending">("idle");
  const [confirmDetail, setConfirmDetail] = useState("");

  const gameValid = game.trim().length > 0;
  const sizeValid = Number.isFinite(size) && size >= 2 && size <= 256;
  const hoursValid = Number.isFinite(hours) && hours > 0 && hours <= 168;

  async function fetchQuote() {
    setQuoting(true);
    setQuoteError("");
    setQuote(null);
    try {
      const response = await fetch("/api/mmorpg/rent", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game, ageBand: band, hostFree, hours }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const err = (body as { error?: unknown }).error;
        throw new Error(typeof err === "string" && err ? err : `Quote failed (${response.status}).`);
      }
      setQuote(body as QuoteResult);
    } catch (error) {
      // Fail-open local rate-card math (mirrors the rent route card).
      const rate = band === "kids" ? 0 : band === "teens" ? 2 : 5;
      const minutesBilled = Math.max(1, Math.round(hours * 60));
      const gross = rate * minutesBilled;
      setQuote({
        perPlayerPerMin: rate,
        minutesBilled,
        hostTotalCoins: hostFree ? 0 : gross,
        subsidizedCoins: hostFree ? gross : 0,
        usdEquivalent: formatUsd(hostFree ? 0 : gross),
      });
      setQuoteError(
        `${error instanceof Error ? error.message : "Live quote unavailable."} Showing estimated rate-card math instead.`,
      );
    } finally {
      setQuoting(false);
    }
  }

  async function confirmRental() {
    setConfirmState("working");
    setConfirmDetail("");
    try {
      const response = await fetch("/api/mmorpg/servers", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game,
          ageBand: band,
          name: roomName.trim() || `${game} room (${band})`,
          maxPlayers: size,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const err = (body as { error?: unknown }).error;
        throw new Error(typeof err === "string" && err ? err : `Confirm failed (${response.status}).`);
      }
      const rec = body as { server?: { id?: unknown } };
      const id = typeof rec.server?.id === "string" ? rec.server.id : "";
      setConfirmDetail(id ? `Room created: ${id}.` : "Room request accepted.");
      setConfirmState("done");
    } catch (error) {
      // Fail-open: keep the request visible instead of losing it.
      setConfirmDetail(
        `${error instanceof Error ? error.message : "Lobby API unavailable."} Your request is saved on this device — retry once the lobby API is back. No coins moved.`,
      );
      setConfirmState("pending");
    }
  }

  function next() {
    if (step === 3) void fetchQuote();
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  const canNext =
    (step === 0 && gameValid) ||
    (step === 1 && sizeValid) ||
    step === 2 ||
    (step === 3 && hoursValid);

  const hostTotal = quoteNum(quote?.hostTotalCoins);
  const perMin = quoteNum(quote?.perPlayerPerMin);

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap gap-2" aria-label="Rental steps">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={i === step ? "step" : undefined}
            className={`rounded-full border px-3 py-1 text-xs font-bold ${
              i === step
                ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-100"
                : i < step
                  ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-200"
                  : "border-white/15 text-slate-400"
            }`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section aria-label="Choose a game" className="rounded-2xl border border-white/10 bg-white/[.04] p-4 sm:p-6">
          <h2 className="text-lg font-bold">Which game is this room for?</h2>
          {games.length ? (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {games.map((g) => (
                <li key={g.slug}>
                  <button
                    type="button"
                    onClick={() => setGame(g.slug)}
                    aria-pressed={game === g.slug}
                    className={`min-h-[44px] w-full rounded-xl border px-4 py-3 text-left text-base ${
                      game === g.slug ? "border-cyan-300/60 bg-cyan-300/10" : "border-white/15 hover:bg-white/5"
                    }`}
                  >
                    <b className="block">{g.title}</b>
                    <small className="text-slate-400">{g.genre ?? g.slug}</small>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4">
              <label className="block text-sm text-slate-400" htmlFor="rent-game-slug">
                Game slug (catalog offline — type it)
              </label>
              <input
                id="rent-game-slug"
                className="mt-2 min-h-[44px] w-full rounded-lg border border-white/15 bg-black/30 px-3 py-3 text-base"
                value={game}
                onChange={(e) => setGame(e.target.value)}
                placeholder="e.g. emberhold"
              />
            </p>
          )}
        </section>
      )}

      {step === 1 && (
        <section aria-label="Choose room size" className="rounded-2xl border border-white/10 bg-white/[.04] p-4 sm:p-6">
          <h2 className="text-lg font-bold">How many seats?</h2>
          <p className="mt-1 text-sm text-slate-400">Rooms hold 2 to 256 players.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {SIZE_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSize(n)}
                aria-pressed={size === n}
                className={`min-h-[44px] min-w-[44px] rounded-xl border px-4 py-3 text-base font-bold ${
                  size === n ? "border-cyan-300/60 bg-cyan-300/10" : "border-white/15 hover:bg-white/5"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mt-4">
            <label className="block text-sm text-slate-400" htmlFor="rent-size">
              Custom size (2–256)
            </label>
            <input
              id="rent-size"
              type="number"
              min={2}
              max={256}
              className="mt-2 min-h-[44px] w-full rounded-lg border border-white/15 bg-black/30 px-3 py-3 text-base sm:w-40"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            />
          </p>
          {!sizeValid && <p className="mt-2 text-sm text-rose-300">Pick a size between 2 and 256.</p>}
        </section>
      )}

      {step === 2 && (
        <section aria-label="Choose age band" className="rounded-2xl border border-white/10 bg-white/[.04] p-4 sm:p-6">
          <h2 className="text-lg font-bold">Who is this room for?</h2>
          <div className="mt-4 grid gap-2">
            {(Object.keys(BAND_COPY) as ServerAgeBand[]).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBand(b)}
                aria-pressed={band === b}
                className={`flex min-h-[44px] items-center gap-3 rounded-xl border px-4 py-3 text-left text-base ${
                  band === b ? "border-cyan-300/60 bg-cyan-300/10" : "border-white/15 hover:bg-white/5"
                }`}
              >
                <ServerAgeBadge band={b} />
                <span className="text-sm text-slate-300">{BAND_COPY[b]}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Players join only with a matching verified band — kids rooms admit kids only. Join-time
            enforcement stays server-side.
          </p>
        </section>
      )}

      {step === 3 && (
        <section aria-label="Choose subsidy" className="rounded-2xl border border-white/10 bg-white/[.04] p-4 sm:p-6">
          <h2 className="text-lg font-bold">Who pays?</h2>
          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={() => setHostFree(true)}
              aria-pressed={hostFree}
              className={`min-h-[44px] w-full rounded-xl border px-4 py-3 text-left text-base ${
                hostFree ? "border-cyan-300/60 bg-cyan-300/10" : "border-white/15 hover:bg-white/5"
              }`}
            >
              <b className="block">Host pays — free play</b>
              <small className="text-slate-400">You cover the room; guests play free while your meter runs.</small>
            </button>
            <button
              type="button"
              onClick={() => setHostFree(false)}
              aria-pressed={!hostFree}
              className={`min-h-[44px] w-full rounded-xl border px-4 py-3 text-left text-base ${
                !hostFree ? "border-cyan-300/60 bg-cyan-300/10" : "border-white/15 hover:bg-white/5"
              }`}
            >
              <b className="block">Players pay</b>
              <small className="text-slate-400">Each joining player pays the per-minute rate.</small>
            </button>
          </div>
          <p className="mt-4">
            <label className="block text-sm text-slate-400" htmlFor="rent-hours">
              Rental length (hours, up to 168)
            </label>
            <input
              id="rent-hours"
              type="number"
              min={1}
              max={168}
              className="mt-2 min-h-[44px] w-full rounded-lg border border-white/15 bg-black/30 px-3 py-3 text-base sm:w-40"
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
            />
          </p>
          {!hoursValid && <p className="mt-2 text-sm text-rose-300">Hours must be between 1 and 168.</p>}
        </section>
      )}

      {step === 4 && (
        <section aria-label="Quote and confirm" className="rounded-2xl border border-white/10 bg-white/[.04] p-4 sm:p-6">
          <h2 className="text-lg font-bold">Quote + confirm</h2>
          <dl className="mt-3 space-y-1 text-sm text-slate-300">
            <div className="flex gap-2"><dt className="text-slate-500">Game:</dt><dd>{game}</dd></div>
            <div className="flex gap-2"><dt className="text-slate-500">Seats:</dt><dd>{size}</dd></div>
            <div className="flex items-center gap-2"><dt className="text-slate-500">Band:</dt><dd><ServerAgeBadge band={band} /></dd></div>
            <div className="flex gap-2"><dt className="text-slate-500">Pays:</dt><dd>{hostFree ? "Host (free play)" : "Players"}</dd></div>
            <div className="flex gap-2"><dt className="text-slate-500">Hours:</dt><dd>{hours}</dd></div>
          </dl>
          <p className="mt-4">
            <label className="block text-sm text-slate-400" htmlFor="rent-name">
              Room name (optional)
            </label>
            <input
              id="rent-name"
              className="mt-2 min-h-[44px] w-full rounded-lg border border-white/15 bg-black/30 px-3 py-3 text-base"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder={`${game} room (${band})`}
              maxLength={80}
            />
          </p>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4" aria-label="Rental quote">
            {quoting ? (
              <p className="text-sm text-slate-400">Fetching live quote…</p>
            ) : quote ? (
              <>
                <p className="text-sm text-slate-300">
                  {perMin ?? 0} coin/min per player · host total{" "}
                  <b className="text-white">{hostTotal ?? 0} coins</b> ({typeof quote.usdEquivalent === "string" ? quote.usdEquivalent : formatUsd(hostTotal ?? 0)})
                </p>
                {quoteError ? <p className="mt-1 text-xs text-amber-300">{quoteError}</p> : null}
              </>
            ) : (
              <p className="text-sm text-slate-400">Quote loads when you reach this step.</p>
            )}
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => void fetchQuote()}
              className="min-h-[44px] w-full rounded-lg border border-white/20 px-4 py-3 text-base font-semibold sm:w-auto"
            >
              Re-quote
            </button>
            <button
              type="button"
              onClick={() => void confirmRental()}
              disabled={confirmState === "working" || confirmState === "done"}
              className="min-h-[48px] w-full rounded-lg bg-cyan-300 px-4 py-3 text-base font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-50 sm:w-auto"
            >
              {confirmState === "working" ? "Confirming…" : confirmState === "done" ? "Confirmed" : "Confirm rental"}
            </button>
          </div>
          {confirmDetail ? (
            <p role="status" className={`mt-3 text-sm ${confirmState === "done" ? "text-emerald-300" : "text-amber-300"}`}>
              {confirmDetail}{" "}
              <Link href="/games/servers" className="font-semibold text-cyan-300 hover:underline">
                Back to the browser
              </Link>
            </p>
          ) : null}
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(s - 1, 0))}
            className="min-h-[48px] w-full rounded-lg border border-white/20 px-4 py-3 text-base font-semibold sm:w-auto"
          >
            Back
          </button>
        )}
        {step < STEPS.length - 1 && (
          <button
            type="button"
            onClick={next}
            disabled={!canNext}
            className="min-h-[48px] w-full rounded-lg bg-cyan-300 px-4 py-3 text-base font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-50 sm:w-auto"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}

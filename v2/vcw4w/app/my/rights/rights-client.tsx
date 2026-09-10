"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const CONFIRM_PHRASE = "DELETE MY DATA";
const SUPPORT_EMAIL = "matt@mattyjacks.com";

type Pending = {
  requestId: string;
  expiresAt: string;
  cooldownSeconds: number;
  sharedClanWarning?: string | null;
};

export function RightsClient({ email }: { email: string }) {
  const router = useRouter();
  const [exportBusy, setExportBusy] = useState(false);
  const [exportMsg, setExportMsg] = useState("");
  const [reqBusy, setReqBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [phrase, setPhrase] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!pending || cooldownLeft <= 0) return;
    const t = setTimeout(() => setCooldownLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [pending, cooldownLeft]);

  async function exportData() {
    setExportBusy(true);
    setExportMsg("");
    setError("");
    try {
      const res = await fetch("/api/my/rights?action=export", { credentials: "same-origin" });
      const body = (await res.json()) as Record<string, unknown>;
      if (!res.ok || body.success !== true) {
        setError((body.error as string | undefined) ?? `Export failed (HTTP ${res.status}).`);
        return;
      }
      const blob = new Blob([JSON.stringify(body, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `4weird-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setExportMsg("Your data file downloaded. It contains the personal data listed below, in portable JSON.");
    } catch {
      setError("Export failed. Check your connection and try again.");
    } finally {
      setExportBusy(false);
    }
  }

  async function requestDelete() {
    setReqBusy(true);
    setError("");
    try {
      const res = await fetch("/api/my/rights", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request-delete" }),
      });
      const body = (await res.json()) as {
        success?: boolean;
        error?: string;
        requestId?: string;
        expiresAt?: string;
        cooldownSeconds?: number;
        sharedClanWarning?: string | null;
      };
      if (!res.ok || body.success !== true || !body.requestId || !body.expiresAt) {
        setError(body.error ?? `Could not open a deletion request (HTTP ${res.status}).`);
        return;
      }
      setPending({
        requestId: body.requestId,
        expiresAt: body.expiresAt,
        cooldownSeconds: body.cooldownSeconds ?? 30,
        sharedClanWarning: body.sharedClanWarning ?? null,
      });
      setCooldownLeft(body.cooldownSeconds ?? 30);
      setPhrase("");
    } catch {
      setError("Could not open a deletion request. Check your connection and try again.");
    } finally {
      setReqBusy(false);
    }
  }

  async function confirmDelete() {
    if (!pending || phrase !== CONFIRM_PHRASE || cooldownLeft > 0) return;
    if (!window.confirm("This permanently deletes your account and data. This cannot be undone. Continue?")) return;
    setConfirmBusy(true);
    setError("");
    try {
      const res = await fetch("/api/my/rights", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm-delete", requestId: pending.requestId, confirmation: phrase }),
      });
      const body = (await res.json()) as { success?: boolean; error?: string; deleted?: boolean };
      if (!res.ok || body.success !== true || !body.deleted) {
        setError(body.error ?? `Deletion failed (HTTP ${res.status}).`);
        return;
      }
      setDone(true);
      setPending(null);
      try {
        await createClient().auth.signOut();
      } catch {
        /* server already cleared the session */
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Deletion failed. Check your connection and try again.");
    } finally {
      setConfirmBusy(false);
    }
  }

  const btn =
    "rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50";
  const btnDanger =
    "rounded-lg bg-red-500 px-4 py-2 font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50";
  const btnGhost =
    "rounded-lg border border-white/20 px-4 py-2 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="mt-10 space-y-8">
      {error && (
        <p role="alert" className="rounded-lg border border-red-400/40 bg-red-950/60 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <section className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-bold text-white">1. Download your data</h2>
        <p className="mt-2 text-sm text-slate-300">
          Access and portability (GDPR Arts. 15, 20 and U.S. state-law access rights). Signed in as{" "}
          <span className="font-semibold text-white">{email}</span>. The download covers your profile, settings,
          game saves, telemetry, friends and messages, Clans content, bot identities (never key secrets), coin
          ledger, referrals, rentals, and workspace memberships we can read under your session. Limited to 5 exports
          per hour to stop bulk harvesting.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className={btn} disabled={exportBusy} onClick={exportData}>
            {exportBusy ? "Preparing…" : "Download my data (JSON)"}
          </button>
          {exportMsg && <p className="text-sm text-emerald-300">{exportMsg}</p>}
        </div>
      </section>

      <section className="rounded-xl border border-red-400/30 bg-red-950/20 p-6">
        <h2 className="text-xl font-bold text-white">2. Delete my data and account</h2>
        <p className="mt-2 text-sm text-slate-300">
          Erasure (GDPR Art. 17 and U.S. state-law deletion rights). This permanently erases your profile, saves,
          social graph, Clans posts, bot identities and keys, coin ledger, referrals, rentals, and memberships, then
          deletes the login itself. <strong className="text-white">Only you — signed in as this account — can delete
          this account.</strong> Requests for anyone else’s data are refused here. Confirmed deletions are final:
          unspent coins are forfeited, and safety evidence or financial records the law requires us to keep are
          retained in minimal form as explained in the Privacy Policy.
        </p>

        {!pending && !done && (
          <div className="mt-4">
            <button type="button" className={btnDanger} disabled={reqBusy} onClick={requestDelete}>
              {reqBusy ? "Opening request…" : "Start deletion request"}
            </button>
            <p className="mt-2 text-xs text-slate-400">
              Opens a 30-minute deletion window. At most 3 deletion requests per account per 30 days.
            </p>
          </div>
        )}

        {pending && !done && (
          <div className="mt-4 space-y-3 rounded-lg border border-white/10 bg-black/40 p-4">
            <p className="text-sm text-slate-200">
              Deletion window open until <span className="font-mono">{new Date(pending.expiresAt).toLocaleString()}</span>.
              {cooldownLeft > 0 ? (
                <> You can confirm in <span className="font-semibold text-white">{cooldownLeft}s</span> — this pause stops accidental and automated deletions.</>
              ) : (
                <> You can confirm now.</>
              )}
            </p>
            {pending.sharedClanWarning && (
              <p role="alert" className="text-sm text-amber-300">{pending.sharedClanWarning}</p>
            )}
            <label className="block text-sm text-slate-300" htmlFor="delete-phrase">
              Type <span className="font-mono font-bold text-white">{CONFIRM_PHRASE}</span> exactly, then confirm:
            </label>
            <input
              id="delete-phrase"
              type="text"
              autoComplete="off"
              className="w-full rounded-lg border border-white/20 bg-slate-900 px-3 py-2 font-mono text-white placeholder:text-slate-500"
              placeholder={CONFIRM_PHRASE}
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className={btnDanger}
                disabled={confirmBusy || phrase !== CONFIRM_PHRASE || cooldownLeft > 0}
                onClick={confirmDelete}
              >
                {confirmBusy ? "Deleting…" : "Yes, permanently delete my account"}
              </button>
              <button type="button" className={btnGhost} disabled={confirmBusy} onClick={() => { setPending(null); setPhrase(""); }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {done && (
          <p className="mt-4 text-sm text-emerald-300">
            Your account and data were deleted. You have been signed out.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-bold text-white">3. Correct your data</h2>
        <p className="mt-2 text-sm text-slate-300">
          Rectification (GDPR Art. 16). Fix your display name and handle anytime in{" "}
          <a className="text-cyan-200 underline" href="/account">/account</a>. For anything you cannot edit yourself,
          email <a className="text-cyan-200 underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from your
          account email.
        </p>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-bold text-white">4. Someone else’s account — special cases only</h2>
        <p className="mt-2 text-sm text-slate-300">
          The buttons above work <strong className="text-white">only for your own signed-in account</strong> and this
          is enforced technically, not just by policy. If you are family or a legal representative of a{" "}
          <strong className="text-white">deceased</strong> or incapacitated user asking for deletion, or an authorized
          agent with written permission, email{" "}
          <a className="text-cyan-200 underline" href={`mailto:${SUPPORT_EMAIL}?subject=Privacy%20request%20—%20special%20case`}>{SUPPORT_EMAIL}</a>{" "}
          from a verifiable address with: the account’s email/handle, your relationship, what you are asking for, and
          proof of authority (for a deceased user: death certificate plus proof of kinship or legal appointment; for
          agents: signed permission plus identity verification of the principal). We verify every such request, ask
          only for the minimum extra proof needed, and act only when satisfied it is legitimate. Requests without
          authority are refused. We respond within one month (GDPR) or 45 days (U.S. state laws), extendable for
          complexity.
        </p>
      </section>
    </div>
  );
}

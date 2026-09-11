"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DEFAULT_DOB_ISO,
  RATING_LABEL,
  checkDob,
  formatWait,
  type AgeRating,
} from "@/lib/age-gate";

/**
 * AgeGate — date-of-birth check shown before age-restricted games.
 *
 * PRIVACY: the entered date of birth lives only in this component's React
 * state. It is never sent to any API, never written to Supabase, never put
 * in localStorage or cookies, and is discarded the moment the player
 * passes, fails-and-retries, or leaves the page. Only the in-memory
 * pass/fail outcome is reported to the parent via onPass.
 */
export function AgeGate({
  rating,
  title,
  onPass,
}: {
  rating: Extract<AgeRating, "teens" | "adults">;
  title: string;
  onPass: () => void;
}) {
  const requiredAge = rating === "adults" ? 18 : 13;
  const [dob, setDob] = useState(DEFAULT_DOB_ISO);
  const [failed, setFailed] = useState<{ wait: string; eligibleDateISO: string } | null>(null);
  const [invalid, setInvalid] = useState(false);

  function verify() {
    const result = checkDob(dob, requiredAge);
    if (result.ok) {
      onPass();
      return;
    }
    if (result.reason === "too-young") {
      setInvalid(false);
      setFailed({ wait: formatWait(result.wait), eligibleDateISO: result.eligibleDateISO });
    } else {
      setFailed(null);
      setInvalid(true);
    }
  }

  function tryAgain() {
    setFailed(null);
    setInvalid(false);
    setDob(DEFAULT_DOB_ISO);
  }

  if (failed) {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-black p-6 sm:p-10" role="alert" data-testid="age-gate-failed">
        <p className="text-lg font-black text-white">🔞 Not yet — come back soon!</p>
        <p className="mt-2 text-sm text-slate-300">
          {title} is rated <b className="text-white">{RATING_LABEL[rating]}</b>. Based on the date you entered,
          you can play it in <b className="text-white">{failed.wait}</b> (on {failed.eligibleDateISO}).
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Your date of birth was only used for this check and was never stored anywhere.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={tryAgain}
            className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200"
          >
            Try Again
          </button>
          <Link
            href="/games"
            className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold hover:bg-white/10"
          >
            Browse other games
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/15 bg-black p-6 sm:p-10" data-testid="age-gate">
      <p className="text-lg font-black text-white">
        🔞 Age check — {title} is rated {RATING_LABEL[rating]}
      </p>
      <p className="mt-2 text-sm text-slate-300">
        {rating === "adults"
          ? "This game is for players 18 and older. Please enter your date of birth to continue."
          : "Kids Mode is on: this game needs players 13 and older. Please enter your date of birth to continue."}
      </p>
      <label htmlFor="age-gate-dob" className="mt-4 block text-sm font-semibold text-slate-200">
        Date of birth
      </label>
      <input
        id="age-gate-dob"
        name="dateOfBirth"
        type="date"
        autoComplete="bday"
        className="mt-2 rounded-lg border border-white/15 bg-white/[.06] px-3 py-2 text-white [color-scheme:dark]"
        value={dob}
        min="1900-01-01"
        onChange={(e) => {
          setDob(e.target.value);
          setInvalid(false);
        }}
      />
      {invalid && (
        <p role="alert" className="mt-2 text-sm text-amber-200">
          That date doesn&apos;t look right — please pick your real date of birth from the calendar.
        </p>
      )}
      <p className="mt-3 text-xs text-slate-500">
        🔒 Your date of birth is checked on this device only and is never stored — not in our database, not in your
        browser. It disappears as soon as this check is done.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={verify}
          className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200"
        >
          Verify my age
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

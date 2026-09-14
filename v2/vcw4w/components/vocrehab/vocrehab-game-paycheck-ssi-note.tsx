"use client";

import Link from "next/link";

/**
 * VocrehabPaycheckSsiNote — display-only benefits-context note for
 * paycheck results. Qualitative work-incentives explainer only: no
 * benefit amounts, thresholds, or formulas are stated here because
 * SSI parameters drift over time (plan section 19.1).
 */
export function VocrehabPaycheckSsiNote() {
  return (
    <aside
      aria-label="Working while receiving SSI benefits"
      className="vocrehab-paycheck-ssi-note"
    >
      <h2 className="vocrehab-paycheck-ssi-note-title">
        Earning a paycheck while on SSI
      </h2>
      <p className="vocrehab-paycheck-ssi-note-body">
        A paycheck and SSI can go together. Earning wages does not
        automatically end SSI — work incentives may let you keep some
        earnings alongside your benefit while you try working.
      </p>
      <p className="vocrehab-paycheck-ssi-note-body">
        The details depend on your situation, so report wages and ask
        about work incentives before you assume a work month is not
        worth it. A benefits counselor or the decide guide can walk
        through your options.
      </p>
      <Link
        className="vocrehab-paycheck-ssi-note-link"
        href="/vocrehab/decide/ssi"
      >
        Learn about SSI work incentives
      </Link>
      <style jsx>{`
        .vocrehab-paycheck-ssi-note {
          border: 1px solid var(--vocrehab-line, #334155);
          border-radius: 0.75rem;
          padding: 1rem 1.25rem;
          background: var(--vocrehab-panel, #0f172a);
        }
        .vocrehab-paycheck-ssi-note-title {
          margin: 0 0 0.5rem;
          font-size: 1rem;
          font-weight: 700;
        }
        .vocrehab-paycheck-ssi-note-body {
          margin: 0 0 0.75rem;
          line-height: 1.55;
        }
        .vocrehab-paycheck-ssi-note-link {
          display: inline-block;
          text-decoration: underline;
          text-underline-offset: 0.2em;
          border-radius: 0.375rem;
        }
        .vocrehab-paycheck-ssi-note-link:focus-visible {
          outline: 3px solid currentColor;
          outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .vocrehab-paycheck-ssi-note,
          .vocrehab-paycheck-ssi-note-link {
            transition: none;
            animation: none;
          }
        }
      `}</style>
    </aside>
  );
}

import type { Metadata } from "next";
import { EasyDncChecker } from "@/components/easydnc/easydnc-checker";
import { SingleLookup } from "./single-lookup";
import {
  SAFE_HARBOR_DAYS,
  FTC_TSR_MAX_FINE_PER_CALL,
  TCPA_STATUTORY_FINE_MIN,
  TCPA_STATUTORY_FINE_MAX,
} from "@/lib/easydnc";

export const metadata: Metadata = {
  title: "EasyDNC Checker | 4weird Telephony Compliance",
  description:
    "National Do Not Call Registry checker and scrubbing suite. Scrub phone lists every 31 days to comply with FTC TSR Safe Harbor and avoid fines up to $51,744 per call.",
  alternates: { canonical: "/easydnc" },
};

const TOOLTIP =
  "FTC Telemarketing Sales Rule 16 CFR § 310.4(b)(3)(iv): scrub against the National Registry no more than 31 days before calling to keep the Safe Harbor defense. Scrub weekly — consumers register continuously. MattyJacks LLC provides this tool as-is and assumes no liability for contacting DNC numbers.";

export default function EasyDncPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-4">
        {/* Compact inline header */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-300">
            4WEIRD // TELEPHONY COMPLIANCE
          </p>
          <h1 className="text-xl font-black tracking-tight">
            EasyDNC <span className="text-cyan-300">Registry Checker</span>
          </h1>
        </div>

        {/* 28px FTC pill banner + tooltip */}
        <div className="mt-2 flex h-7 items-center gap-2 overflow-visible rounded-full border border-amber-300/30 bg-amber-300/[.07] px-3 text-[11px] text-amber-100">
          <span aria-hidden="true" className="shrink-0">
            ⚠
          </span>
          <p className="truncate">
            <strong>FTC TSR Safe Harbor · {SAFE_HARBOR_DAYS}-day rule</strong>
            <span className="text-amber-100/70">
              {" "}
              — scrub weekly · fines up to ${FTC_TSR_MAX_FINE_PER_CALL.toLocaleString()} (TSR) · $
              {TCPA_STATUTORY_FINE_MIN}–${TCPA_STATUTORY_FINE_MAX.toLocaleString()} (TCPA) per call
            </span>
          </p>
          <span className="group relative ml-auto inline-flex shrink-0 cursor-help items-center rounded-full border border-amber-300/40 px-1.5 text-[10px] font-bold text-amber-200">
            ⓘ FTC
            <span
              role="tooltip"
              className="pointer-events-none absolute right-0 top-6 z-20 hidden w-72 whitespace-normal rounded-xl border border-white/10 bg-slate-900 p-3 text-left text-[11px] font-normal leading-relaxed text-slate-300 shadow-xl group-hover:block group-focus-within:block"
            >
              {TOOLTIP}
            </span>
          </span>
        </div>

        {/* Above the fold: bulk dropzone flow + single-phone lookup */}
        <div className="mt-3 grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <EasyDncChecker />
          </div>
          <aside className="space-y-3 lg:sticky lg:top-3">
            <SingleLookup />
            {/* Dense 4-col ledger schema legend */}
            <div className="rounded-xl border border-white/10 bg-white/[.02] p-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Results ledger
              </h2>
              <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[10px] font-semibold">
                <span className="rounded-md bg-slate-900 px-1 py-1 text-slate-200">Phone</span>
                <span className="rounded-md bg-slate-900 px-1 py-1 text-emerald-300">
                  DNC Clean / Blacklisted
                </span>
                <span className="rounded-md bg-slate-900 px-1 py-1 text-cyan-300">
                  Registry Match
                </span>
                <span className="rounded-md bg-slate-900 px-1 py-1 text-amber-300">
                  Litigator flag
                </span>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                Every scrubbed row exports with DNC_STATUS + DATE_CHECKED_UTC. Use the Clean CSV
                before dialing.
              </p>
            </div>
          </aside>
        </div>

        {/* Regulatory education — collapsed, full text retained */}
        <details className="group mt-4 rounded-xl border border-white/10 bg-white/[.02] px-4 py-2.5">
          <summary className="cursor-pointer text-sm font-bold text-white marker:text-cyan-300">
            Understanding Do Not Call Regulations{" "}
            <span className="font-normal text-slate-500">(31-day Safe Harbor · fines per call)</span>
          </summary>
          <div className="grid gap-3 py-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[.02] p-4">
              <h3 className="text-sm font-bold text-cyan-300">
                The 31-Day FTC TSR Safe Harbor Rule
              </h3>
              <p className="mt-1.5 text-xs text-slate-300">
                Under the Federal Trade Commission&apos;s Telemarketing Sales Rule (16 CFR §
                310.4(b)(3)(iv)), telemarketers must access and scrub against the National
                Registry no more than <strong>{SAFE_HARBOR_DAYS} days</strong> prior to placing
                any call to maintain the affirmative Safe Harbor defense. Calls placed to numbers
                checked more than 31 days prior forfeit safe harbor protection completely.
              </p>
              <p className="mt-2 text-[11px] font-semibold text-emerald-400">
                💡 4weird Recommendation: Scrub your lists weekly (every 7 days) because consumers
                register new numbers continuously.
              </p>
            </div>
            <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-4">
              <h3 className="text-sm font-bold text-red-300">Real Government Fines Per Call</h3>
              <p className="mt-1.5 text-xs text-slate-300">
                The penalties for non-compliance are severe and strictly enforced:
              </p>
              <ul className="mt-2 space-y-1.5 text-[11px] text-slate-300">
                <li>
                  • <strong className="text-white">FTC TSR Civil Penalty:</strong> Up to{" "}
                  <strong className="text-red-300">
                    ${FTC_TSR_MAX_FINE_PER_CALL.toLocaleString()} USD
                  </strong>{" "}
                  per violation / per call.
                </li>
                <li>
                  • <strong className="text-white">TCPA Statutory Damages:</strong>{" "}
                  <strong className="text-red-300">${TCPA_STATUTORY_FINE_MIN} USD</strong> per
                  call (strict liability), and up to{" "}
                  <strong className="text-red-300">
                    ${TCPA_STATUTORY_FINE_MAX.toLocaleString()} USD
                  </strong>{" "}
                  per call for willful or knowing violations.
                </li>
              </ul>
            </div>
          </div>
        </details>
      </div>
    </main>
  );
}

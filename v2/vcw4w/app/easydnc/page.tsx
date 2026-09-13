import type { Metadata } from "next";
import { EasyDncChecker } from "@/components/easydnc/easydnc-checker";
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

export default function EasyDncPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
        {/* Header */}
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300 sm:text-sm">
            4WEIRD // TELEPHONY COMPLIANCE
          </p>
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
            EasyDNC <span className="text-cyan-300">Registry Checker</span>
          </h1>
          <p className="max-w-3xl text-base text-slate-300 sm:text-lg">
            Scrub telephone leads and Outscraper directory data against the United States National Do Not Call
            Registry. Protect your business from statutory fines, maintain FTC Safe Harbor defense, and pay seamlessly with Vibe Coins.
          </p>
        </div>

        {/* Interactive Checker */}
        <div className="mt-12">
          <EasyDncChecker />
        </div>

        {/* Regulatory Education Section */}
        <div className="mt-20 border-t border-white/10 pt-12">
          <h2 className="text-2xl font-bold text-white">Understanding Do Not Call Regulations</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[.02] p-6">
              <h3 className="text-lg font-bold text-cyan-300">The 31-Day FTC TSR Safe Harbor Rule</h3>
              <p className="mt-2 text-sm text-slate-300">
                Under the Federal Trade Commission&apos;s Telemarketing Sales Rule (16 CFR § 310.4(b)(3)(iv)), telemarketers must access and scrub against the National Registry no more than{" "}
                <strong>{SAFE_HARBOR_DAYS} days</strong> prior to placing any call to maintain the affirmative Safe Harbor defense. Calls placed to numbers checked more than 31 days prior forfeit safe harbor protection completely.
              </p>
              <p className="mt-3 text-xs font-semibold text-emerald-400">
                💡 4weird Recommendation: Scrub your lists weekly (every 7 days) because consumers register new numbers continuously.
              </p>
            </div>

            <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-6">
              <h3 className="text-lg font-bold text-red-300">Real Government Fines Per Call</h3>
              <p className="mt-2 text-sm text-slate-300">
                The penalties for non-compliance are severe and strictly enforced:
              </p>
              <ul className="mt-3 space-y-2 text-xs text-slate-300">
                <li>
                  • <strong className="text-white">FTC TSR Civil Penalty:</strong> Up to{" "}
                  <strong className="text-red-300">${FTC_TSR_MAX_FINE_PER_CALL.toLocaleString()} USD</strong> per violation / per call.
                </li>
                <li>
                  • <strong className="text-white">TCPA Statutory Damages:</strong>{" "}
                  <strong className="text-red-300">${TCPA_STATUTORY_FINE_MIN} USD</strong> per call (strict liability), and up to{" "}
                  <strong className="text-red-300">${TCPA_STATUTORY_FINE_MAX.toLocaleString()} USD</strong> per call for willful or knowing violations.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

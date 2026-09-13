import type { Metadata } from "next";
import { MarketingPage } from "@/components/site/marketing-page";
import { DebugPlayViewport } from "@/components/vcw/debug-play/debug-play-viewport";

export const metadata: Metadata = {
  title: "DebugPlay — Headless Game Tester | VibeCodeWorker",
  description:
    "DebugPlay captures gameplay frames, analyzes them with visual AI, flags soft-locks via a decision loop guard, and routes suggested code fixes to the editor.",
  alternates: { canonical: "/vibecodeworker/debug-play" },
  openGraph: {
    title: "DebugPlay — Headless Game Tester",
    description:
      "Frame capture → visual AI analysis → bug timeline → one-click code fixes. The VibeCodeWorker visual QA loop.",
  },
};

const FLOW = [
  {
    step: "1 · Capture",
    text: "Attach a gameplay frame (or flip on live capture: 1 frame per 2.0 s). Frames are downsampled to 640×360 in-browser before upload — full bug signal, ~70% less token/latency cost.",
  },
  {
    step: "2 · Analyze",
    text: "POST /api/vcw/debug-play runs analyzeGameFrameWithAI (multi-modal LLM via OpenRouter, fail-open heuristic fallback) and the last-5-decision loop guard: same action + unchanged frame ⇒ soft-lock warning.",
  },
  {
    step: "3 · Fix",
    text: "Bugs carrying a suggested diff get a one-click Send-to-editor button emitting code:fix-available on the cross-tool interop bus — the Monaco banner offers Accept AI Fix.",
  },
];

/**
 * DebugPlay page (Remastery Feature 03, §3.3) — the reviewer-visible
 * surface over the visual-QA foundation.
 *
 * Pure UI + the viewport client component: stateless analyzer calls go
 * to POST /api/vcw/debug-play (landed via DS-REM-05, unauthenticated +
 * unmetered by design for the foundation slice — auth/rate-limit/meter
 * wiring is queued to the steward, not edited here). No secrets, no DB
 * writes, no shared-manifest edits from this page.
 */
export default function DebugPlayPage() {
  return (
    <MarketingPage
      title="DebugPlay"
      intro="Headless game-tester + visual AI bug analyzer. Capture frames, let the model spot soft-locks and broken visuals, scrub the bug timeline, and route fixes to the editor."
    >
      <ol className="grid gap-3 sm:grid-cols-3">
        {FLOW.map((item) => (
          <li
            key={item.step}
            className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">{item.step}</p>
            <p className="mt-1 text-sm text-slate-400">{item.text}</p>
          </li>
        ))}
      </ol>
      <div className="mt-6">
        <DebugPlayViewport />
      </div>
      <p className="mt-6 text-sm text-slate-500">
        Foundation slice: frame analysis is stateless and fail-open (a well-formed answer even with
        no AI key). Production hardening — gateway/BYOK auth, per-user rate limits, and usage
        metering — is tracked with the steward, not bolted on here.
      </p>
    </MarketingPage>
  );
}

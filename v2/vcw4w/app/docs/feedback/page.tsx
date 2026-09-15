import type { Metadata } from "next";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/feedback" },
  title: "Feedback",
  description:
    "How to press Give Feedback, pick a Good/Okay/Bad rating, write useful critique, attach an annotated screenshot, submit via the bot API, and how admins triage unaddressed feedback.",
};

const theme = {
  bg: "bg-gradient-to-br from-amber-950 via-slate-950 to-rose-950",
  border: "border-amber-400/20",
  chip: "border-amber-300/40 bg-amber-300/10 text-amber-200",
  title: "bg-gradient-to-r from-amber-300 via-yellow-200 to-rose-300 bg-clip-text text-transparent",
};

export default function FeedbackPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · feedback"
        title={<>Tell us <span className={theme.title}>what&apos;s working.</span></>}
        lede={<>Press Give Feedback anywhere on the site — or open the standalone /feedback page — pick a Good / Okay / Bad rating, add one line of critique, and optionally attach an annotated screenshot. Bots file the same feedback through the API - admins triage everything from the unaddressed queue.</>}
        stats={[
          ["3", "ratings: Good/Okay/Bad"],
          ["1", "button, everywhere"],
          ["2", "paths: human + bot"],
          ["0", "feedback ignored"],
        ]}
        glyph="💬"
        theme={theme}
        crumb="Feedback"
      />

      <SectionHead
        index="1"
        kicker="The button"
        title="Press Give Feedback"
        body="The Give Feedback button sits at the top of every page. One press opens the feedback dialog - no navigation, no lost context, your current route is attached automatically. Prefer a full page? /feedback is the same form with more room for screenshots."
      />
      <Steps
        items={[
          ["Press Give Feedback", <>Hit the button in the top bar — or open <code className="font-mono">/feedback</code> for the standalone page. Page submits carry <code className="font-mono">source: &quot;page&quot;</code>; dialog submits carry the dialog source instead.</>],
          ["Pick who is reporting", <>Choose Tracked (signed in, so admins can follow up), Anonymous (no name attached), or Guest (no account needed, optional name + email for follow-up). All three land in the same human queue.</>],
          ["Pick a rating", <>Choose one: Good, Okay, or Bad. The rating is required - it is how admins sort the queue.</>],
          ["Write one critique", <>A sentence is enough. Say what happened and what you expected instead.</>],
          ["Attach a screenshot (optional)", <>Paste, drop, capture the current tab, then circle the problem with the micro-editor - see §4.</>],
          ["Submit", <>Human feedback posts immediately and answers with a Report ID. Bot feedback goes through the same queue with its bot label attached.</>],
        ]}
      />

      <SectionHead
        index="2"
        kicker="Two doors"
        title="Human vs bot"
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-black"><span aria-hidden="true" className="mr-2">🧑</span>Humans</p>
          <p className="mt-1 text-sm text-muted-foreground">Signed-in session, dialog UI, or the standalone /feedback page with the screenshot editor included. Pick Tracked, Anonymous, or Guest — the choice is sent as the <code className="font-mono">visibility</code> field (and page submits add <code className="font-mono">source: &quot;page&quot;</code>) so admins can filter it, and your username rides along when you are signed in.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-black"><span aria-hidden="true" className="mr-2">🤖</span>Bots</p>
          <p className="mt-1 text-sm text-muted-foreground">Same queue via <code className="font-mono">POST /api/feedback</code> with a bot key and <code className="font-mono">reporterType: &quot;bot&quot;</code>. Bot-only extras (bot id, run id, repro steps) ride in <code className="font-mono">botExtras</code> - see §5.</p>
        </div>
      </div>
      <Callout tone="emerald" title="Same queue, same ratings.">
        Humans and bots answer the same three ratings and land in the same unaddressed queue. The only difference is
        transport: dialog or /feedback page for humans, API for bots.
      </Callout>

      <SectionHead
        index="3"
        kicker="Signal"
        title="Rating Good / Okay / Bad + critique that helps"
        body="The rating sorts; the critique fixes. 😄 Positive tells us what to protect, 😐 Neutral notes something in between, 😭 Negative tells us what to repair - all need one concrete detail."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["😍 Good", "Something delighted you. Name it so we never regress it."],
          ["😐 Okay", "It works but it drags. Say where the friction lives."],
          ["😞 Bad", "Something broke or misled you. Say what you expected instead."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-black">{t}</p>
            <p className="mt-2 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>
      <MockWindow title="critique - good vs vague" badge="one detail wins">
        <div className="space-y-1.5 font-mono text-xs sm:text-sm">
          <p><span className="text-rose-300">✘ vague:</span> <span className="text-slate-400">&quot;the lobby feels off&quot;</span></p>
          <p><span className="text-emerald-300">✔ useful:</span> <span className="text-slate-200">&quot;Bad - lobby greeter repeats itself after rejoin; expected one greeting.&quot;</span></p>
          <p><span className="text-emerald-300">✔ useful:</span> <span className="text-slate-200">&quot;Good - new timer keeps running when the tab sleeps. Don&apos;t change it.&quot;</span><span aria-hidden="true" className="docs-cursor text-amber-300">▌</span></p>
        </div>
      </MockWindow>
      <ul className="mt-5 space-y-2 text-sm leading-relaxed text-muted-foreground">
        <li className="rounded-xl border border-border bg-card p-3">👍 <strong className="text-foreground">Positive critique protects.</strong> &quot;Good&quot; with a named detail stops a future redesign from deleting what you love.</li>
        <li className="rounded-xl border border-border bg-card p-3">👎 <strong className="text-foreground">Negative critique repairs.</strong> &quot;Bad&quot; with expected-vs-actual gives the fixer a test case in one line.</li>
        <li className="rounded-xl border border-border bg-card p-3">🎯 <strong className="text-foreground">One route, one point.</strong> The current route attaches automatically - don&apos;t spend words on where, spend them on what.</li>
      </ul>

      <SectionHead
        index="4"
        kicker="Show, don't tell"
        title="Screenshot micro-editor: paste, capture, annotate"
        body="The /feedback page and the dialog share one small editor. Paste from the clipboard, drop a JPG, PNG, or WebP image, or capture the current tab — then draw and label right inside the form before you submit. JPEG/PNG/WebP only, 8MB max."
      />
      <Steps
        items={[
          ["Paste or drop", <>Copy any screenshot and paste it straight into the form, or drag a JPG, PNG, or WebP onto the dropzone. Anything else is refused with &quot;Invalid screenshot (JPEG/PNG/WebP only).&quot;</>],
          ["Capture this tab", <>One click snapshots the page you are already on — no uploads, no file picker, no leaving the form. An empty capture is refused with &quot;Invalid screenshot (empty).&quot;</>],
          ["Annotate", <>Draw arrows, circles, highlight boxes, or blur redactions over private text — each mark takes a short comment. The shapes travel with the screenshot as one feedback item.</>],
          ["Submit together", <>The annotated shot posts with your rating and critique as one feedback item, plus <code className="font-mono">source: &quot;page&quot;</code> on page submits.</>],
        ]}
      />
      <Callout tone="cyan" title="Annotate before you submit.">
        A bare screenshot is a puzzle; one circle plus three words is a bug report. Mark the exact pixels you mean -
        admins see the annotation layered over the capture.
      </Callout>

      <SectionHead
        index="5"
        kicker="Copy-paste"
        title="Bot API: file feedback with fetch"
        body="Bots POST the real route contract below. Key lives in FOURWEIRD_BOT_KEY (never in code). reporterType, rating, critique, and text are required; labels is a string array (up to 20, each 1-64 chars); botExtras carries bot provenance and needs botId. The old { rating, critique, route, extras } shape 400s — use this shape."
      />
      <pre className="mt-3 overflow-x-auto rounded-xl bg-black/50 p-4 font-mono text-xs text-slate-200" tabIndex={0} aria-label="Scrollable code: bot feedback POST">
{`const res = await fetch("https://4weird.com/api/feedback", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-bot-key": process.env.FOURWEIRD_BOT_KEY
  },
  body: JSON.stringify({
    reporterType: "bot",
    rating: "bad",
    critique: "negative",
    text: "Lobby greeter repeats itself after rejoin; expected one greeting.",
    labels: ["lobby", "rejoin"],
    botExtras: { botId: "my-bot", runId: "r_abc123" }
  })
});
const { success, id } = await res.json(); // success panel shows 'Report ID: <id>'`}
      </pre>
      <Callout tone="emerald" title="Verify the key first.">
        If the POST fails, check <code className="font-mono">GET /api/bot/me</code> before retrying - an expired or
        revoked key answers the same &quot;Invalid credentials&quot; as a malformed one, by design.
      </Callout>

      <SectionHead
        index="6"
        kicker="Triage"
        title="Admin ingest: unaddressed views"
        body="Admins work the unaddressed queue at /feedback/admin: newest-first by default, filterable by rating, route, and human/bot source. Page submits carry source:page plus a visibility value (tracked, anonymous, or guest) so the queue can slice page vs dialog traffic. Addressing an item (reply, fix link, or wont-fix note) removes it from unaddressed - nothing is ever deleted."
      />
      <Steps
        items={[
          ["Open unaddressed", <>The admin view at <code className="font-mono">/feedback/admin</code> lists every item nobody has addressed yet, with rating, route, screenshot, and source badge (login + admin role required).</>],
          ["Filter the pile", <>Slice by Good / Okay / Bad, by route, by source:page, by visibility (tracked / anonymous / guest), or humans-only / bots-only to batch related reports.</>],
          ["Address it", <>Reply, link the fix, or leave a wont-fix note. Addressed items leave the queue and stay searchable.</>],
          ["Watch the trend", <>Bad clusters on one route after a deploy is the ship-block signal - Okay drift is the polish backlog.</>],
        ]}
      />
      <Callout tone="cyan" title="Nav wiring is queued, not shipped.">
        This page is reachable directly at <code className="font-mono">/docs/feedback</code>. Sidebar, sitemap, and
        search-index wiring is filed as a QUEUE.md request for the site-nav lane - nothing here touches shared manifests.
      </Callout>

      <Pager current="/docs/feedback" />
    </article>
  );
}

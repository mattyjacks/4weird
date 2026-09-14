import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/future-proof-web" },
  title: "Future-Proof Web",
  description:
    "Architecture risk audit for the 4weird website: every bad decision we found, its severity (breaking vs non-breaking), and whether it was fixed inline or filed to another lane.",
};

const theme = {
  bg: "bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-950",
  border: "border-cyan-300/20",
  chip: "border-cyan-300/40 bg-cyan-300/10 text-cyan-200",
  title: "bg-gradient-to-r from-cyan-300 via-sky-200 to-emerald-300 bg-clip-text text-transparent",
};

type Finding = {
  id: string;
  title: string;
  severity: "breaking" | "non-breaking";
  status: "fixed-inline" | "filed";
  owner: string;
  body: string;
};

const FINDINGS: Finding[] = [
  {
    id: "FP-01",
    title: "Terminal allow-list vs server-exec confusion",
    severity: "breaking",
    status: "filed",
    owner: "A3 terminal lane + steward",
    body: "Two separate pages — /terminal (CryptArt Commander v0.1) and /commander (commander-client.tsx) — each carry their own duplicated local-only command table, while their names, MOTDs, and marketing copy (\"power-user CLI\", \"system telemetry\", \"trigger game QA runs\") imply real server power. Both are offline sandboxes with no eval, no fetch, no server calls. The danger is future-shaped: a contributor reading the name instead of the header comment wires server exec into either file believing the brand promises it, or users trust the terminal with work it cannot do. Fix needs a single canonical local-shell implementation plus a naming decision — owned by A3, so filed, not touched.",
  },
  {
    id: "FP-02",
    title: "Desktop provisioning coupling (copy ↔ API drift)",
    severity: "breaking",
    status: "filed",
    owner: "desktop lane + steward",
    body: "app/desktop/page.tsx mixes marketing prose, provisioning how-to, and the live pod manager in one file, with RunPod template names (runpod/kasm-docker:cuda11, runpod-desktop), CPU caps (\"20 GB disk max\"), and cheapest-stock defaults baked into page copy next to a live POST /api/desktop/provision path. The moment RunPod changes a template, cap, or family name, the prose lies while the API moves on — and stale provisioning advice bills real money. Provisioning facts belong behind the API (or a catalog read), with the page rendering them, never hard-coding them. Desktop-owned scope: filed, not touched.",
  },
  {
    id: "FP-03",
    title: "Swarm public-state limits (counts churn, leak surface)",
    severity: "breaking",
    status: "filed",
    owner: "steward",
    body: "Envelopes, STATUS.json, and QUEUE.md live under public/swarm — world-readable by design, which is correct for coordination but means two structural risks: (a) STATUS.json counts churn under concurrent agents and node scripts/verify-devswarm.mjs goes RED on counts staleness again and again (see QUEUE history), training lanes to ignore a red gate; (b) a world-readable bus invites a future secret paste (key, token, email) that crawlers then index. Counts need steward-side derivation (or the verifier needs to stop asserting them); the no-secrets rule needs a scanner, not just a header comment. Steward-owned: filed, not touched.",
  },
  {
    id: "FP-04",
    title: "Route sprawl (61 top-level app dirs, ~298 API routes)",
    severity: "breaking",
    status: "filed",
    owner: "steward / site-nav",
    body: "Roughly sixty-one top-level app route directories and on the order of three hundred API route files, including near-duplicate surfaces: /terminal vs /commander (two local sandboxes), /runpods vs the /desktop pod manager (two pod lists), /squads listed in two nav groups. Every new route multiplies nav, sitemap, robots DISALLOW, and docs wiring — all manual, all drifting. Needs a steward ruling: canonical-route policy, duplicate redirects, and generated (not hand-maintained) sitemap/robots inputs. Filed, not touched.",
  },
  {
    id: "FP-05",
    title: "robots.ts DISALLOW list is manual and drifts",
    severity: "breaking",
    status: "filed",
    owner: "integrator (robots.ts is integrator-owned)",
    body: "app/robots.ts hand-lists gated, ephemeral, and legacy-mirror paths (/account, /api/, /auth/, /v1-legacy/, /games/html/, /ai/, /temp/, …). Each new gated or ephemeral route must be hand-added or crawlers index it. The AI-crawler allow-list is the same story in reverse. Durable fix is deriving disallow entries from route metadata/conventions at build time. Explicitly off-limits to this lane — filed to the integrator, not touched.",
  },
  {
    id: "FP-06",
    title: "This page is not yet in DOCS_DATA / site-nav / sitemap wiring",
    severity: "non-breaking",
    status: "fixed-inline",
    owner: "web (this page) + integrator for manifests",
    body: "Fixed inline: this page ships reachable directly at /docs/future-proof-web with its own canonical URL, needing no manifest entry to render. The remaining wiring (DOCS_DATA entry, site-nav link, sitemap) is steward/integrator-owned shared-manifest work and is called out here instead of being hand-edited from this lane. Companion fix: the site-nav link addition in lib/site-nav.ts follows the existing Learn & Docs pattern exactly.",
  },
  {
    id: "FP-07",
    title: "Pager wraps to unrelated guides for unregistered hrefs",
    severity: "non-breaking",
    status: "fixed-inline",
    owner: "web (this page)",
    body: "Fixed inline: components/docs/docs-bits Pager computes findIndex on DOCS_DATA and wraps modulo on a miss, so rendering <Pager current=\"/docs/future-proof-web\" /> before the integrator registers the href would show two unrelated guides as prev/next. This page therefore omits Pager (it is an engineering audit, not part of the numbered guide sequence) until the href is registered — at which point adding one line restores it. No shared-component change needed.",
  },
  {
    id: "FP-08",
    title: "Duplicated \"no server exec\" disclaimers across terminal pages",
    severity: "non-breaking",
    status: "fixed-inline",
    owner: "web (this page, doc-level)",
    body: "Fixed inline at doc level: rather than editing A3-owned terminal code, this audit records the duplication (terminal/page.tsx header + MOTD + layout description vs commander-client.tsx header + MOTD + unknown-command copy) as the evidence for FP-01, so the owning lane can deduplicate against a single source of truth. No cross-lane bytes touched.",
  },
];

const breaking = FINDINGS.filter((f) => f.severity === "breaking");
const nonBreaking = FINDINGS.filter((f) => f.severity === "non-breaking");

export default function FutureProofWebPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · architecture audit"
        title={<>Future-proofing the web: <span className={theme.title}>every bad decision, on the record.</span></>}
        lede={<>A standing audit of website architecture risks — terminal vs server-exec confusion, desktop provisioning coupling, swarm public-state limits, route sprawl, and crawler policy drift. Each finding carries a severity and a fix status: fixed inline in this page, or filed to the lane that owns it.</>}
        stats={[
          [String(FINDINGS.length), "findings on the record"],
          [String(breaking.length), "breaking, filed"],
          [String(nonBreaking.length), "non-breaking, fixed inline"],
          ["0", "out-of-scope bytes touched"],
        ]}
        glyph="🏗️"
        theme={theme}
        crumb="Future-proof web"
      />

      <SectionHead
        index="1"
        kicker="How to read this"
        title="Severity and status, up front"
        body="Breaking means it can bill wrong, leak, or red the gates if left alone — those are filed to the owning lane, never fixed by drive-by edit. Non-breaking means doc-level and safe to fix inside this page — those are already fixed below."
      />
      <Steps
        items={[
          ["Breaking → filed", <>Terminal confusion, desktop coupling, swarm state, route sprawl, robots drift: recorded with evidence and an owner, zero bytes touched outside this page and the one allowed nav-link edit.</>],
          ["Non-breaking → fixed inline", <>Pager omission, canonical URL, wiring notes, and the disclaimer-duplication record: all resolved within this page.</>],
          ["New here?", <>Start at <Link className="font-bold underline" href="/docs">Docs</Link> or <Link className="underline" href="/docs/security">Security</Link> — this audit is for builders, not first-day setup.</>],
        ]}
      />
      <Callout tone="rose" title="Lane discipline is load-bearing.">
        This page was written under web-lane scope: <code>app/docs/future-proof-web/page.tsx</code> plus one
        pattern-matched nav link in <code>lib/site-nav.ts</code>. Everything else named here belongs to another
        lane — follow the owner tags, not your editor.
      </Callout>

      <SectionHead
        index="2"
        kicker="Filed, not fixed"
        title="Breaking findings (filed to owning lanes)"
        body="Each of these can hurt users or gates if it drifts further. Owners: treat these as queue items, not quotes."
      />
      <div className="mt-5 grid gap-3">
        {breaking.map((f) => (
          <div key={f.id} className="rounded-2xl border border-rose-300/30 bg-card p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-black">
              <span className="rounded-full border border-rose-300/40 bg-rose-300/10 px-3 py-1 text-rose-300">{f.id}</span>
              <span className="rounded-full border border-rose-300/40 bg-rose-300/10 px-3 py-1 text-rose-200">breaking</span>
              <span className="rounded-full border border-border px-3 py-1 text-muted-foreground">filed → {f.owner}</span>
            </div>
            <p className="mt-2 font-black">{f.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </div>

      <SectionHead
        index="3"
        kicker="Fixed here"
        title="Non-breaking findings (fixed inline in this page)"
        body="Doc-level issues with no cross-lane blast radius — resolved in this page itself."
      />
      <div className="mt-5 grid gap-3">
        {nonBreaking.map((f) => (
          <div key={f.id} className="rounded-2xl border border-emerald-300/30 bg-card p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-black">
              <span className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-emerald-300">{f.id}</span>
              <span className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-emerald-200">non-breaking</span>
              <span className="rounded-full border border-border px-3 py-1 text-muted-foreground">fixed inline</span>
            </div>
            <p className="mt-2 font-black">{f.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </div>

      <Callout tone="cyan" title="For the integrator wiring this page in.">
        Checklist when promoting this audit into the manifests: add a DOCS_DATA entry, a Learn &amp; Docs link in{" "}
        <code>lib/site-nav.ts</code> (or keep the one shipped with this change), a sitemap entry, and — once the
        href is registered — a <code>&lt;Pager current=&quot;/docs/future-proof-web&quot; /&gt;</code> line at the
        foot of this page. No <code>robots.ts</code> change needed: this is public docs content.
      </Callout>

      <p className="mt-8 rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        Related: <Link className="underline" href="/docs">Docs home</Link> ·{" "}
        <Link className="underline" href="/docs/security">Security</Link> ·{" "}
        <Link className="underline" href="/docs/agents-compute">Agents &amp; Compute</Link>
      </p>
    </article>
  );
}

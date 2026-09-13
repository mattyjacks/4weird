import type { Metadata } from "next";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/music/bots" },
  title: "Music Bots — Compose Over HTTP Against /api/music",
  description:
    "Bot guide to the music API: GET the seed catalog, POST songs and SFX for validation + canonical JSON + share URLs, with curl examples. Stateless today; persistence is queued.",
};

const theme = {
  bg: "bg-gradient-to-br from-lime-950 via-slate-950 to-emerald-950",
  border: "border-lime-300/20",
  chip: "border-lime-300/40 bg-lime-300/10 text-lime-200",
  title: "bg-gradient-to-r from-lime-300 via-emerald-200 to-amber-200 bg-clip-text text-transparent",
};

export default function MusicBotsDocsPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · music · bots"
        title={<>Compose over HTTP. <span className={theme.title}>Validate everything.</span></>}
        lede={<>Bots talk to music through /api/music: GET returns the seed catalog plus the format contract, POST takes a song or SFX and returns canonical JSON, byte size, a share URL, and per-error diagnostics. No auth scheme to invent, no secrets to send — just JSON in, judgment out.</>}
        stats={[
          ["GET", "catalog"],
          ["POST", "compose"],
          ["400", "never 500"],
          ["429", "rate limited"],
        ]}
        glyph="🤖"
        theme={theme}
        crumb="Bots"
        art={
          <div className="font-mono text-xs leading-relaxed" aria-hidden="true">
            <p><span className="text-emerald-300">$</span> <span className="text-slate-200">curl /api/music</span></p>
            <p className="text-lime-200/80">{`{ "songs": [...], "sfx": [...] }`}</p>
            <p><span className="text-emerald-300">$</span> <span className="text-slate-200">curl -X POST /api/music</span></p>
            <p className="text-lime-200/80">{`{ "ok": true, "bytes": 312 }`}</p>
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="Read the catalog"
        title="GET the seeds + contract"
        body="One GET returns the whole menu: the seed song and SFX lists, the format contract (caps, waves, ranges), and which source served them. Client errors are 400s, rate-limit denials are 429s — the API never 500s on bad input."
      />
      <MockWindow title="bot session — list the catalog" badge="GET /api/music">
        <div className="space-y-2 font-mono text-xs">
          <div className="rounded-lg bg-white/5 px-3 py-2"><span className="text-emerald-300">$</span> curl https://4weird.com/api/music</div>
          <div className="rounded-lg bg-white/5 px-3 py-2 text-lime-200/90">{`→ { "songs": [...], "sfx": [...], "contract": {...}, "source": "seeds" }`}</div>
        </div>
      </MockWindow>

      <SectionHead
        index="2"
        kicker="Walkthrough"
        title="Compose, submit, fix, share"
        body="POST accepts a wrapped { song } or { sfx } object — or the bare song/sfx shape itself. Every submit comes back with ok, canonical form, bytes, a share URL, and diagnostics. POST /api/music/submit mirrors the same behavior as an alias."
      />
      <Steps
        items={[
          ["Submit a song", <>POST <code>{`{ "song": { "title": "Bot Loop", "bpm": 128, "tracks": [...] } }`}</code> and read back the canonical song, its byte size, and a share URL you can hand to a player or a game.</>],
          ["Submit a sound effect", <>POST <code>{`{ "sfx": { "name": "Zap", "freqStart": 1200, "freqEnd": 200, "dur": 0.3 } }`}</code> — or the bare sfx object — and get back the canonical recipe plus diagnostics.</>],
          ["Fix from diagnostics", <>A 400 means the payload failed validation, and the diagnostics list says exactly which fields did. Correct them and resubmit — the loop is meant to be tight.</>],
          ["Hand off the share URL", <>Every accepted submit returns a shareUrl into the music surface. Link it from chat, a quest reward, or a game seed list.</>],
        ]}
      />
      <MockWindow title="bot session — compose a coin blip" badge="POST /api/music">
        <div className="space-y-2 font-mono text-xs">
          <div className="rounded-lg bg-white/5 px-3 py-2"><span className="text-emerald-300">$</span> curl -X POST https://4weird.com/api/music -d {`'{ "sfx": { "name": "Coin", ... } }'`}</div>
          <div className="rounded-lg border border-lime-300/30 bg-lime-300/10 px-3 py-2 text-lime-200">{`→ { "ok": true, "bytes": 96, "shareUrl": "/music/...", "diagnostics": [] }`}</div>
        </div>
      </MockWindow>

      <SectionHead
        index="3"
        kicker="Honest limits"
        title="Stateless today, saved tomorrow"
        body="Submits are validated and canonicalized in memory — the API keeps no database rows for them. Long-term persistence is a queued request, not a landed table."
      />
      <Callout tone="rose" title="Bot persistence is queued/future">
        Never tell players their submission is saved server-side: there is no <code>music_submissions</code> table yet. Keep the canonical JSON and share URL your bot received — that is the durable artifact until persistence lands.
      </Callout>

      <Pager current="/docs/music/bots" />
    </article>
  );
}

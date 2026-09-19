import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/remastery/notifications-chat" },
  title: "Remastery Notifications + Chat",
  description:
    "Wave 1 realtime layer: the global notification center with categories and badges, plus private 1-on-1 and squad-threaded direct chat.",
};

const theme = {
  bg: "bg-gradient-to-br from-fuchsia-950 via-slate-950 to-cyan-950",
  border: "border-fuchsia-300/20",
  chip: "border-fuchsia-300/40 bg-fuchsia-300/10 text-fuchsia-200",
  title: "bg-gradient-to-r from-fuchsia-300 via-pink-200 to-cyan-300 bg-clip-text text-transparent",
};

export default function RemasteryNotificationsChatPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · remastery wave 1"
        title={<>Never miss <span className={theme.title}>the signal.</span></>}
        lede={<>The Wave 1 realtime layer: a global notification center with categories and unread badges, plus private direct chat with 1-on-1 threads and squad threading — both powered by Supabase Realtime, both fail-open when the socket drops.</>}
        stats={[
          ["5 cats", "squad · game · chat · compute · system"],
          ["1-on-1", "+ squad threads"],
          ["5s", "storm rate-limit"],
          ["F21+F22", "spec features"],
        ]}
        glyph="🔔"
        theme={theme}
        crumb="Notifications + Chat"
        art={
          <div className="flex items-end gap-2" aria-hidden="true">
            {[46, 64, 50, 72, 56, 78, 60].map((h, i) => (
              <div
                key={i}
                className="docs-float w-10 rounded-t-full border border-fuchsia-200/50 bg-gradient-to-t from-cyan-500 to-fuchsia-300 shadow-lg sm:w-12"
                style={{ height: h, animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="Notifications"
        title="One bell for the whole platform"
        body="A global dropdown subscribed to Realtime changes on notifications. Every notification carries a category (squad, game, chat, compute, system), a title, a message, an optional action URL, and metadata. A completed render, a sprint update, or a raid call plays a chime and increments the unread badge; an in-memory 5-second rate limiter keeps storms from melting the UI."
      />
      <MockWindow title="notification center" badge="3 unread">
        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>⚔️ squad · raid call in 10 min</span><span className="font-black text-fuchsia-300">unread</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>☁️ compute · render finished</span><span className="font-black text-fuchsia-300">unread</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>🗂️ squad · card moved to done</span><span className="font-black text-slate-400">read</span></div>
        </div>
      </MockWindow>
      <Callout tone="violet" title="Your bell rings for you alone.">
        Notification RLS is owner-scoped: select and update apply only to your own rows. Nobody else&apos;s pings are
        ever queryable, and marking read touches only your row.
      </Callout>

      <SectionHead
        index="2"
        kicker="Chat"
        title="Private threads, squad or 1-on-1"
        body="Direct messaging between squad co-developers and clan members: threads with participants and per-user last-read cursors, messages with attachments, realtime delivery over broadcast channels. Threads can be 1-on-1 or group; every read requires membership, and every insert requires the sender to be a participant."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["💬 1-on-1 threads", "Two participants, multisession delivery, read cursors per user so nobody loses their place."],
          ["👥 Squad threading", "Group threads for sprint war-rooms and raid coordination — membership-gated, realtime, archived with the squad."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-4">
            <p className="font-black">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>

      <SectionHead
        index="3"
        kicker="Resilience"
        title="Fail-open realtime"
      />
      <Steps
        items={[
          ["Socket live: subscribe", <>The bell and thread views subscribe to Realtime channels; new rows arrive with chime and badge, no refresh needed.</>],
          ["Socket down: poll", <>If the connection drops, both surfaces fall back to periodic refresh per the <Link className="underline" href="/docs/remastery/axioms">fail-open axiom</Link> — drafts and read state stay local until the socket returns.</>],
          ["Unmount: clean up", <>Channels terminate on unmount. Dangling sockets are a memory leak with a chat UI attached — close them.</>],
        ]}
      />

      <SectionHead
        index="4"
        kicker="Worked example"
        title="Raid night, bell to thread"
        body="Tuesday evening on the GraveGain squad: one raid call fans out from a single notification into a war-room thread, a render ping, and a sprint update. Four pings, zero meetings."
      />
      <MockWindow title="raid night timeline" badge="4 pings">
        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>8:00p · squad · raid call in 10 min</span><span className="font-black text-fuchsia-300">tapped</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>8:12p · chat · war-room thread opened</span><span className="font-black text-fuchsia-300">joined</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>9:03p · compute · render finished</span><span className="font-black text-fuchsia-300">cheered</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>9:40p · squad · card moved to done</span><span className="font-black text-slate-400">read</span></div>
        </div>
      </MockWindow>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        The lead&apos;s raid call carries an action URL straight into the squad thread, so members
        tap once and land in the war room. The render ping arrives mid raid without breaking focus,
        and the moved card closes the loop on the{" "}
        <Link className="underline" href="/docs/remastery/kanban">squad kanban board</Link>. When ten
        events fire in a minute, the 5 second rate limiter folds them into calm badges instead of a
        chime avalanche. Squad setup lives in{" "}
        <Link className="underline" href="/docs/remastery/squads">squad workspaces</Link>.
      </p>

      <SectionHead
        index="5"
        kicker="Troubleshooting"
        title="Bell silent or thread stuck"
      />
      <Steps
        items={[
          ["Bell rings for nothing, or nothing rings", <>Confirm the Realtime channel is subscribed, then check the storm window: bursts inside 5 seconds collapse into one badge by design. If the bell is empty after reconnect, pull to refresh once, the fail-open poller backfills what the socket missed.</>],
          ["Messages refuse to send", <>Verify thread membership: inserts require the sender to be a participant, and archived squad threads lock to read only. Ask a lead to re-add you, then resend.</>],
          ["Badge count looks wrong", <>Mark-read touches your row alone, so a stale badge means the write raced the poller. Open the notification center once to settle it; a count that survives that is a bug worth reporting with the category and timestamp.</>],
        ]}
      />

      <Pager current="/docs/remastery/notifications-chat" />
    </article>
  );
}

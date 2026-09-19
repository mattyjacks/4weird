import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/remastery/chat" },
  title: "Chat guide (Wave 1)",
  description:
    "Plain-English guide to 4weird chat: team messaging inside squads today and the planned direct 1-on-1 realtime chat at /chat.",
};

export default function ChatDocsPage() {
  return (
    <article>
      <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-600 dark:text-cyan-300">
        4weird.com/docs/remastery/chat · Wave 1
      </p>
      <h1 className="mt-2 text-3xl font-black">Chat, in plain English</h1>
      <p className="mt-3 text-muted-foreground">
        Talk where you work: squad teams message inside their workspace today, and a dedicated
        direct-message inbox is on the way. There is no public chat room and no stranger
        discovery — every thread is limited to its participants.
      </p>

      <h2 className="mt-8 text-xl font-black">What exists today</h2>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        <li><strong>Encrypted team messaging</strong> inside squad workspaces at <Link className="font-bold underline" href="/squads">/squads</Link> — teammates coordinate next to their code projects.</li>
        <li><strong>Global notification dropdown</strong> (planned per the blueprint, not yet live): subscribed to new events with categories and an unread badge.</li>
      </ul>

      <h2 className="mt-8 text-xl font-black">Planned: direct 1-on-1 chat (/chat)</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The remastery blueprint adds a private messaging portal at{" "}
        <code className="font-mono text-xs font-bold">/chat</code> for direct messages between
        squad co-developers and clan members, plus squad threading.{" "}
        <strong>Status: planned</strong> — the route does not exist yet. Planned behavior:
      </p>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        <li><strong>Threads:</strong> 1-on-1 or small group threads with a title; only participants can read or post.</li>
        <li><strong>Realtime delivery:</strong> new messages arrive live; read receipts track each participant&apos;s last-read time.</li>
        <li><strong>Attachments:</strong> message attachments ride along as structured data, never executable content.</li>
        <li><strong>Notifications tie-in:</strong> a new direct message raises a chat-category notification with an unread badge.</li>
      </ul>

      <h2 className="mt-8 text-xl font-black">Data shapes (planned schema)</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2 font-black">Table</th>
              <th className="px-4 py-2 font-black">What it holds</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-mono text-xs font-bold">chat_threads</td>
              <td className="px-4 py-2 text-muted-foreground">id, created_by, title, is_group, timestamps.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-mono text-xs font-bold">chat_participants</td>
              <td className="px-4 py-2 text-muted-foreground">thread_id + user_id, last_read_at.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-mono text-xs font-bold">chat_messages</td>
              <td className="px-4 py-2 text-muted-foreground">thread_id, sender_user_id, content, attachments, created_at.</td>
            </tr>
            <tr className="border-b-0">
              <td className="px-4 py-2 font-mono text-xs font-bold">notifications</td>
              <td className="px-4 py-2 text-muted-foreground">user_id, category (squad | game | chat | compute | system), title, message, action_url, metadata, is_read.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Privacy rule (planned RLS): you only ever see threads you participate in, and only your
        own notifications.
      </p>

      <h2 className="mt-8 text-xl font-black">Worked example: first squad thread</h2>
      <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li><strong>Create the squad first.</strong> Chat threads never float free: every thread belongs to a squad workspace at <Link className="font-bold underline" href="/squads">/squads</Link>. Invite the two or three collaborators who need the thread before typing anything.</li>
        <li><strong>Open team messaging beside the work.</strong> Post the question next to the code project it concerns, for example sprint scope or a failing build, so context stays attached to the thread instead of scattered across tools.</li>
        <li><strong>Watch the notification path.</strong> Each post raises a chat-category notification for the other participants with an unread badge. The bell clears only when each person opens the thread, which doubles as a read receipt.</li>
        <li><strong>Attach data, never executables.</strong> Screenshots, repro steps, and structured payloads ride along as inert attachments. Review the <Link className="underline" href="/docs/privacy-safety">privacy and safety</Link> rules before pasting logs that might contain secrets.</li>
      </ol>

      <h2 className="mt-8 text-xl font-black">Notification categories</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Chat is one of five notification categories. Knowing all five helps you triage the bell instead of
        treating every ping as urgent.
      </p>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2 font-black">Category</th>
              <th className="px-4 py-2 font-black">Fires when</th>
              <th className="px-4 py-2 font-black">Lands where</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-mono text-xs font-bold">squad</td>
              <td className="px-4 py-2 text-muted-foreground">Invites, role changes, pooled balance moves.</td>
              <td className="px-4 py-2 text-muted-foreground">Bell plus squad workspace feed.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-mono text-xs font-bold">game</td>
              <td className="px-4 py-2 text-muted-foreground">Build verdicts, playtest results, heal completions.</td>
              <td className="px-4 py-2 text-muted-foreground">Bell plus the game page.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-mono text-xs font-bold">chat</td>
              <td className="px-4 py-2 text-muted-foreground">New direct or thread message from a collaborator.</td>
              <td className="px-4 py-2 text-muted-foreground">Bell plus the thread itself.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="px-4 py-2 font-mono text-xs font-bold">compute</td>
              <td className="px-4 py-2 text-muted-foreground">Pod state changes, quota warnings, escrow events.</td>
              <td className="px-4 py-2 text-muted-foreground">Bell plus the compute dashboard.</td>
            </tr>
            <tr className="border-b-0">
              <td className="px-4 py-2 font-mono text-xs font-bold">system</td>
              <td className="px-4 py-2 text-muted-foreground">Migrations, policy updates, scheduled maintenance.</td>
              <td className="px-4 py-2 text-muted-foreground">Bell only, newest first.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Full bell behavior, including polling fallback when realtime drops, is documented in{" "}
        <Link className="underline" href="/docs/remastery/notifications-chat">notifications plus chat</Link>.
      </p>

      <h2 className="mt-8 text-xl font-black">Troubleshooting</h2>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        <li><strong>No badge after a teammate posts:</strong> confirm you are a participant on that thread, then refresh. Privacy rules mean non-participants never see the thread or its badge, by design.</li>
        <li><strong>Messages arrive late:</strong> the client falls back to periodic refresh when the realtime channel drops. Nothing typed is lost; the next poll delivers the backlog and the badge catches up.</li>
        <li><strong>Cannot find the /chat inbox:</strong> expected, since direct 1-on-1 chat is planned and the route does not exist yet. Coordinate inside squad workspaces at <Link className="font-bold underline" href="/squads">/squads</Link> until the inbox ships.</li>
        <li><strong>Attachment rejected:</strong> strip executables and re-send as plain text or images. Attachments are structured data only, never runnable content.</li>
      </ul>

      <h2 className="mt-8 text-xl font-black">Safety notes</h2>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        <li>Chat is for people you already work with: squads and clans are invite-only.</li>
        <li>Never share passwords, API keys, or payment details in chat. Docs pages never show secrets either.</li>
        <li>See <Link className="underline" href="/docs/privacy-safety">privacy and safety</Link> for reporting and blocking.</li>
      </ul>

      <h2 className="mt-8 text-xl font-black">FAQ</h2>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        <li><strong>Is there a public lobby?</strong> No. Every thread is limited to its participants, and squads are invite-only. Stranger discovery does not exist in Wave 1.</li>
        <li><strong>Who can read my thread?</strong> Only its participants, enforced by planned row policies on threads, participants, and messages. Notifications follow the same rule: you see only your own.</li>
        <li><strong>Can I bill chat time?</strong> Yes, indirectly: track the session in the <Link className="underline" href="/docs/remastery/time-tracking">time tracker</Link> and convert it into the <Link className="underline" href="/docs/remastery/invoicing">invoicing suite</Link>. Chat itself carries no coin charges.</li>
        <li><strong>What stays out of chat?</strong> Passwords, API keys, and payment details. Docs pages never show secrets either, and pasting one into chat puts it in front of every participant permanently.</li>
      </ul>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        <li>Chat is for people you already work with — squads and clans are invite-only.</li>
        <li>Never share passwords, API keys, or payment details in chat. Docs pages never show secrets either.</li>
        <li>See <Link className="underline" href="/docs/privacy-safety">privacy &amp; safety</Link> for reporting and blocking.</li>
      </ul>

      <p className="mt-8 rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        Next: <Link className="underline" href="/docs/remastery/squad-workspaces">Squad workspaces</Link> ·{" "}
        <Link className="underline" href="/docs/remastery/invoicing-trash">Invoicing &amp; trash</Link> ·{" "}
        <Link className="underline" href="/docs">All docs</Link>
      </p>
    </article>
  );
}

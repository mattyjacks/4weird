/**
 * Direct 1-on-1 realtime chat shared types (Remastery Feature 22,
 * Wave 1 web2 slice). Mirrors README §2 shapes: chat_threads,
 * chat_participants, chat_messages.
 *
 * Pure types + pure helpers only: no browser APIs here, safe to import
 * from server or client components. The UI layer persists to
 * localStorage and syncs tabs over BroadcastChannel; Supabase Realtime
 * broadcast wiring is filed as a QUEUE.md line (API scope is out of
 * this envelope).
 */

export interface ChatParticipant {
  user_id: string;
  display_name: string;
  last_read_at?: string;
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  sender_user_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

export interface ChatThread {
  id: string;
  title?: string;
  is_group: boolean;
  participants: ChatParticipant[];
  messages: ChatMessage[];
  updated_at: string;
}

export function threadTitle(thread: ChatThread, viewerId: string): string {
  if (thread.title?.trim()) return thread.title.trim();
  const others = thread.participants.filter((p) => p.user_id !== viewerId);
  if (others.length > 0) return others.map((p) => p.display_name).join(", ");
  return "Just you";
}

export function unreadCount(thread: ChatThread, viewerId: string): number {
  const me = thread.participants.find((p) => p.user_id === viewerId);
  if (!me?.last_read_at) return thread.messages.filter((m) => m.sender_user_id !== viewerId).length;
  const readMs = Date.parse(me.last_read_at);
  if (!Number.isFinite(readMs)) return 0;
  return thread.messages.filter(
    (m) => m.sender_user_id !== viewerId && Date.parse(m.created_at) > readMs
  ).length;
}

export function lastMessage(thread: ChatThread): ChatMessage | null {
  if (thread.messages.length === 0) return null;
  return thread.messages[thread.messages.length - 1];
}

export function newMessageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `msg-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function sortThreads(threadList: ChatThread[]): ChatThread[] {
  return [...threadList].sort(
    (a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)
  );
}

/** Two demo threads so a reviewer can read a thread view immediately. */
export function seedThreads(viewerId: string, viewerName: string): ChatThread[] {
  const now = Date.now();
  const iso = (offsetMs: number) => new Date(now - offsetMs).toISOString();
  return [
    {
      id: "thread-squad-lead",
      title: undefined,
      is_group: false,
      participants: [
        { user_id: viewerId, display_name: viewerName, last_read_at: iso(60_000) },
        { user_id: "dev-aria", display_name: "Aria (squad lead)", last_read_at: iso(30_000) },
      ],
      messages: [
        {
          id: "seed-m1",
          thread_id: "thread-squad-lead",
          sender_user_id: "dev-aria",
          sender_name: "Aria (squad lead)",
          content: "Sprint board is green — can you take the invoice PDF pass?",
          created_at: iso(3_600_000),
        },
        {
          id: "seed-m2",
          thread_id: "thread-squad-lead",
          sender_user_id: viewerId,
          sender_name: viewerName,
          content: "On it — trash lifecycle and preview are already up for review.",
          created_at: iso(3_000_000),
        },
      ],
      updated_at: iso(3_000_000),
    },
    {
      id: "thread-clan-raid",
      title: "Clan raid planning",
      is_group: true,
      participants: [
        { user_id: viewerId, display_name: viewerName, last_read_at: iso(90_000) },
        { user_id: "dev-bex", display_name: "Bex", last_read_at: iso(80_000) },
        { user_id: "dev-cy", display_name: "Cy", last_read_at: iso(70_000) },
      ],
      messages: [
        {
          id: "seed-m3",
          thread_id: "thread-clan-raid",
          sender_user_id: "dev-bex",
          sender_name: "Bex",
          content: "Raid call at reset — who is bringing the render node?",
          created_at: iso(7_200_000),
        },
      ],
      updated_at: iso(7_200_000),
    },
  ];
}

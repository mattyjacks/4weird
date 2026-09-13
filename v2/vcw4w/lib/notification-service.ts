/**
 * lib/notification-service.ts — unified notification service (Remastery §5.3 + Feature 21).
 *
 * USAGE (client or server — pure + dependency-free):
 *   import { queueNotification, unreadCount, subscribeNotifications } from "@/lib/notification-service";
 *   queueNotification({ userId: "u1", category: "squad", title: "Sprint done", message: "Board X hit 100%." });
 *   const n = unreadCount("u1"); // badge number, pure read
 *
 * CONTRACT:
 * - Dependency-free on purpose: unlike the README sketch (which imports the Supabase server
 *   client at module top and only runs server-side), this module keeps a local fail-open
 *   queue + subscriber fan-out that works everywhere. The data lane persists to the
 *   `notifications` table by calling setNotificationStore() once — no edits to this file.
 * - Fail-open: queueNotification() never throws and always returns a record; a failing
 *   store or listener degrades to the in-memory queue.
 * - Categories match README §2 notifications CHECK intent: squad | game | chat | compute | system.
 */

export type NotificationCategory = "squad" | "game" | "chat" | "compute" | "system";

export interface NotificationInput {
  userId: string;
  category: NotificationCategory | string;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface QueuedNotification {
  id: string;
  userId: string;
  category: string;
  title: string;
  message: string;
  actionUrl?: string;
  metadata: Record<string, unknown>;
  isRead: boolean;
  createdAt: number;
}

export type NotificationListener = (n: QueuedNotification) => void;

/** Persistence hook the data lane provides (e.g. Supabase insert). Best-effort, may throw. */
export type NotificationStore = (n: QueuedNotification) => Promise<unknown> | unknown;

const queue: QueuedNotification[] = [];
const listeners = new Set<NotificationListener>();
let store: NotificationStore | null = null;
let idCounter = 0;

/** Data lane calls once at boot: setNotificationStore((n) => supabase.from("notifications").insert(...)). */
export function setNotificationStore(next: NotificationStore | null): void {
  store = next;
}

function makeId(): string {
  idCounter += 1;
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.floor(Math.random() * 0xffffffff).toString(16);
  return `notif_${Date.now().toString(36)}_${idCounter}_${rand}`;
}

/** Queue one notification. Never throws; always returns the record. */
export function queueNotification(input: NotificationInput): QueuedNotification {
  const record: QueuedNotification = {
    id: makeId(),
    userId: String(input.userId ?? ""),
    category: String(input.category ?? "system"),
    title: String(input.title ?? ""),
    message: String(input.message ?? ""),
    actionUrl: input.actionUrl,
    metadata:
      typeof input.metadata === "object" && input.metadata !== null ? input.metadata : {},
    isRead: false,
    createdAt: Date.now(),
  };
  queue.unshift(record);
  if (queue.length > 200) queue.length = 200;
  if (store) {
    try {
      const out = store(record);
      if (out instanceof Promise) out.catch(() => undefined);
    } catch {
      // Fail-open: persistence is best-effort.
    }
  }
  for (const cb of listeners) {
    try {
      cb(record);
    } catch {
      // Fail-open.
    }
  }
  return record;
}

/** Badge number: unread queued notifications for a user (pure read). */
export function unreadCount(userId: string): number {
  let n = 0;
  for (const item of queue) {
    if (item.userId === userId && !item.isRead) n += 1;
  }
  return n;
}

/** Newest-first queued notifications for a user (pure read, max 100). */
export function listNotifications(userId: string): QueuedNotification[] {
  return queue.filter((item) => item.userId === userId).slice(0, 100);
}

/** Mark one queued notification read. Returns true when found. */
export function markRead(id: string): boolean {
  const found = queue.find((item) => item.id === id);
  if (!found) return false;
  found.isRead = true;
  return true;
}

/** Mark all of a user's queued notifications read. Returns the count flipped. */
export function markAllRead(userId: string): number {
  let n = 0;
  for (const item of queue) {
    if (item.userId === userId && !item.isRead) {
      item.isRead = true;
      n += 1;
    }
  }
  return n;
}

/** Subscribe to newly queued notifications. Returns an unsubscribe function. */
export function subscribeNotifications(listener: NotificationListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

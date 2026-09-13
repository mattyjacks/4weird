// Unified Notification Service (remastery 5.3 / Feature 21).
// Row mapping: README section 2.5 public.notifications { category:
// squad|game|chat|compute|system, title, message, action_url, metadata,
// is_read } mirrored by NotificationItem below.
// In-memory notification store + optional server persistence helpers.
// SSR-safe: zero window/Notification/BroadcastChannel access at module top
// level. The injected emitter (interop-bus compatible) avoids import cycles.

export const NOTIFICATION_CATEGORIES = [
  "squad",
  "game",
  "chat",
  "compute",
  "system",
] as const;

export type NotificationCategory =
  (typeof NOTIFICATION_CATEGORIES)[number];

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  createdAt: number;
}

export type NotificationInput = Omit<
  NotificationItem,
  "id" | "isRead" | "createdAt"
>;

export type NotificationHandler = (item: NotificationItem) => void;

/** Minimal structural emitter (interop-bus compatible). Injected, never imported. */
export interface NotificationEmitter {
  emit(type: string, payload: unknown): void;
}

export interface SendNotificationOptions {
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

function generateId(): string {
  try {
    const g = globalThis as {
      crypto?: { randomUUID?: () => string };
    };
    if (g.crypto && typeof g.crypto.randomUUID === "function") {
      return g.crypto.randomUUID();
    }
  } catch {
    // Fall through to Math.random fallback below (fail-open).
  }
  return `notif-${Date.now().toString(36)}-${Math.floor(
    Math.random() * 0xffffffff,
  )
    .toString(36)
    .padStart(7, "0")}`;
}

function emptyBadgeCounts(): Record<NotificationCategory, number> {
  return { squad: 0, game: 0, chat: 0, compute: 0, system: 0 };
}

export class NotificationService {
  private items: NotificationItem[] = [];
  private handlers = new Set<NotificationHandler>();
  private readonly emitter: NotificationEmitter | null;

  constructor(emitter?: NotificationEmitter | null) {
    this.emitter = emitter ?? null;
  }

  subscribe(handler: NotificationHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  notify(input: NotificationInput): NotificationItem {
    const item: NotificationItem = {
      ...input,
      id: generateId(),
      isRead: false,
      createdAt: Date.now(),
    };
    this.items.push(item);

    for (const handler of this.handlers) {
      try {
        handler(item);
      } catch {
        // Fail-open: one bad subscriber must never break dispatch.
      }
    }

    if (this.emitter) {
      try {
        this.emitter.emit("system:notification", {
          title: item.title,
          message: item.message,
          category: item.category,
        });
      } catch {
        // Fail-open: emit errors never propagate to callers.
      }
    }

    return item;
  }

  getAll(): NotificationItem[] {
    return [...this.items];
  }

  getUnread(): NotificationItem[] {
    return this.items.filter((item) => !item.isRead);
  }

  badgeCounts(): Record<NotificationCategory, number> {
    const counts = emptyBadgeCounts();
    for (const item of this.items) {
      if (!item.isRead) counts[item.category] += 1;
    }
    return counts;
  }

  markRead(id: string): boolean {
    const found = this.items.find((item) => item.id === id);
    if (!found) return false;
    found.isRead = true;
    return true;
  }

  markAllRead(): void {
    for (const item of this.items) item.isRead = true;
  }

  clear(): void {
    this.items = [];
  }

  /**
   * Optional browser mirror. Lazily touches the Notification API only when
   * called, inside try/catch; safe to call on the server (returns false).
   */
  mirrorToBrowser(item: NotificationItem): boolean {
    try {
      if (typeof window === "undefined") return false;
      if (typeof Notification === "undefined") return false;
      if (Notification.permission !== "granted") return false;
      new Notification(item.title, { body: item.message });
      return true;
    } catch {
      return false;
    }
  }
}

// --- Server persistence helpers (remastery README 5.3) ---
// Supabase client is dynamically imported so this module stays importable
// from client components and SSR without a top-level server-only import.

function assertNonEmpty(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
}

function assertCategory(
  category: string,
): asserts category is NotificationCategory {
  if (!(NOTIFICATION_CATEGORIES as readonly string[]).includes(category)) {
    throw new RangeError(
      `category must be one of: ${NOTIFICATION_CATEGORIES.join(", ")}`,
    );
  }
}

export async function sendNotification(
  userId: string,
  category: NotificationCategory,
  title: string,
  message: string,
  options?: SendNotificationOptions,
): Promise<{ id: string }> {
  assertNonEmpty(userId, "userId");
  assertCategory(category);
  assertNonEmpty(title, "title");
  assertNonEmpty(message, "message");

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: userId,
      category,
      title,
      message,
      action_url: options?.actionUrl ?? null,
      metadata: options?.metadata ?? {},
      is_read: false,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return { id: (data as { id: string }).id };
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  assertNonEmpty(userId, "userId");
  assertNonEmpty(notificationId, "notificationId");

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function getUnreadCount(userId: string): Promise<number> {
  assertNonEmpty(userId, "userId");

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

// --- Pure module-level in-memory queue (WAVE1-01 F4) ---
// README §5.3 + §2.5 row mapping ({ category, title, message, action_url,
// metadata, is_read }); axioms §1.2 (fail-open, SSR-safe). Fully
// self-contained: zero browser APIs, no lib/remastery/* imports. Input
// validation failures throw NotificationValidationError; every other failure
// degrades to a safe default and never throws.

export class NotificationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotificationValidationError";
  }
}

export interface NotifyOptions {
  actionUrl?: string;
  action_url?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationListFilter {
  category?: NotificationCategory;
  isRead?: boolean;
  unreadOnly?: boolean;
}

function assertNotifyArgs(
  title: string,
  message: string,
  category: string,
): asserts category is NotificationCategory {
  if (typeof title !== "string" || title.trim().length === 0) {
    throw new NotificationValidationError("title must be a non-empty string");
  }
  if (typeof message !== "string" || message.trim().length === 0) {
    throw new NotificationValidationError(
      "message must be a non-empty string",
    );
  }
  if (!(NOTIFICATION_CATEGORIES as readonly string[]).includes(category)) {
    throw new NotificationValidationError(
      `category must be one of: ${NOTIFICATION_CATEGORIES.join(", ")}`,
    );
  }
}

const moduleQueue: NotificationItem[] = [];
const moduleSubscribers = new Set<NotificationHandler>();

function buildQueueItem(
  title: string,
  message: string,
  category: NotificationCategory,
  opts?: NotifyOptions,
): NotificationItem {
  return {
    id: generateId(),
    category,
    title,
    message,
    actionUrl: opts?.actionUrl ?? opts?.action_url,
    metadata: opts?.metadata,
    isRead: false,
    createdAt: Date.now(),
  };
}

export function notify(
  title: string,
  message: string,
  category: NotificationCategory,
  opts?: NotifyOptions,
): NotificationItem {
  assertNotifyArgs(title, message, category);
  try {
    const item = buildQueueItem(title, message, category, opts);
    moduleQueue.push(item);
    for (const handler of moduleSubscribers) {
      try {
        handler(item);
      } catch {
        // Fail-open: one bad subscriber never breaks dispatch.
      }
    }
    return item;
  } catch (err) {
    if (err instanceof NotificationValidationError) throw err;
    // Fail-open: return a transient item when storage/dispatch fails.
    return buildQueueItem(title, message, category, opts);
  }
}

export function markRead(id: string): boolean {
  try {
    const found = moduleQueue.find((item) => item.id === id);
    if (!found) return false;
    found.isRead = true;
    return true;
  } catch {
    return false;
  }
}

export function markAllRead(): number {
  try {
    let count = 0;
    for (const item of moduleQueue) {
      if (!item.isRead) {
        item.isRead = true;
        count += 1;
      }
    }
    return count;
  } catch {
    return 0;
  }
}

export function unreadCount(byCategory?: NotificationCategory): number {
  try {
    if (byCategory !== undefined) {
      if (
        !(NOTIFICATION_CATEGORIES as readonly string[]).includes(byCategory)
      ) {
        return 0;
      }
      return moduleQueue.filter(
        (item) => !item.isRead && item.category === byCategory,
      ).length;
    }
    return moduleQueue.filter((item) => !item.isRead).length;
  } catch {
    return 0;
  }
}

export function list(filter?: NotificationListFilter): NotificationItem[] {
  try {
    let items = [...moduleQueue];
    if (filter?.category !== undefined) {
      items = items.filter((item) => item.category === filter.category);
    }
    if (filter?.unreadOnly === true) {
      items = items.filter((item) => !item.isRead);
    } else if (filter?.isRead !== undefined) {
      items = items.filter((item) => item.isRead === filter.isRead);
    }
    return items;
  } catch {
    return [];
  }
}

export function prune(cap: number): number {
  try {
    if (typeof cap !== "number" || !Number.isFinite(cap) || cap < 0) return 0;
    const overflow = moduleQueue.length - Math.floor(cap);
    if (overflow <= 0) return 0;
    moduleQueue.splice(0, overflow);
    return overflow;
  } catch {
    return 0;
  }
}

/** Badge-count helper: total unread, or per-category when given. */
export function getBadgeCount(byCategory?: NotificationCategory): number {
  return unreadCount(byCategory);
}

export function subscribe(handler: NotificationHandler): () => void {
  try {
    if (typeof handler !== "function") return () => undefined;
    moduleSubscribers.add(handler);
    return () => {
      moduleSubscribers.delete(handler);
    };
  } catch {
    return () => undefined;
  }
}

export function unsubscribe(handler: NotificationHandler): void {
  try {
    moduleSubscribers.delete(handler);
  } catch {
    // Fail-open: unsubscribing never throws.
  }
}

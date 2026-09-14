/**
 * VocRehab course outline, XP, badges, progress merge (C3 domain lib).
 *
 * Usage:
 *   import { vocrehabCourseOutline, vocrehabModuleXp, vocrehabBadgeFor, vocrehabCourseProgressFrom } from "@/lib/vocrehab-course";
 *   const xp = vocrehabModuleXp({ kind: "game" });
 *   const merged = vocrehabCourseProgressFrom(local, remote); // remote wins per module, union of done
 *
 * Pure module: zero I/O, zero imports, safe for client + server.
 * No browser globals at module top. Storage keys live in callers.
 */

export type VocrehabModuleKind = "lesson" | "game" | "roleplay" | "chapter";

export interface VocrehabCourseModule {
  id: string;
  chapterId: string;
  title: string;
  kind: Exclude<VocrehabModuleKind, "chapter">;
  tryIt: string;
}

export interface VocrehabCourseChapter {
  id: string;
  title: string;
  modules: VocrehabCourseModule[];
}

export type VocrehabBadgeId =
  | "first-sort"
  | "clear-inbox"
  | "steady-refocus"
  | "path-finder"
  | "schedule-solver"
  | "out-loud"
  | "money-mapper"
  | "my-decision"
  | "ready-with-supports";

export interface VocrehabBadge {
  id: VocrehabBadgeId;
  title: string;
  earnedFor: string;
}

export interface VocrehabModuleProgress {
  moduleId: string;
  done: boolean;
  xp: number;
  updatedAt: string;
}

/** 4 chapters / 14 modules per plan §8.1. */
export const vocrehabCourseOutline: readonly VocrehabCourseChapter[] = [
  {
    id: "discover",
    title: "Chapter 1 — Discover",
    modules: [
      { id: "welcome", chapterId: "discover", title: "Welcome + How This Course Works", kind: "lesson", tryIt: "Read the no-test promise and tour the course." },
      { id: "know-strengths", chapterId: "discover", title: "Know Your Strengths", kind: "game", tryIt: "Play File Sort + Inbox Sprint." },
      { id: "barriers-supports", chapterId: "discover", title: "Name Barriers, Map Supports", kind: "game", tryIt: "Play Barrier Run + Schedule Juggle." },
      { id: "pick-direction", chapterId: "discover", title: "Pick a Direction", kind: "lesson", tryIt: "Try the goal checker + remote analyzer." },
    ],
  },
  {
    id: "tell-story",
    title: "Chapter 2 — Tell Your Story",
    modules: [
      { id: "interview-basics", chapterId: "tell-story", title: "Interview Basics", kind: "roleplay", tryIt: "Generate 5 questions, rehearse one." },
      { id: "the-pivot", chapterId: "tell-story", title: "The Pivot", kind: "roleplay", tryIt: "Draft a 3-sentence pivot, rehearse delivery." },
      { id: "the-ask", chapterId: "tell-story", title: "The Ask", kind: "roleplay", tryIt: "Build a disclosure script, rehearse the ask." },
      { id: "paper-trail", chapterId: "tell-story", title: "Paper Trail", kind: "lesson", tryIt: "Build a resume section and export it." },
    ],
  },
  {
    id: "decide",
    title: "Chapter 3 — Decide With Confidence",
    modules: [
      { id: "money-maps", chapterId: "decide", title: "Money Maps", kind: "lesson", tryIt: "Move the SSI sliders and read the gauge." },
      { id: "when-to-share", chapterId: "decide", title: "When To Share", kind: "lesson", tryIt: "Walk the disclosure adventure map." },
      { id: "decision-one-pager", chapterId: "decide", title: "My Decision One-Pager", kind: "lesson", tryIt: "Export your combined decision page." },
    ],
  },
  {
    id: "work-with-counselor",
    title: "Chapter 4 — Work With Your Counselor",
    modules: [
      { id: "what-ipes-are", chapterId: "work-with-counselor", title: "What IPEs Are", kind: "lesson", tryIt: "Read a sample IPE goal line." },
      { id: "how-sessions-help", chapterId: "work-with-counselor", title: "How Sessions Help", kind: "lesson", tryIt: "Review what a session draft looks like." },
      { id: "next-3-steps", chapterId: "work-with-counselor", title: "My Next 3 Steps", kind: "lesson", tryIt: "Write 3 next steps with your counselor." },
    ],
  },
];

/** XP: lesson 10 / game 25 / roleplay 25 / chapter 50. No XP for speed; retries earn the same. */
export function vocrehabModuleXp(kind: VocrehabModuleKind): number {
  switch (kind) {
    case "lesson":
      return 10;
    case "game":
      return 25;
    case "roleplay":
      return 25;
    case "chapter":
      return 50;
  }
}

const BADGES: Record<VocrehabBadgeId, VocrehabBadge> = {
  "first-sort": { id: "first-sort", title: "First Sort", earnedFor: "Completing File Sort." },
  "clear-inbox": { id: "clear-inbox", title: "Clear Inbox", earnedFor: "Completing Inbox Sprint." },
  "steady-refocus": { id: "steady-refocus", title: "Steady Refocus", earnedFor: "Completing Focus Shift." },
  "path-finder": { id: "path-finder", title: "Path Finder", earnedFor: "Completing Barrier Run." },
  "schedule-solver": { id: "schedule-solver", title: "Schedule Solver", earnedFor: "Completing Schedule Juggle." },
  "out-loud": { id: "out-loud", title: "Out Loud", earnedFor: "First roleplay rehearsal." },
  "money-mapper": { id: "money-mapper", title: "Money Mapper", earnedFor: "Exploring the SSI slider." },
  "my-decision": { id: "my-decision", title: "My Decision", earnedFor: "Finishing the decision one-pager." },
  "ready-with-supports": { id: "ready-with-supports", title: "Ready With Supports", earnedFor: "Finishing all 4 chapters." },
};

/** Look up one of the 9 badge ids; unknown ids return null (never throw in render paths). */
export function vocrehabBadgeFor(id: string): VocrehabBadge | null {
  const found = (BADGES as Record<string, VocrehabBadge>)[id];
  return found ?? null;
}

/**
 * Merge guest-local progress with signed-in remote progress.
 * Union of done flags (done wins), XP takes the max, updatedAt takes the latest.
 */
export function vocrehabCourseProgressFrom(
  local: readonly VocrehabModuleProgress[],
  remote: readonly VocrehabModuleProgress[],
): VocrehabModuleProgress[] {
  const byId = new Map<string, VocrehabModuleProgress>();
  const upsert = (p: VocrehabModuleProgress): void => {
    const prev = byId.get(p.moduleId);
    if (!prev) {
      byId.set(p.moduleId, { ...p });
      return;
    }
    byId.set(p.moduleId, {
      moduleId: p.moduleId,
      done: prev.done || p.done,
      xp: Math.max(prev.xp, p.xp),
      updatedAt: prev.updatedAt >= p.updatedAt ? prev.updatedAt : p.updatedAt,
    });
  };
  for (const p of local) upsert(p);
  for (const p of remote) upsert(p);
  return [...byId.values()].sort((a, b) => (a.moduleId < b.moduleId ? -1 : a.moduleId > b.moduleId ? 1 : 0));
}

/**
 * localStorage key for guest-local course progress (read by
 * components/vocrehab/vocrehab-shell.tsx). Additive bridge: C6 shell landed
 * against this name before C3 exported it; value is new, nothing renamed.
 */
export const vocrehabCourseStorageKey = "vocrehab-course-progress-v1";

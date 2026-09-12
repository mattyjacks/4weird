/**
 * Buddy action catalog - pure orchestrator UI over existing specialists.
 *
 * The widget renders these as one-click delegations:
 *   fal  -> POST /api/fal/generate { op, prompt, game_slug }
 *   chat -> POST /api/buddy/chat (message starting with /tactics or /hail
 *           so server normalization in expandBuddySlashCommand applies)
 *   link -> plain navigation to the play shell
 *
 * Pure: imports only isFalOp + quoteFal values from "@/lib/fal".
 * Never throws; unknown slugs fall back to "lobby".
 */

import { isFalOp, quoteFal } from "@/lib/fal";

export type BuddyActionKind = "fal" | "chat" | "link";

export type BuddyAction = {
  id: string;
  label: string;
  blurb: string;
  kind: BuddyActionKind;
  falOp?: string;
  chatText?: string;
  href?: (gameSlug: string) => string;
  estCoins?: number;
};

function safeSlug(raw: unknown): string {
  try {
    const s = String(raw ?? "lobby")
      .trim()
      .toLowerCase();
    return /^[a-z0-9-]{1,64}$/.test(s) ? s : "lobby";
  } catch {
    return "lobby";
  }
}

function safeTitle(raw: unknown): string {
  try {
    const t = String(raw ?? "").trim().slice(0, 80);
    return t || "this game";
  } catch {
    return "this game";
  }
}

function safeQuote(op: string): number | undefined {
  try {
    if (!isFalOp(op)) return undefined;
    const q = quoteFal(op, 1);
    return Number.isFinite(q) && q > 0 ? q : undefined;
  } catch {
    return undefined;
  }
}

export function catalogForBuddy(gameSlug: string, gameTitle: string): BuddyAction[] {
  try {
    const slug = safeSlug(gameSlug);
    const title = safeTitle(gameTitle);
    void slug;

    const candidates: BuddyAction[] = [
      {
        id: "theme-music",
        label: "Theme music",
        blurb: `Menu-ready theme loop for ${title}.`,
        kind: "fal",
        falOp: "theme-music",
        estCoins: safeQuote("theme-music"),
      },
      {
        id: "victory-poster",
        label: "Victory poster",
        blurb: `Store-capsule victory art for ${title}.`,
        kind: "fal",
        falOp: "capsule-art",
        estCoins: safeQuote("capsule-art"),
      },
      {
        id: "hype-voice-line",
        label: "Hype voice line",
        blurb: `Spoken hype line for ${title}.`,
        kind: "fal",
        falOp: "npc-voice",
        estCoins: safeQuote("npc-voice"),
      },
      {
        id: "coach-tip",
        label: "Coach tip",
        blurb: `One fair tactical tip for ${title}.`,
        kind: "chat",
        chatText: `/tactics give me one fair tip for ${title}`,
      },
      {
        id: "hail-taunt",
        label: "Hail taunt",
        blurb: `Enemy-commander taunt + counter-tactic for ${title}.`,
        kind: "chat",
        chatText: `/hail the enemy commander in ${title}`,
      },
      {
        id: "open-play-shell",
        label: "Open play shell",
        blurb: `Jump into ${title} and play now.`,
        kind: "link",
        href: (s: string) => `/games/${safeSlug(s)}/play`,
      },
    ];

    // Never emit a fal action whose op key fails isFalOp.
    const valid = candidates.filter((a) => {
      try {
        if (a.kind !== "fal") return true;
        return typeof a.falOp === "string" && isFalOp(a.falOp);
      } catch {
        return false;
      }
    });

    return valid.slice(0, 6);
  } catch {
    return [];
  }
}

export function falPayloadFor(
  action: BuddyAction,
  gameSlug: string,
  prompt: string,
): { op: string; prompt: string; game_slug: string } | null {
  try {
    if (!action || action.kind !== "fal") return null;
    const op = String((action as BuddyAction).falOp ?? "");
    if (!isFalOp(op)) return null;
    return {
      op,
      prompt: String(prompt ?? "").trim().slice(0, 2000),
      game_slug: safeSlug(gameSlug),
    };
  } catch {
    return null;
  }
}

import { createHash } from "node:crypto";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { requireHuman } from "@/lib/botid";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp, isSlug } from "@/lib/validate";
import { GUEST_FREE_LOADS_PER_DAY, GUEST_MAX_LOADS_PER_DAY } from "@/lib/game-rent";
import { pickHouseAd } from "@/lib/ads";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

// Best-effort per-instance daily counter (resets daily, keyed by IP). The
// rate limiter above is the enforcement; this counter is only the honest
// "loads used" readout for the client. The signed-in coin ledger remains
// the authoritative meter; guests are intentionally approximate.
const guestCounts = new Map<string, { day: string; count: number }>();

function countGuestLoad(ip: string): number {
  const day = new Date().toISOString().slice(0, 10);
  if (guestCounts.size > 10_000) {
    for (const [key, value] of guestCounts) {
      if (value.day !== day) guestCounts.delete(key);
    }
  }
  const key = `${day}:${ip}`;
  const current = guestCounts.get(key) ?? { day, count: 0 };
  current.count += 1;
  guestCounts.set(key, current);
  return current.count;
}

/**
 * POST /api/games/guest-pass; unsigned play gate. Guests (no account, no
 * coins) may play free inside an IP-based daily quota; beyond the free
 * loads they keep playing by viewing skippable house ads. No cloud saves,
 * multiplayer, AI, or Buddy for guests; those stay signed-in only.
 *
 * This is the cost-control teeth for free traffic: bots and heavy guests get
 * 429s here, while signed-in players meter in coins instead and never see
 * this gate at all.
 */
export async function POST(req: Request) {
  // Unsigned gate, but still first-party-only: the Origin/Referer proof
  // stops cross-site quota-burning (an attacker's page forcing guest-pass
  // creation against a victim's IP quota). Browser play shells always send
  // Origin on POST; non-browser callers must send one too.
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const botBlock = await requireHuman(req, "POST /api/games/guest-pass");
  if (botBlock) return botBlock;
  const ip = clientIp(req);
  const burst = rateLimit(`guest-pass:burst:${ip}`, 10, 60_000);
  if (!burst.allowed) {
    return fail("Too many guest loads. Slow down or sign in for uninterrupted play.", 429, {
      "Retry-After": String(burst.retryAfter),
    });
  }
  const daily = rateLimit(`guest-pass:day:${ip}`, GUEST_MAX_LOADS_PER_DAY, DAY_MS);
  if (!daily.allowed) {
    return fail("Guest daily limit reached. Sign in; daily bonuses alone cover 5+ hours a day.", 429, {
      "Retry-After": String(daily.retryAfter),
    });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const game = isSlug((body as Record<string, unknown> | null)?.game_slug ?? (body as Record<string, unknown> | null)?.game);
  if (!game) return fail("Invalid game_slug.", 400);

  // In-memory per-IP count ≈ loads used today (best-effort per instance;
  // the signed-in coin ledger remains the authoritative meter). Server also
  // issues a single-use ad token for over-quota loads so the client cannot
  // skip the interstitial by ignoring ad_required.
  const used = countGuestLoad(ip);
  const adRequired = used > GUEST_FREE_LOADS_PER_DAY;
  const date = new Date().toISOString().slice(0, 10);
  const adToken = adRequired
    ? createHash("sha256")
        .update(`${process.env.SIGNUP_IP_HASH_SALT ?? "guest"}|${date}|${ip}|${game}|${used}`)
        .digest("hex")
        .slice(0, 32)
    : null;
  return ok({
    allowed: true,
    guest: true,
    game,
    loads_used: Math.min(used, GUEST_MAX_LOADS_PER_DAY),
    loads_free: GUEST_FREE_LOADS_PER_DAY,
    // After the free quota, every further load needs one (instantly
    // skippable) house-ad view first; the client enforces the interstitial
    // and must present ad_token on the next load (verified server-side where
    // enforced).
    ad_required: adRequired,
    ad: adRequired ? pickHouseAd(date, game) : null,
    ad_token: adToken,
    note: "Guests play free with ads. Sign in for cloud saves, multiplayer, AI, Buddy; and no ads.",
  });
}

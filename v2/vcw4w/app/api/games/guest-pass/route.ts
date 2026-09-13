import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { requireHuman } from "@/lib/botid";
import { globalBucket, ipBucketKey, throttleHeaders } from "@/lib/abuse-limit";
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
  // Distributed quota: the counters above are per-instance memory, so N
  // instances meant N x free loads per IP. The shared daily bucket is the
  // authoritative cross-instance count (its hits drive loads_used/ad gating
  // below); the memory counters stay as a zero-I/O fast path + degraded
  // fallback when the shared store is unreachable.
  const sharedDay = await globalBucket(ipBucketKey(req, "guest-day"), GUEST_MAX_LOADS_PER_DAY, DAY_MS / 1000);
  if (sharedDay && !sharedDay.allowed) {
    return fail("Guest daily limit reached. Sign in; daily bonuses alone cover 5+ hours a day.", 429, throttleHeaders(sharedDay.retryAfter));
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const game = isSlug((body as Record<string, unknown> | null)?.game_slug ?? (body as Record<string, unknown> | null)?.game);
  if (!game) return fail("Invalid game_slug.", 400);

  // Loads used today: the shared bucket count when available (authoritative
  // across instances), else the in-memory per-instance counter (degraded).
  // The signed-in coin ledger remains the authoritative meter. Server also
  // issues a single-use ad token for over-quota loads so the client cannot
  // skip the interstitial by ignoring ad_required.
  const used = sharedDay ? sharedDay.hits : countGuestLoad(ip);
  const adRequired = used > GUEST_FREE_LOADS_PER_DAY;
  const date = new Date().toISOString().slice(0, 10);
  // HMAC (not plain sha) so the token can't be recomputed offline from a
  // leaked salt guess; verifyGuestAdToken() below is the server-side check
  // the next over-quota load presents. Falls back to unsalted hash only when
  // no salt is configured (dev), matching the pre-hardening form.
  const salt = process.env.SIGNUP_IP_HASH_SALT ?? "";
  const adToken = adRequired
    ? salt
      ? createHmac("sha256", salt).update(`guest-ad|${date}|${ip}|${game}|${used}`).digest("hex").slice(0, 32)
      : createHash("sha256").update(`guest|${date}|${ip}|${game}|${used}`).digest("hex").slice(0, 32)
    : null;
  // Token chaining: the first over-quota load (used == FREE+1) carries no
  // token yet, so it is allowed and issued one. Every load after that must
  // present the previous load's token (used-1, with a used-2 window for
  // multi-tab races), proving the client came through the interstitial flow
  // instead of skipping it or calling the API directly. A failed chain gets
  // 403 WITH a fresh ad + token, so the client shows the interstitial and
  // the retry succeeds.
  if (adRequired && used > GUEST_FREE_LOADS_PER_DAY + 1) {
    const presented = (body as Record<string, unknown> | null)?.ad_token;
    const chained =
      verifyGuestAdToken(presented, ip, game, used - 1, date) ||
      verifyGuestAdToken(presented, ip, game, used - 2, date);
    if (!chained) {
      return ok(
        {
          allowed: false,
          guest: true,
          game,
          loads_used: Math.min(used, GUEST_MAX_LOADS_PER_DAY),
          loads_free: GUEST_FREE_LOADS_PER_DAY,
          ad_required: true,
          ad: pickHouseAd(date, game),
          ad_token: adToken,
          note: "Show the interstitial, then retry this load with ad_token.",
        },
        403,
      );
    }
  }
  return ok({
    allowed: true,
    guest: true,
    game,
    loads_used: Math.min(used, GUEST_MAX_LOADS_PER_DAY),
    loads_free: GUEST_FREE_LOADS_PER_DAY,
    // After the free quota, every further load needs one (instantly
    // skippable) house-ad view first; the client enforces the interstitial
    // and must present ad_token on the next load (verified server-side where
    // enforced via verifyGuestAdToken).
    ad_required: adRequired,
    ad: adRequired ? pickHouseAd(date, game) : null,
    ad_token: adToken,
    note: "Guests play free with ads. Sign in for cloud saves, multiplayer, AI, Buddy; and no ads.",
  });
}

/** Verify an ad_token issued for a previous over-quota load (HMAC form). */
export function verifyGuestAdToken(token: unknown, ip: string, game: string, used: number, date: string): boolean {
  const t = String(token ?? "");
  if (!/^[0-9a-f]{32}$/.test(t)) return false;
  const salt = process.env.SIGNUP_IP_HASH_SALT ?? "";
  if (!salt) return false;
  try {
    const expect = createHmac("sha256", salt)
      .update(`guest-ad|${date}|${ip}|${game}|${used}`)
      .digest("hex")
      .slice(0, 32);
    const a = Buffer.from(expect, "utf8");
    const b = Buffer.from(t, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

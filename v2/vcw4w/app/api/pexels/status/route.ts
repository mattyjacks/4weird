import { PEXELS_CREDIT_NOTE, pexelsConfigured } from "@/lib/pexels";
import { ok } from "@/lib/api-respond";


// GET /api/pexels/status; public "is stock search live?" probe.
// Static + honest: `configured` is a boolean only (the key never leaves
// the server). Searches themselves require sign-in (search route).
export async function GET() {
  return ok({
    configured: pexelsConfigured(),
    kinds: ["image", "video"],
    costCoins: 0,
    note: PEXELS_CREDIT_NOTE,
  });
}

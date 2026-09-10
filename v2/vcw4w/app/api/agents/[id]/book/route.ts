import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase } from "@/lib/supabase/service";
import { fail, ok } from "@/lib/api-respond";
import { isUuid } from "@/lib/validate";
import { rateLimit } from "@/lib/rate-limit";
import { isHours, rpcStatus } from "@/lib/agent-market";

export const dynamic = "force-dynamic";

/** Book a listing for N hours. Auth required. The book_listing RPC escrows
 *  the gross (price x hours, includes 25% platform cut) from the renter's
 *  coin balance; 400 when the balance is insufficient. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Authentication required.", 401);
  const rl = rateLimit(`agents:book:${data.user.id}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited.", 429);
  const { id } = await params;
  if (!isUuid(id)) return fail("Invalid listing id.", 400);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const hours = isHours((body as Record<string, unknown> | null)?.hours);
  if (!hours) return fail("Hours must be 1..720.", 400);
  const { data: booking, error } = await supabase.rpc("book_listing", {
    p_listing: id,
    p_hours: hours,
  });
  if (error)
    return fail(error.message || "Unable to book listing.", rpcStatus(error.message));
  return ok({ booking });
}

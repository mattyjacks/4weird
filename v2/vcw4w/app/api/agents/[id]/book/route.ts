import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient, supabaseServiceRoleKey, supabaseUrl } from "@/lib/supabase/service";
import { fail, ok, rpcFail } from "@/lib/api-respond";
import { isUuid } from "@/lib/validate";
import { rateLimit } from "@/lib/rate-limit";
import { isHours } from "@/lib/agent-market";
import { RUNPOD_AUTO_ENDPOINT } from "@/lib/agent-market";
import { runpodProvider } from "@/lib/compute";

export const dynamic = "force-dynamic";

type ListingRow = {
  id: string;
  name: string;
  runtime: string;
  provider_code: string;
  endpoint_url: string;
  price_cents_per_hour: number;
};

/** Rent a listing (rent side). Auth required. The book_listing RPC escrows
 *  the gross MAXIMUM (price x hours, includes 25% platform cut) from the
 *  renter's coin balance; metering then bills per second up to that escrow.
 *
 *  RunPod auto listings (`runpod:auto`) are intelligently provisioned here:
 *  the cheapest Secure GPU with live stock at or under the listing's max
 *  $/hr is rented and its RunPod default proxy endpoint is stored on the
 *  booking and returned. Nothing is faked — without credentials, stock, or
 *  a budget fit the booking still exists but `provision` carries the error. */
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
  if (!hours) return fail("Hours must be 1..720 (max rental length; you are billed per second up to that cap).", 400);

  const { data: listing, error: listingError } = await supabase
    .from("agent_listings")
    .select("id,name,runtime,provider_code,endpoint_url,price_cents_per_hour")
    .eq("id", id)
    .maybeSingle();
  if (listingError) return fail("Unable to load listing.", 500);
  if (!listing) return fail("Listing not found.", 404);

  const { data: booking, error } = await supabase.rpc("book_listing", {
    p_listing: id,
    p_hours: hours,
  });
  if (error)
    return rpcFail("api/agents/book", error, (m) => {
      const l = m.toLowerCase();
      if (l.includes("authentication required")) return 401;
      if (l.includes("not authorized") || l.includes("cannot book your own")) return 403;
      if (l.includes("not found") || l.includes("not available")) return 404;
      if (l.includes("insufficient balance")) return 402;
      return 400;
    });

  const row = listing as ListingRow;
  const needsProvision =
    row.provider_code === "runpod" &&
    (!row.endpoint_url || row.endpoint_url === RUNPOD_AUTO_ENDPOINT);

  if (!needsProvision) {
    return ok({
      booking,
      connection:
        row.endpoint_url && row.endpoint_url !== RUNPOD_AUTO_ENDPOINT
          ? { endpointUrl: row.endpoint_url }
          : null,
      note: "Billed per second at up to the listing's $/hr max (includes 25% platform cut).",
    });
  }

  const provisioned = await runpodProvider.provision({
    name: row.name,
    runtime: row.runtime as "openclaw" | "nanoclaw" | "vibecodeworker" | "xonotic-vcw" | "xonotic-self" | "custom",
    maxPriceCentsPerHour: row.price_cents_per_hour,
  });

  if ("error" in provisioned) {
    return ok({
      booking,
      provision: {
        ok: false,
        code: provisioned.error,
        message:
          provisioned.error === "unconfigured"
            ? "RunPod is not configured on the server yet (RUNPOD_API_KEY). Your escrow is locked; the host will provision once it is."
            : (provisioned.message ?? "Provisioning failed. Your escrow is locked; try again or end the booking."),
      },
      note: "Billed per second at up to the listing's $/hr max (includes 25% platform cut).",
    });
  }

  // Persist the real connection on the booking (service role: bookings are RPC-written).
  try {
    if (supabaseUrl() && supabaseServiceRoleKey()) {
      const db = serviceClient();
      await db
        .from("rental_bookings")
        .update({
          pod_id: provisioned.podId,
          endpoint_url: provisioned.endpointUrl,
          gpu_type: provisioned.gpuId,
        })
        .eq("id", (booking as { id: string }).id);
    }
  } catch {
    // Read-back still returns the live values below; a failed mirror write
    // must not fail the rental itself.
  }

  const isXonotic = row.runtime === "xonotic-vcw" || row.runtime === "xonotic-self";
  return ok({
    booking: { ...(booking as object), pod_id: provisioned.podId, endpoint_url: provisioned.endpointUrl, gpu_type: provisioned.gpuId },
    provision: { ok: true, ...provisioned },
    connection: {
      endpointUrl: provisioned.endpointUrl,
      podId: provisioned.podId,
      gpu: provisioned.gpuId,
      hourlyUsd: provisioned.hourlyUsd,
      ...(isXonotic
        ? {
            game: "xonotic",
            port: 26000,
            mode: row.runtime === "xonotic-vcw" ? "VibeCodeWorker plays" : "you play",
          }
        : {}),
    },
    note: `Live on ${provisioned.gpuId} at $${provisioned.hourlyUsd.toFixed(2)}/hr (within your $${(row.price_cents_per_hour / 100).toFixed(2)}/hr max). Billed per second, includes 25% platform cut.`,
  });
}

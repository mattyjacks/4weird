import { createClient } from "@/lib/supabase/server";
import { hasServerSupabase, serviceClient, supabaseServiceRoleKey, supabaseUrl } from "@/lib/supabase/service";
import { dbFail, fail, ok, rpcFail } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { isUuid } from "@/lib/validate";
import { rateLimit } from "@/lib/rate-limit";
import { isHours, rpcStatus } from "@/lib/agent-market";
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
 *  booking and returned. Nothing is faked; without credentials, stock, or
 *  a budget fit the booking still exists but `provision` carries the error. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasServerSupabase()) return fail("Supabase is not configured.", 503);
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
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
  if (listingError) return dbFail("api/agents/book", listingError, "Unable to load listing.");
  if (!listing) return fail("Listing not found.", 404);

  // Dead-end guard BEFORE escrow: DigitalOcean has no auto-provision path
  // (see digitaloceanProvider), so a DO listing with a blank/auto endpoint
  // would lock escrow with no machine to connect to. Refuse upfront with
  // the honest reason instead of an escrowed no-op booking.
  const typed = listing as ListingRow;
  if (typed.provider_code === "digitalocean" && (!typed.endpoint_url || typed.endpoint_url === RUNPOD_AUTO_ENDPOINT)) {
    return fail("This DigitalOcean listing has no endpoint yet; the host must supply one (or configure auto-provisioning) before it can be booked. No coins were escrowed.", 409);
  }

  const { data: booking, error } = await supabase.rpc("book_listing", {
    p_listing: id,
    p_hours: hours,
  });
  if (error)
    return rpcFail("api/agents/book", error, rpcStatus, "Unable to book this listing.");

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
    try {
      console.error("[api/agents/book] provision failed", {
        bookingId: (booking as { id?: string })?.id ?? null,
        code: provisioned.error,
      });
    } catch {
      /* logging must never fail the request */
    }
    return ok({
      booking,
      provision: {
        ok: false,
        code: provisioned.error,
        message:
          provisioned.error === "unconfigured"
            ? "RunPod is not configured on the server yet (RUNPOD_API_KEY). No machine started and no usage is billed; press End below for an instant escrow refund, then re-book once configured."
            : (provisioned.message ?? "Provisioning failed. No machine started and no usage is billed; press End below for an instant escrow refund, then re-book."),
      },
      note: "Billed per second at up to the listing's $/hr max (includes 25% platform cut).",
    });
  }

  // Persist the real connection on the booking (service role: bookings are RPC-written).
  try {
    if (supabaseUrl() && supabaseServiceRoleKey()) {
      const db = serviceClient();
      const { error: mirrorError } = await db
        .from("rental_bookings")
        .update({
          pod_id: provisioned.podId,
          endpoint_url: provisioned.endpointUrl,
          gpu_type: provisioned.gpuId,
        })
        .eq("id", (booking as { id: string }).id);
      if (mirrorError) {
        console.error("[api/agents/book] mirror failed", {
          code: String(mirrorError.code ?? "").slice(0, 16),
          message: String(mirrorError.message ?? mirrorError).slice(0, 200),
        });
      }
    }
  } catch (error) {
    // Read-back still returns the live values below; a failed mirror write
    // must not fail the rental itself.
    try {
      console.error("[api/agents/book] mirror threw", String((error as Error)?.message ?? error).slice(0, 200));
    } catch {
      /* logging must never fail the request */
    }
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

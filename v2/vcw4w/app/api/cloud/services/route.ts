import { CLOUD_SERVICES } from "@/lib/cloud-catalog";
import { ok } from "@/lib/api-respond";

export const dynamic = "force-dynamic";

// GET /api/cloud/services; every cloud service + Vibe Coin price.
// Static mirror of public.cloud_services so pricing renders without auth.
export async function GET() {
  return ok({ services: CLOUD_SERVICES });
}

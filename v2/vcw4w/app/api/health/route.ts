import { ok } from "@/lib/api-respond";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok({ service: "4weird-auth", time: new Date().toISOString() });
}

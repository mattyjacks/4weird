import { ok } from "@/lib/api-respond";


export async function GET() {
  return ok({ service: "4weird-auth", time: new Date().toISOString() });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
const variantPattern = /^\d+$/;
export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data } = await (await createClient()).auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const throttle = rateLimit(`checkout:${data.user.id}`, 10, 60_000);
  if (!throttle.allowed) return NextResponse.json({ error: "Too many checkout attempts. Try again shortly." }, { status: 429, headers: { "Retry-After": String(throttle.retryAfter) } });
  const store = (process.env.SHOPIFY_STORE_DOMAIN ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/.test(store)) return NextResponse.json({ error: "Shop not configured." }, { status: 503 });
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const variantId = typeof body === "object" && body !== null && "variantId" in body ? String((body as { variantId?: unknown }).variantId ?? "") : "";
  if (!variantPattern.test(variantId)) return NextResponse.json({ error: "A valid product variant is required." }, { status: 400 });
  const allowed = (process.env.SHOPIFY_ALLOWED_VARIANTS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  if (allowed.length && !allowed.includes(variantId)) return NextResponse.json({ error: "This coin pack is not available." }, { status: 400 });
  // Custom amounts ride on a $0.01-per-unit variant: quantity equals coins.
  const customVariant = (process.env.COIN_CUSTOM_VARIANT ?? "").trim();
  let qty = 1;
  if (customVariant && variantId === customVariant) {
    const wanted = Number(typeof body === "object" && body !== null && "quantity" in body ? (body as { quantity?: unknown }).quantity : NaN);
    if (!Number.isInteger(wanted) || wanted < 500 || wanted > 100000) return NextResponse.json({ error: "Custom amounts need 500–100000 coins." }, { status: 400 });
    qty = wanted;
  }
  return NextResponse.json({ url: `https://${store}/cart/${encodeURIComponent(variantId)}:${qty}` }, { headers: { "Cache-Control": "private, no-store" } });
}

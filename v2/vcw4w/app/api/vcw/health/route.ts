import { fail, ok } from "@/lib/api-respond";

export const dynamic = "force-dynamic";

/**
 * VibeCodeWorker service health. The upstream response body is never
 * reflected: only a coarse status leaves this route, so internal service
 * details cannot leak through it. VCW_SERVICE_URL is server configuration,
 * never request input (no SSRF surface).
 */
export async function GET() {
  const base = (process.env.VCW_SERVICE_URL ?? "").replace(/\/$/, "");
  let target: URL;
  try {
    target = new URL(`${base}/health`);
    if (target.protocol !== "http:" && target.protocol !== "https:") throw new Error("bad protocol");
  } catch {
    return fail("Worker service is not configured.", 503);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(target, { signal: controller.signal, cache: "no-store" });
    // Drain the body so the connection can be reused; never forward it.
    await response.arrayBuffer().catch(() => null);
    if (!response.ok) return fail("Worker service is degraded.", 502);
    return ok({ status: "ok", service: "vibecodeworker" });
  } catch (error) {
    const reason = error instanceof Error && error.name === "AbortError" ? "timeout" : "connection_failed";
    return fail(`Worker service is unavailable (${reason}).`, 502);
  } finally {
    clearTimeout(timer);
  }
}

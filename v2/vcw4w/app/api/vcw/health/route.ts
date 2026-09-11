import { ok } from "@/lib/api-respond";

export const dynamic = "force-dynamic";

/**
 * VibeCodeWorker service health. The upstream response body is never
 * reflected: only a coarse status leaves this route, so internal service
 * details cannot leak through it. VCW_SERVICE_URL is server configuration,
 * never request input (no SSRF surface).
 *
 * Always answers 200 when the check itself ran: clients key off the `status`
 * field ("ok" | "unconfigured" | "degraded" | "unavailable"), so a missing
 * env var shows as honest UI text instead of a console-spamming 503.
 */
export async function GET() {
  const base = (process.env.VCW_SERVICE_URL ?? "").replace(/\/$/, "");
  let target: URL;
  try {
    target = new URL(`${base}/health`);
    if (target.protocol !== "http:" && target.protocol !== "https:") throw new Error("bad protocol");
  } catch {
    return ok({ status: "unconfigured", service: "vibecodeworker" });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(target, { signal: controller.signal, cache: "no-store" });
    // Drain the body so the connection can be reused; never forward it.
    await response.arrayBuffer().catch(() => null);
    if (!response.ok) return ok({ status: "degraded", service: "vibecodeworker" });
    return ok({ status: "ok", service: "vibecodeworker" });
  } catch (error) {
    const reason = error instanceof Error && error.name === "AbortError" ? "timeout" : "connection_failed";
    return ok({ status: "unavailable", service: "vibecodeworker", reason });
  } finally {
    clearTimeout(timer);
  }
}

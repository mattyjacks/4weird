import { NextResponse } from "next/server";
import { MONITORING_NOTICE, type AppRequest } from "@/lib/it-command";

export const dynamic = "force-dynamic";

// Demo-safe, monitored: no auth. In-memory only (resets on redeploy).
// No DB writes; Boss/IT review pending requests in logs.

type StoredRequest = AppRequest & { at: string };

const requests: StoredRequest[] = [];
const MAX_REQUESTS = 100;

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `req-${Date.now()}`;
  }
}

// GET /api/it/requests — list pending app requests (newest first).
export async function GET() {
  try {
    return NextResponse.json(
      { success: true, requests, notice: MONITORING_NOTICE },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to load requests." },
      { status: 500 },
    );
  }
}

// POST /api/it/requests — { appName (2-80), reason (5-500) }.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as {
      appName?: unknown;
      reason?: unknown;
    } | null;
    const appName = String(body?.appName ?? "").trim();
    const reason = String(body?.reason ?? "").trim();

    if (appName.length < 2 || appName.length > 80) {
      return NextResponse.json(
        { success: false, error: "appName must be 2-80 characters." },
        { status: 400 },
      );
    }
    if (reason.length < 5 || reason.length > 500) {
      return NextResponse.json(
        { success: false, error: "reason must be 5-500 characters." },
        { status: 400 },
      );
    }

    const request: StoredRequest = {
      id: newId(),
      appName,
      reason,
      status: "pending",
      at: new Date().toISOString(),
    };
    requests.unshift(request);
    if (requests.length > MAX_REQUESTS) requests.length = MAX_REQUESTS;

    return NextResponse.json({ success: true, request }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to save request." },
      { status: 500 },
    );
  }
}

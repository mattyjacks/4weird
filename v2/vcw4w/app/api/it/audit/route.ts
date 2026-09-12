import { NextResponse } from "next/server";
import { MONITORING_NOTICE } from "@/lib/it-command";
import {
  AUDIT_ACTIONS,
  AUDIT_RETENTION_DAYS,
  buildAuditEvent,
} from "@/lib/it-audit";

export const dynamic = "force-dynamic";

// Demo-safe: no auth, no persistence. GET serves sample rows;
// POST validates and echoes back the built event (nothing stored).

const DEMO_EVENTS = [
  buildAuditEvent("it_admin", "login", "console"),
  buildAuditEvent("boss", "app.approve", "Figma"),
  buildAuditEvent("employee", "file.upload", "report.pdf"),
  buildAuditEvent("employee", "agent.book", "demo-agent"),
  buildAuditEvent("it_admin", "policy.update", "approved-apps"),
];

// GET /api/it/audit — 5 sample audit rows + disclosure.
export async function GET() {
  try {
    return NextResponse.json(
      {
        success: true,
        events: DEMO_EVENTS,
        notice: MONITORING_NOTICE,
        retentionDays: AUDIT_RETENTION_DAYS,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to load audit events." },
      { status: 500 },
    );
  }
}

// POST /api/it/audit — { actor (1-80), action (in AUDIT_ACTIONS), target? }.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as {
      actor?: unknown;
      action?: unknown;
      target?: unknown;
    } | null;
    const actor = String(body?.actor ?? "").trim();
    const action = String(body?.action ?? "").trim();
    const target = String(body?.target ?? "").trim();

    if (actor.length < 1 || actor.length > 80) {
      return NextResponse.json(
        { success: false, error: "actor must be 1-80 characters." },
        { status: 400 },
      );
    }
    if (!AUDIT_ACTIONS.includes(action)) {
      return NextResponse.json(
        { success: false, error: `action must be one of: ${AUDIT_ACTIONS.join(", ")}.` },
        { status: 400 },
      );
    }
    if (target.length > 300) {
      return NextResponse.json(
        { success: false, error: "target must be 0-300 characters." },
        { status: 400 },
      );
    }

    const event = buildAuditEvent(actor, action, target);
    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to build audit event." },
      { status: 500 },
    );
  }
}

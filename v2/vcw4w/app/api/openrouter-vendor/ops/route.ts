// GET /api/openrouter-vendor/ops; public catalog of the 3 OpenRouter vendor modules.
// Static + honest: prices render without auth; `configured` is a boolean
// only (the key never leaves the server).
//
// Tolerant loading: sibling agents are writing lib/openrouter-chat.ts,
// lib/openrouter-agent.ts and lib/openrouter-meta.ts in parallel, so each
// vendor is dynamically imported with a try/catch fallback. A missing module
// yields { ok:false, error:"catalog unavailable" } for that vendor — never a
// 500 for the whole route.
import { ok } from "@/lib/api-respond";

type OpEntry = {
  op: string;
  name: string;
  unit: string;
  coinsPerUnit: number;
  blurb: string;
  api: string;
};

type VendorResult =
  | { vendor: string; ok: true; ops: OpEntry[]; count: number }
  | { vendor: string; ok: false; error: "catalog unavailable" };

function normalizeOps(raw: unknown): OpEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: OpEntry[] = [];
  for (const item of raw as Record<string, unknown>[]) {
    if (!item || typeof item.op !== "string" || !item.op) continue;
    out.push({
      op: item.op,
      name: String(item.name ?? item.op),
      unit: String(item.unit ?? "call"),
      coinsPerUnit: Number(item.coinsPerUnit ?? 0) || 0,
      blurb: String(item.blurb ?? ""),
      api: String(item.api ?? ""),
    });
  }
  return out;
}

function opsFromModule(mod: Record<string, unknown>): OpEntry[] {
  const candidates = [
    mod.OPS,
    mod.OP_DEFS,
    mod.OPENROUTER_CHAT_OPS,
    mod.OPENROUTER_AGENT_OPS,
    mod.OPENROUTER_META_OPS,
  ];
  for (const c of candidates) {
    const ops = normalizeOps(c);
    if (ops.length > 0) return ops;
  }
  // Fallback shape: OP_KEYS array + a lookup (opsByKey / OP_MAP / defFor).
  const keys = mod.OP_KEYS;
  if (Array.isArray(keys)) {
    const lookup =
      (mod.opsByKey as ((op: string) => Record<string, unknown>) | undefined) ??
      (mod.OP_MAP as Record<string, Record<string, unknown>> | undefined);
    const out: OpEntry[] = [];
    for (const k of keys as unknown[]) {
      if (typeof k !== "string" || !k) continue;
      let def: Record<string, unknown> | undefined;
      try {
        if (typeof lookup === "function") def = lookup(k) as Record<string, unknown>;
        else if (lookup && typeof lookup === "object") def = lookup[k];
      } catch {
        def = undefined;
      }
      out.push({
        op: k,
        name: String(def?.name ?? k),
        unit: String(def?.unit ?? "call"),
        coinsPerUnit: Number(def?.coinsPerUnit ?? 0) || 0,
        blurb: String(def?.blurb ?? ""),
        api: String(def?.api ?? ""),
      });
    }
    if (out.length > 0) return out;
  }
  return [];
}

async function loadVendor(specifier: string, vendor: string): Promise<VendorResult> {
  try {
    const mod = (await import(
      /* webpackIgnore: false */ specifier
    )) as Record<string, unknown>;
    const ops = opsFromModule(mod);
    if (ops.length === 0) return { vendor, ok: false, error: "catalog unavailable" };
    return { vendor, ops, ok: true, count: ops.length };
  } catch {
    return { vendor, ok: false, error: "catalog unavailable" };
  }
}

export function openrouterConfigured(): boolean {
  return String(process.env.OPENROUTER_API_KEY ?? "").trim().length > 0;
}

export async function GET() {
  const vendors = await Promise.all([
    loadVendor("@/lib/openrouter-chat", "openrouter-chat"),
    loadVendor("@/lib/openrouter-agent", "openrouter-agent"),
    loadVendor("@/lib/openrouter-meta", "openrouter-meta"),
  ]);
  const available = vendors.filter(
    (v): v is Extract<VendorResult, { ok: true }> => v.ok,
  );
  const total = available.reduce((n, v) => n + v.count, 0);
  return ok({
    vendors,
    count: total,
    configured: openrouterConfigured(),
    note: "OpenRouter vendor catalog: chat + agent + meta; quotes include the platform cut.",
    hint: "Set OPENROUTER_API_KEY on the server to run live OpenRouter generations.",
  });
}

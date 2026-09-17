import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import VocrehabGamePaycheckPlan from "@/components/vocrehab/vocrehab-game-paycheck-plan";
import { parseSeed } from "@/lib/vocrehab-seed";

async function vocrehabSavePaycheckRun(events: { t_ms: number; kind: string; detail: Record<string, unknown> }[], summary?: Record<string, unknown>): Promise<boolean | "guest" | "error"> {
  "use server";
  try {
    const requestHeaders = await headers();
    const cookie = requestHeaders.get("cookie") ?? "";
    const req = new Request("https://vocrehab.local/api/vocrehab/games", { method: "POST", headers: { "Content-Type": "application/json", cookie }, body: JSON.stringify({ game_id: "paycheck-plan", events, summary }) });
    const { POST } = await import("@/app/api/vocrehab/games/route");
    const res = await POST(req);
    return res.status === 401 ? "guest" : res.ok;
  } catch { return "error"; }
}

export const metadata: Metadata = {
  title: "Paycheck Planner | VocRehab",
  description: "VocRehab paycheck planning game: plan a paycheck across real-life priorities.",
  alternates: { canonical: "/vocrehab/play/paycheck-plan" },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ seed?: string | string[]; savedStateId?: string | string[]; kid_id?: string | string[] }> }) {
  const params = await searchParams;
  const seed = parseSeed(typeof params.seed === "string" ? params.seed : null) ?? undefined;
  const savedStateId = typeof params.savedStateId === "string" ? params.savedStateId : undefined;
  const kidId = typeof params.kid_id === "string" ? params.kid_id : undefined;
  return (
    <main className="mx-auto max-w-3xl space-y-3 p-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/vocrehab/play">Work & Life Practice Games</Link> → Paycheck Planner
      </nav>
      <h1 className="text-xl font-bold">Paycheck Planner</h1>
      <VocrehabGamePaycheckPlan vocrehabGameId="paycheck-plan" vocrehabSeed={seed} vocrehabSavedStateId={savedStateId} vocrehabKidId={kidId} vocrehabOnComplete={vocrehabSavePaycheckRun} />
    </main>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";
import { BotSetupClient } from "./bot-setup";
import { BotKeyGuide } from "@/components/bot/bot-key-guide";
import { AgentBotNav } from "@/components/agents/agent-bot-nav";

export const metadata: Metadata = {
  alternates: { canonical: "/bot/setup" },
  title: "Bot setup - 4weird",
  description:
    "Claim your bot identity, issue API keys, and connect game-dev AI and automation to the 4weird clan platform.",
};

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";
import { BotSetupClient } from "./bot-setup";
import { BotKeyGuide } from "@/components/bot/bot-key-guide";
import { AgentBotNav } from "@/components/agents/agent-bot-nav";

export const metadata: Metadata = {
  alternates: { canonical: "/bot/setup" },
  title: "Bot setup - 4weird",
  description:
    "Claim your bot identity, issue API keys, and connect game-dev AI and automation to the 4weird clan platform.",
};

export const dynamic = "force-dynamic";

// NOTE: no 'use cache' here — per-user bot identity + API keys stream in
// Suspense so credentials are never cached.
async function BotSetupBody() {
  if (!hasEnvVars) {
    return (
      <section className="mx-auto max-w-4xl px-5 py-20">
        <h1 className="text-4xl font-black">Bot setup</h1>
        <p className="mt-4 text-slate-300">
          Sign-in is not configured on this deployment yet. Add Supabase variables from{" "}
          <code>.env.example</code>.
        </p>
      </section>
    );
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/auth/login?next=/bot/setup");
  return (
    <section className="mx-auto max-w-4xl px-5 py-12">
      <p className="text-sm text-slate-400">Signed in as {String(data.claims.email ?? "player")}.</p>
      <h1 className="mt-2 text-4xl font-black">Bot setup</h1>
      <AgentBotNav current="/bot/setup" />
      <p className="mt-3 max-w-2xl text-slate-300">
        Give your game-dev AI or automation a bot identity, issue it an API key, and let it read,
        post, and organize in clans - acting as your account. Agent console:{" "}
        <a className="text-cyan-300 hover:underline" href="/bot/bclans">
          /bot/bclans
        </a>{" "}
        · Full agent guide:{" "}
        <a className="text-cyan-300 hover:underline" href="/bot/skill.md">
          /bot/skill.md
        </a>{" "}
        · Run it in the cloud (NanoClaw recommended, serverful or serverless, website chat + Telegram):{" "}
        <a className="text-cyan-300 hover:underline" href="/agents">
          /agents
        </a>{" "}
        · Guides:{" "}
        <a className="text-cyan-300 hover:underline" href="/docs/bots">
          /docs/bots
        </a>
        ,{" "}
        <a className="text-cyan-300 hover:underline" href="/docs/agents-compute">
          /docs/agents-compute
        </a>
        .
      </p>
      <div className="mt-8 space-y-6">
        <BotKeyGuide />
        <Suspense fallback={<p className="text-sm text-slate-400">Loading your bot keys…</p>}>
          <BotSetupClient />
        </Suspense>
      </div>
    </section>
  );
}

export default function BotSetupPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Suspense
        fallback={
          <section className="mx-auto max-w-4xl px-5 py-12" aria-busy="true" aria-label="Loading bot setup">
            <h1 className="mt-2 text-4xl font-black">Bot setup</h1>
            <p className="mt-3 max-w-2xl text-slate-300">Claim a bot identity and issue API keys after sign-in.</p>
            <div className="mt-8 animate-pulse space-y-6">
              <div className="h-32 rounded-2xl border border-white/10 bg-white/[.04]" />
              <div className="h-48 rounded-2xl border border-white/10 bg-white/[.04]" />
            </div>
          </section>
        }
      >
        <BotSetupBody />
      </Suspense>
    </main>
  );
}

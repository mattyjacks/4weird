"use client";

import dynamic from "next/dynamic";

const SwarmChatInner = dynamic(
  () => import("@/components/swarm/swarm-chat").then((m) => m.SwarmChat),
  {
    ssr: false,
    loading: () => (
      <div aria-busy="true" className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <div className="h-5 w-48 animate-pulse rounded bg-slate-800" />
        <div className="mt-3 h-24 animate-pulse rounded-lg bg-slate-800/60" />
        <div className="mt-3 flex gap-2">
          <div className="h-10 flex-1 animate-pulse rounded-md bg-slate-800/60" />
          <div className="h-10 w-20 animate-pulse rounded-md bg-slate-800/60" />
        </div>
      </div>
    ),
  },
);

export function SwarmChatLazy() {
  return <SwarmChatInner />;
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  vocrehabDisclosureGraph,
  vocrehabDisclosureTransition,
  type VocrehabDisclosureNodeId,
} from "@/lib/vocrehab-disclosure";

export default function VocrehabDisclosureTree() {
  const [current, setCurrent] = useState<VocrehabDisclosureNodeId>("start");
  const [path, setPath] = useState<VocrehabDisclosureNodeId[]>(["start"]);
  const [notice, setNotice] = useState<string | null>(null);

  const node = useMemo(() => vocrehabDisclosureGraph[current], [current]);

  async function go(to: VocrehabDisclosureNodeId) {
    const local = vocrehabDisclosureTransition(current, to);
    if (!local.ok) {
      setNotice(`Skipped: ${local.reason}`);
      return;
    }
    setNotice(null);
    try {
      const res = await fetch("/api/vocrehab/disclosure", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ from: current, to }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setNotice(`Server check: ${body?.error ?? "that jump is not allowed."}`);
        return;
      }
    } catch {
      // Offline-tolerant: local validator already approved the step.
    }
    setCurrent(to);
    setPath((p) => [...p, to]);
  }

  function backTo(step: VocrehabDisclosureNodeId) {
    // Breadcrumb travel replays locally-validated steps only.
    let cursor: VocrehabDisclosureNodeId = "start";
    const replay: VocrehabDisclosureNodeId[] = ["start"];
    for (const next of path.slice(1)) {
      const t = vocrehabDisclosureTransition(cursor, next);
      if (!t.ok) break;
      cursor = next;
      replay.push(next);
      if (next === step) break;
    }
    if (replay.includes(step)) {
      setCurrent(step);
      setPath(replay.slice(0, replay.indexOf(step) + 1));
      setNotice(null);
    }
  }

  return (
    <section aria-labelledby="vocrehab-disclosure-heading" className="space-y-4">
      <h2 id="vocrehab-disclosure-heading" className="text-xl font-bold">
        Disclosure paths adventure
      </h2>

      <nav aria-label="Your path breadcrumb">
        <ol className="flex flex-wrap gap-1 text-sm">
          {path.map((step, i) => (
            <li key={`${step}-${i}`} className="flex items-center gap-1">
              {i > 0 ? <span aria-hidden="true">→</span> : null}
              <button
                type="button"
                onClick={() => backTo(step)}
                className="rounded-full border border-white/20 px-3 py-1 hover:bg-white/10"
              >
                {vocrehabDisclosureGraph[step].title}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <article
        aria-live="polite"
        className="space-y-3 rounded-xl border border-white/15 p-5"
      >
        <h3 className="text-lg font-bold">{node.title}</h3>
        <p className="text-sm leading-relaxed">{node.copy}</p>
        <p className="rounded-lg bg-white/5 p-3 text-sm italic">Script starter: {node.scriptStarter}</p>
        <div className="flex flex-wrap gap-2">
          {node.exits.map((exit) => (
            <button
              key={exit.to}
              type="button"
              onClick={() => void go(exit.to)}
              className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950"
            >
              {exit.label}
            </button>
          ))}
        </div>
        {notice ? (
          <p role="alert" className="text-sm text-amber-300">
            {notice}
          </p>
        ) : null}
      </article>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          href="/vocrehab/interview/disclosure"
          className="rounded-full border border-white/20 px-4 py-2"
        >
          Rehearse this branch
        </Link>
        <Link href="/vocrehab/decide" className="rounded-full border border-white/20 px-4 py-2">
          Exit: back to Decide hub
        </Link>
        <Link href="/vocrehab" className="rounded-full border border-white/20 px-4 py-2">
          Exit: back to VocRehab home
        </Link>
      </div>
    </section>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { CrmWorkspace } from "@/components/crm/crm-workspace";

export const metadata: Metadata = {
  alternates: { canonical: "/business/crm" },
  title: "Business CRM",
  description: "Epic org-scoped CRM: pipeline, contacts, activities, invoices",
};

const STAGE_PILLS = ["Lead", "Active", "Closed", "Archived"] as const;

// Static demo preview: shown while the workspace resolves (loading, empty, or
// auth-gated state) so new users immediately see what the CRM offers.
function CrmDemoPreview() {
  const cols: { stage: string; cards: { title: string; coins: string }[] }[] = [
    {
      stage: "Lead",
      cards: [
        { title: "Acme — onboarding call", coins: "12,000 🪙" },
        { title: "Pixel Forge — demo", coins: "8,500 🪙" },
      ],
    },
    {
      stage: "Qualified",
      cards: [
        { title: "Nebulaclan — pilot", coins: "21,000 🪙" },
        { title: "Lootworks — trial", coins: "6,200 🪙" },
      ],
    },
    {
      stage: "Proposal",
      cards: [
        { title: "Starforge — tier 2", coins: "34,000 🪙" },
        { title: "Bit & Bridle — renewal", coins: "9,900 🪙" },
      ],
    },
    {
      stage: "Won",
      cards: [
        { title: "Ghostline — annual", coins: "48,000 🪙" },
        { title: "Fable Foundry — add-on", coins: "5,400 🪙" },
      ],
    },
  ];
  const contacts = [
    { name: "Ada Lovelace", company: "Acme", status: "Active" },
    { name: "Ken Thompson", company: "Pixel Forge", status: "Lead" },
    { name: "Grace Hopper", company: "Starforge", status: "Active" },
  ];
  return (
    <div aria-hidden="true" className="mt-3 select-none">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {cols.map((c) => (
          <div key={c.stage} className="rounded-lg border border-white/10 bg-white/[.03] p-2">
            <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-cyan-300">
              {c.stage}
            </p>
            <div className="mt-1.5 space-y-1.5">
              {c.cards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-md border border-white/10 bg-slate-950 px-2 py-1.5"
                >
                  <p className="truncate text-xs font-semibold text-slate-100">{card.title}</p>
                  <p className="text-[11px] text-slate-400">{card.coins}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 overflow-hidden rounded-lg border border-white/10">
        {contacts.map((c) => (
          <div
            key={c.name}
            className="flex h-9 items-center gap-3 border-b border-white/5 bg-white/[.02] px-3 text-xs last:border-0"
          >
            <span className="font-semibold text-slate-100">{c.name}</span>
            <span className="text-slate-400">{c.company}</span>
            <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">
              {c.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CrmPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-none px-3 py-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-cyan-300">
            4WEIRD // BUSINESS
          </p>
          <h1 className="text-xl font-black">Epic CRM</h1>
          <p className="w-full truncate text-xs text-slate-400">
            Org-scoped pipeline, contacts, companies, activities, and invoices — settled in coins.
          </p>
        </div>

        {/* 36px docked quick-add toolbar */}
        <div className="mt-2 flex h-9 items-center gap-1.5 overflow-x-auto rounded-lg border border-white/10 bg-white/[.03] px-2">
          <a
            href="#crm-workspace"
            className="h-7 shrink-0 rounded-md bg-cyan-300 px-2.5 text-xs font-bold leading-7 text-slate-950 hover:bg-cyan-200"
          >
            + Add Lead
          </a>
          <a
            href="#crm-workspace"
            className="h-7 shrink-0 rounded-md border border-white/15 bg-white/5 px-2.5 text-xs font-semibold leading-7 text-slate-200 hover:bg-white/10"
          >
            + Contact
          </a>
          <span aria-hidden="true" className="mx-1 h-4 w-px shrink-0 bg-white/10" />
          {STAGE_PILLS.map((pill) => (
            <a
              key={pill}
              href="#crm-workspace"
              title="Jump to the workspace filters"
              className="h-6 shrink-0 rounded-full border border-white/15 bg-white/5 px-2.5 text-[11px] font-semibold leading-6 text-slate-300 hover:border-cyan-300/50 hover:text-cyan-200"
            >
              {pill}
            </a>
          ))}
        </div>

        <div id="crm-workspace" className="mt-2 scroll-mt-4">
          {/* Per-org workspace: never cached. Static header streams in the
              shell; pipeline/contacts/activities resolve at request time. */}
          <Suspense
            fallback={
              <div role="status">
                <p className="rounded-lg border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-slate-400">
                  Loading your CRM workspace… preview below.
                </p>
                <CrmDemoPreview />
              </div>
            }
          >
            <CrmWorkspace />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

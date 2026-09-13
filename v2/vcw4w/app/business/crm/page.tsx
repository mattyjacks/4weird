import type { Metadata } from "next";
import { Suspense } from "react";
import { CrmWorkspace } from "@/components/crm/crm-workspace";

export const metadata: Metadata = {
  alternates: { canonical: "/business/crm" },
  title: "Business CRM",
  description: "Epic org-scoped CRM: pipeline, contacts, activities, invoices",
};

export default function CrmPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-5xl px-5 py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">4WEIRD // BUSINESS</p>
        <h1 className="mt-2 text-4xl font-black">Epic CRM</h1>
        <p className="mt-4 max-w-3xl text-slate-300">
          Org-scoped pipeline, contacts, companies, activities, and invoices — settled in coins,
          gated per org, defensive when the API is still deploying.
        </p>
        <div className="mt-10">
          {/* Per-org workspace: never cached. Static header streams in the
              shell; pipeline/contacts/activities resolve at request time. */}
          <Suspense
            fallback={
              <p role="status" className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400">
                Loading your CRM workspace…
              </p>
            }
          >
            <CrmWorkspace />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

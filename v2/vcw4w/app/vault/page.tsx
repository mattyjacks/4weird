import type { Metadata } from "next";
import { Suspense } from "react";
import { VaultBrowser } from "@/components/vault/vault-browser";
import { VAULT_CUT_NOTE } from "@/lib/blob-vault";

const SUITE_RAIL = [
  { href: "/squads", label: "UnitUnite", emoji: "🛡️" },
  { href: "/squads#orgs", label: "Orgs & Teams", emoji: "🏢" },
  { href: "/timer", label: "Timer & Work Diary", emoji: "⏱️" },
  { href: "/business/invoices", label: "Invoices", emoji: "🧾" },
  { href: "/business/tax", label: "Tax Info Bot", emoji: "🤖" },
  { href: "/business/crm", label: "Business CRM", emoji: "👥" },
  { href: "/submit", label: "Submit game", emoji: "📦" },
  { href: "/meshy", label: "Meshy 3D", emoji: "🧊" },
];

export const metadata: Metadata = {
  alternates: { canonical: "/vault" },
  title: "Weird Vault; your game files | 4weird",
  description: `Blob-based file storage on Supabase for game code + assets. Personal, team, and org scopes, strictly separated. ${VAULT_CUT_NOTE}`,
};

export default function VaultPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex max-w-7xl gap-2 px-3 py-3">
        {/* 48px left icon sidebar: the 8 suite links as compact rail icons (was: full-width marketing card grid). */}
        <aside aria-label="Business suite" className="sticky top-3 flex h-fit w-12 shrink-0 flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/[.03] py-2">
          {SUITE_RAIL.map((a) => (
            <a
              key={`${a.href}-${a.label}`}
              href={a.href}
              title={a.label}
              aria-label={a.label}
              className="grid h-9 w-9 place-items-center rounded-lg text-lg transition hover:border hover:border-cyan-300/40 hover:bg-white/[.07]"
            >
              <span aria-hidden="true">{a.emoji}</span>
            </a>
          ))}
        </aside>

        <section className="min-w-0 flex-1">
          {/* 40px unified explorer toolbar: scope tabs + search filter + Upload / New Folder actions (live controls inside VaultBrowser). */}
          <header className="flex h-10 items-center gap-2 overflow-hidden rounded-xl border border-white/10 bg-white/[.03] px-2">
            <h1 className="shrink-0 truncate text-sm font-black">🗄️ Weird Vault</h1>
            <nav aria-label="Scopes" className="hidden items-center gap-1 md:flex">
              {["Personal", "Team", "Org", "Trash"].map((s) => (
                <a key={s} href="#vault-browser" title={`Jump to file browser (${s} scope)`} className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] font-bold text-slate-300 hover:border-cyan-300/40">
                  {s}
                </a>
              ))}
            </nav>
            <form method="get" action="#vault-browser" role="search" aria-label="Filter files" className="hidden min-w-0 flex-1 items-center md:flex">
              <input
                name="q"
                type="search"
                placeholder="Filter files…"
                aria-label="Filter files"
                className="h-7 w-full min-w-0 rounded-full border border-white/10 bg-slate-950/60 px-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-300/40 focus:outline-none"
              />
            </form>
            <span className="hidden min-w-0 truncate text-[11px] text-slate-400 xl:block">
              50 MB/file · 500 MB free Personal · ~3 coins/GB-month overage
            </span>
            <span className="ml-auto flex shrink-0 items-center gap-1">
              <a href="#vault-browser" title="Create a new folder in the file browser below" className="rounded-full border border-white/10 px-2 py-1 text-xs font-bold text-slate-200 hover:border-cyan-300/40">
                + New Folder
              </a>
              <a href="#vault-browser" className="shrink-0 rounded-full bg-cyan-600 px-3 py-1 text-xs font-black hover:bg-cyan-500">
                + Upload
              </a>
            </span>
          </header>

          {/* Full-viewport file table (calc(100vh-120px)) with overlay upload hint — the live dropzone/modal ships inside VaultBrowser (component-owned); this page keeps zero static dropzone height. */}
          <div id="vault-browser" className="relative mt-2 min-h-80 scroll-mt-3 overflow-auto rounded-xl border border-white/10 bg-white/[.02] [height:calc(100vh-120px)]">
            <div className="pointer-events-none sticky inset-x-0 top-0 z-10 flex justify-center p-2">
              <p className="pointer-events-auto rounded-full border border-dashed border-cyan-300/40 bg-slate-950/80 px-3 py-1 text-[11px] font-bold text-slate-300">
                Drop files anywhere to upload · or use + Upload
              </p>
            </div>
            <div className="px-2 pb-2">
              <Suspense fallback={<p className="text-sm text-slate-400">Loading Vault…</p>}>
                <VaultBrowser />
              </Suspense>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import { VaultBrowser } from "@/components/vault/vault-browser";
import { BusinessCrosslinks } from "@/components/business/business-crosslinks";
import { VAULT_CUT_NOTE } from "@/lib/blob-vault";

export const metadata: Metadata = {
  alternates: { canonical: "/vault" },
  title: "Weird Vault; your game files | 4weird",
  description: `Blob-based file storage on Supabase for game code + assets. Personal, team, and org scopes, strictly separated. ${VAULT_CUT_NOTE}`,
};

export default function VaultPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-5xl px-5 py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">Weird Vault · private files</p>
        <h1 className="mt-2 text-4xl font-black">🗄️ Weird Vault</h1>
        <p className="mt-4 max-w-3xl text-slate-300">
          Blob-based file storage on Supabase for your game code and assets; including
          art minted by VCW with fal.ai tools and 3D from Meshy.ai. Personal, team, and
          organization scopes are strictly separated (one scope per file, enforced in the
          database). AI-made models, images, animations, code, chats, logs, audio, video,
          and text autosave here and stay ready to work on.
        </p>
        <p className="mt-4 max-w-3xl text-sm text-slate-400">
          For business use: keep contracts, invoices, and brand assets under <b>team</b> or <b>org</b> scopes so
          the whole squad (or whole company) can reach them — personal scope stays private. Billable shift
          proof from the Timer and client files from the CRM land here too.
        </p>
        <div className="mt-6">
          <BusinessCrosslinks exclude={["/vault"]} />
        </div>
        <div className="mt-10">
          <VaultBrowser />
        </div>
      </section>
    </main>
  );
}

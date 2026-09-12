import { DocsNav } from "@/components/docs/docs-nav";
import { DocsReadTracker } from "@/components/docs/docs-read-tracker";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-5 sm:py-14 lg:grid-cols-[290px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <DocsNav />
          <DocsReadTracker />
          <div className="mt-4 hidden rounded-3xl border border-dashed border-cyan-500/40 bg-cyan-500/5 p-4 text-xs leading-relaxed text-muted-foreground lg:block">
            <p className="font-black text-foreground">💡 Docs promise</p>
            <p className="mt-1">
              Every price here already includes the 25% cut. 100 🪙 = exactly $1.00; no asterisks.
            </p>
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

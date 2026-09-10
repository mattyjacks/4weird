import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";

export function SiteFooter() {
  return <footer className="border-t border-white/10 bg-slate-950 px-5 py-10 text-center text-sm text-slate-400"><nav aria-label="Footer navigation" className="mb-4 flex flex-wrap justify-center gap-x-5 gap-y-2"><Link className="font-semibold text-cyan-200 underline-offset-4 hover:underline" href="/terms">Terms of Use</Link><Link className="font-semibold text-cyan-200 underline-offset-4 hover:underline" href="/privacy">Privacy Policy</Link><Link href="/my/rights">My Privacy Rights</Link><Link href="/accessibility">Accessibility</Link><Link href="/games">Games</Link><Link href="/pricing">Pricing</Link><Link href="/tech">Technology</Link></nav><div className="mb-4 flex items-center justify-center gap-2"><span>Theme</span><ThemeSwitcher /></div><p>© 2026 MattyJacks LLC · 4weird Games · New Hampshire, USA</p></footer>;
}

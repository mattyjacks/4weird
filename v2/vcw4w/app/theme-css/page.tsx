import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Themes | 4weird",
  description:
    "4weird site themes: pick the palette saved on this device. Themes are CSS-only and never track you.",
  alternates: { canonical: "/theme-css" },
};

// Additive bridge (DS-PAGEFIX-01): app/theme-css/** previously shipped only
// raw *.css theme files, so GET /theme-css 404'd. This static index makes the
// route return 200 without touching any theme CSS, shared manifest, or lane
// file. Theme switching itself stays in the existing switcher component that
// persists the choice in localStorage.
const THEMES = [
  { id: "theme-usa", label: "USA USA", file: "usa.css" },
  { id: "theme-blue-boy", label: "Blue Boy", file: "blue-boy.css" },
  { id: "theme-girly-girl", label: "Girly Girl", file: "girly-girl.css" },
  { id: "theme-green-guy", label: "Green Guy", file: "green-guy.css" },
  { id: "theme-trans-them", label: "Trans Them", file: "trans-them.css" },
] as const;

export default function ThemeCssIndexPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-5">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-300">
        Site themes
      </p>
      <h1 className="mt-2 text-2xl font-black tracking-tight">Themes</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        4weird ships five CSS-only palettes. Your choice is saved on this
        device only — no account, no tracking. Switch anytime from the theme
        switcher in the site header.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {THEMES.map((t) => (
          <li
            key={t.id}
            className="rounded-2xl border border-border bg-card p-3.5"
          >
            <p className="font-bold">{t.label}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {t.id} · {t.file}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm">
        <Link
          href="/accessibility"
          className="font-semibold text-cyan-600 hover:underline dark:text-cyan-300"
        >
          Accessibility settings →
        </Link>
      </p>
    </main>
  );
}

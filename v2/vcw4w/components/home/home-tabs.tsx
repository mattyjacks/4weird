"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "arcade", label: "Arcade", emoji: "🎮" },
  { key: "compute", label: "Compute & Agents", emoji: "💻" },
  { key: "creative", label: "Creative", emoji: "🎨" },
  { key: "business", label: "Business", emoji: "💼" },
  { key: "community", label: "Community", emoji: "👾" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

type HomeTabsProps = {
  arcade: React.ReactNode;
  compute: React.ReactNode;
  creative: React.ReactNode;
  business: React.ReactNode;
  community: React.ReactNode;
};

/**
 * Tabbed console for the homepage: the five platform lanes share one
 * viewport surface so switching lanes never requires a page scroll.
 * Panels arrive as server-rendered ReactNode props (composition pattern),
 * so all async server children (FeaturedGameCards, etc.) keep working.
 */
export function HomeTabs(props: HomeTabsProps) {
  const [active, setActive] = useState<TabKey>("arcade");
  return (
    <section aria-label="Platform console" className="mx-auto max-w-6xl px-4 py-6 sm:px-5">
      <div
        role="tablist"
        aria-label="Platform lanes"
        className="flex gap-1.5 overflow-x-auto rounded-full border border-border bg-card p-1 [scrollbar-width:thin]"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={active === t.key}
            aria-controls={`home-panel-${t.key}`}
            id={`home-tab-${t.key}`}
            onClick={() => setActive(t.key)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold transition",
              active === t.key
                ? "bg-cyan-600 text-white shadow dark:bg-cyan-300 dark:text-slate-950"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <span aria-hidden="true">{t.emoji}</span> {t.label}
          </button>
        ))}
      </div>
      {TABS.map((t) => (
        <div
          key={t.key}
          role="tabpanel"
          id={`home-panel-${t.key}`}
          aria-labelledby={`home-tab-${t.key}`}
          hidden={active !== t.key}
        >
          {active === t.key ? props[t.key] : null}
        </div>
      ))}
    </section>
  );
}

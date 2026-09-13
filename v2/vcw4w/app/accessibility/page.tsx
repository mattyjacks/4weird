import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { MarketingPage } from "@/components/site/marketing-page";
import { AccessibilityControls } from "@/components/site/accessibility-controls";

export const metadata: Metadata = {
  title: "Accessibility - Play and Build Accessibly",
  description:
    "4weird accessibility controls: reading, color-vision, eye-tracker, head-pointer, face-control, and single-switch settings, saved on-device and honored inside game frames.",
  alternates: { canonical: "/accessibility" },
};
// Cached static shell (title/intro are serializable props, 'days').
// AccessibilityControls passes through as children and is NEVER cached: it
// is a 'use client' island reading/writing per-device localStorage.
async function CachedAccessibilityShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  'use cache';
  cacheLife('days');
  return <MarketingPage title={title} intro={intro}>{children}</MarketingPage>;
}
export default function Page() { return <CachedAccessibilityShell title="Accessibility" intro="Reading, color-vision, eye-tracker, head-pointer, face-control, and single-switch settings. Everything is saved on this device and follows you inside game frames."><Suspense fallback={<p className="text-sm text-muted-foreground">Loading accessibility settings…</p>}><AccessibilityControls /></Suspense></CachedAccessibilityShell>; }

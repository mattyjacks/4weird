import type { Metadata } from "next";
import { ToolShell } from "@/components/tools/tool-shell";
import { SeoAnalyzer } from "@/components/tools/seo-analyzer";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/seo" },
  title: "SEO Analyzer | Free Tools | 4weird Games",
  description:
    "Free SEO analyzer: Google SERP simulator, OpenGraph social card preview, and title, description, keyword, and slug checks. Runs in your browser.",
};

export default function Page() {
  return (
    <ToolShell
      kicker="Free tool · SEO"
      title="SEO Analyzer"
      blurb="Preview exactly how your page looks in Google and on social, then tick off the fundamentals — title length, description length, keyword placement, and slug hygiene."
    >
      <SeoAnalyzer />
    </ToolShell>
  );
}

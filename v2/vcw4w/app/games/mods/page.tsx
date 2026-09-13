import type { Metadata } from "next";
import { ModsBrowser } from "./mods-browser";

export const metadata: Metadata = {
  title: "Community Mods & Themes — 4weird Games",
  description:
    "Browse community mods and custom themes for 4weird browser games. Sandboxed mod manifests with offline fallback.",
  alternates: { canonical: "/games/mods" },
};

export default function ModsPage() {
  return <ModsBrowser />;
}

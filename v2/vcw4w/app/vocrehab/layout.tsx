import type { ReactNode } from "react";
import { VocrehabA11yToolbar } from "@/components/vocrehab/vocrehab-a11y-toolbar";
import "./vocrehab.css";

/**
 * VocRehab module shell. Pins the accessibility toolbar above every
 * /vocrehab/ page; the toolbar applies prefs to the module root only,
 * never to the rest of 4weird.
 */
export default function VocrehabLayout({ children }: { children: ReactNode }) {
  return (
    <div className="vocrehab-layout">
      <VocrehabA11yToolbar />
      {children}
    </div>
  );
}

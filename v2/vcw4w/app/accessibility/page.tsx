import type { Metadata } from "next";
import { MarketingPage } from "@/components/site/marketing-page";
import { AccessibilityControls } from "@/components/site/accessibility-controls";

export const metadata: Metadata = {
  title: "Accessibility - Play and Build Accessibly",
  description:
    "4weird accessibility controls: reading, color-vision, eye-tracker, head-pointer, face-control, and single-switch settings, saved on-device and honored inside game frames.",
  alternates: { canonical: "/accessibility" },
};
export default function Page() { return <MarketingPage title="Accessibility" intro="Reading, color-vision, eye-tracker, head-pointer, face-control, and single-switch settings. Everything is saved on this device and follows you inside game frames."><AccessibilityControls /></MarketingPage>; }

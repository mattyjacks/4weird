import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Focus Shift — VocRehab Work & Life Practice Games",
  description:
    "Match 10 symbol pairs and refocus after a scripted interruption. Practice, not a test — nothing here grades you.",
  alternates: { canonical: "/vocrehab/play/focus-shift" },
};

export default function VocrehabFocusShiftLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

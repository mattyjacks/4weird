import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Barrier Run — VocRehab Work & Life Practice Games",
  description:
    "Walk four work situations — commute, shift swap, disclosure, tool failure — at your own pace. Untimed.",
  alternates: { canonical: "/vocrehab/play/barrier-run" },
};

export default function VocrehabBarrierRunLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

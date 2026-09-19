import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Schedule Juggle: monthly planning game | VocRehab",
  description:
    "VocRehab calendar planning game: fit shifts, training, and travel around real-life constraints on a month view that saves to your device. Untimed, with soft hints.",
  alternates: { canonical: "/vocrehab/play/schedule-juggle" },
};

export default function VocrehabScheduleJuggleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

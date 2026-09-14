import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Schedule Juggle — VocRehab Practice Arcade",
  description:
    "Fit shifts and a training block around 5 real-life constraints on a 7-day grid. Soft hints, never red errors.",
  alternates: { canonical: "/vocrehab/play/schedule-juggle" },
};

export default function VocrehabScheduleJuggleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

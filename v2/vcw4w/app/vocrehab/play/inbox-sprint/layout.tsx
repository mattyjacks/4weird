import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inbox Sprint — VocRehab Practice Arcade",
  description:
    "Triage 8 mock messages: reply, schedule, file, or flag. Practice, not a test — nothing here grades you.",
  alternates: { canonical: "/vocrehab/play/inbox-sprint" },
};

export default function VocrehabInboxSprintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

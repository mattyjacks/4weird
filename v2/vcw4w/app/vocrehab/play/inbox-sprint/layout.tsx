import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inbox Sprint: triage work email game | VocRehab",
  description:
    "VocRehab email triage game: sort 8 mock messages into reply, schedule, file, or flag, catch 4 phishing attempts, and write one careful reply. Practice, not a test.",
  alternates: { canonical: "/vocrehab/play/inbox-sprint" },
};

export default function VocrehabInboxSprintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

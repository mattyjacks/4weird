import type { Metadata } from "next";
import { CodeDetail } from "./code-detail";

export const metadata: Metadata = {
  alternates: { canonical: "/code" },
  title: "Code submission | 4weird",
  description: "Beautiful code view with the safety verdict, findings, and audit for your game submission.",
};

export default async function CodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CodeDetail id={id} />;
}

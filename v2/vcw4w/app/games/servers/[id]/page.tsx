import type { Metadata } from "next";
import { ServerDetail } from "@/components/games/server-panel";
import { ServerHostControls } from "@/components/games/server-host-controls";

export const metadata: Metadata = {
  title: "Server Details - 4weird Game Servers",
  description:
    "Live details for one 4weird multiplayer room: population, age band, per-minute coin quote, free-play status, and host controls.",
  alternates: { canonical: "/games/servers" },
};

const ID_PATTERN = /^[A-Za-z0-9-]{1,128}$/;

/**
 * Server detail page — live lobby data loads client-side (ServerDetail)
 * so an offline API or unknown id fails open instead of 500ing the route.
 */
export default async function ServerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const safeId = ID_PATTERN.test(id) ? id : "";
  return (
    <div className="bg-[#070912] text-white">
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6 sm:py-16">
        {safeId ? (
          <>
            <ServerDetail id={safeId} />
            <ServerHostControls serverId={safeId} />
          </>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[.04] p-6">
            <p role="status" className="text-sm text-slate-300">
              That room id doesn&apos;t look right — pick a room from the browser instead. No coins moved.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

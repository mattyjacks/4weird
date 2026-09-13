import type { Metadata } from "next";
import { Suspense } from "react";
import { ToolShell } from "@/components/tools/tool-shell";
import { PetClient } from "./pet-client";

export const metadata: Metadata = {
  alternates: { canonical: "/pet" },
  title: "Virtual Pet Room | 4weird Games",
  description:
    "Meet your free virtual pet: feed it, play with it, and tuck it in to sleep. It lives in your browser and remembers you between visits.",
};

export default function Page() {
  return (
    <ToolShell
      kicker="Virtual companion · Pet room"
      title="Virtual Pet Room: interactive 3D companion"
      blurb="A friendly 2D companion that gets hungry, happy, and sleepy over time. Feed, play, and rest with it — everything is saved in your browser."
    >
      <Suspense
        fallback={
          <p
            role="status"
            className="rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400"
          >
            Loading pet room…
          </p>
        }
      >
        <PetClient />
      </Suspense>
    </ToolShell>
  );
}

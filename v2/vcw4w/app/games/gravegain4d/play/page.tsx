import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Play GraveGain4DA | 4weird Games",
  description:
    "Play GraveGain4DA: a trippy 4D grave-diving arcade run through shifting hypercube crypts.",
  robots: { index: false, follow: false },
};

// Legacy bare-slug route: canonical play shell is /games/gravegain4dA/play
// (dynamic [slug] route). next.config.ts also redirects here permanently.
export default function GraveGain4DPlayPage() {
  redirect("/games/gravegain4dA/play");
}

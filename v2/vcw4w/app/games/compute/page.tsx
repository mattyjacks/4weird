import type { Metadata } from "next";
import { ComputeForm } from "./compute-form";

export const metadata: Metadata = {
  title: "Queue a Compute Job — 4weird Games",
  description:
    "Queue a background compute job for your game (render, transcode, bundle, procedural terrain, sprite pack). Offline-safe: jobs wait locally when unreachable.",
  alternates: { canonical: "/games/compute" },
};

export default function ComputePage() {
  return <ComputeForm />;
}

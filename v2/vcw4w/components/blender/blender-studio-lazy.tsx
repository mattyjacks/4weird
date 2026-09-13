"use client";

import dynamic from "next/dynamic";

/**
 * Deferred BlenderStudio (scene uploader + render-job console).
 *
 * Split out of /blender's initial bundle via next/dynamic (client-only): the
 * studio sits below the marketing copy and is pure browser interaction
 * (file upload, job polling), so the static guide content paints first and
 * the uploader streams in behind the page's Suspense skeleton.
 */
export const BlenderStudioLazy = dynamic(
  () =>
    import("@/components/blender/blender-studio").then(
      (mod) => mod.BlenderStudio,
    ),
  { ssr: false },
);

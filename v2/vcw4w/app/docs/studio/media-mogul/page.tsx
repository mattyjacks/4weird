import type { Metadata } from "next";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/studio/media-mogul" },
  title: "Media Mogul Timeline Walkthrough — Cut Video in the Browser",
  description:
    "Cut gameplay clips, Blender renders, fal.ai generations, music, and voiceover on the Media Mogul browser timeline: playhead, razor split, snap, zoom, preview, and render-export packaging.",
};

const theme = {
  bg: "bg-gradient-to-br from-violet-950 via-slate-950 to-fuchsia-950",
  border: "border-violet-300/20",
  chip: "border-violet-300/40 bg-violet-300/10 text-violet-200",
  title: "bg-gradient-to-r from-violet-300 via-fuchsia-200 to-amber-200 bg-clip-text text-transparent",
};

export default function MediaMogulPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · studio · media mogul"
        title={<>Cut the timeline. <span className={theme.title}>Package the render.</span></>}
        lede={<>Media Mogul at /studio/video is a browser multi-track NLE: library, preview viewport, timeline, and export stub. Drag the playhead, razor-split clips, snap to the grid, zoom in close — then package the timeline for a render worker.</>}
        stats={[
          ["5", "clip kinds"],
          ["2", "track kinds"],
          ["1080p60", "export profile"],
          ["0", "backend today"],
        ]}
        glyph="🎬"
        theme={theme}
        crumb="Media Mogul"
        art={
          <div className="flex items-end gap-2" aria-hidden="true">
            {[40, 62, 50, 74, 56, 68, 46].map((h, i) => (
              <div
                key={i}
                className="docs-float w-10 rounded-t-full border border-violet-200/50 bg-gradient-to-t from-fuchsia-500 to-violet-300 shadow-lg sm:w-12"
                style={{ height: h, animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="The session"
        title="Open the studio, load the timeline"
        body="The studio shell has four regions: library, preview, timeline, export. Clips carry a kind — gameplay, Blender render, fal.ai generation, music, or voiceover — and live on video or audio tracks with start offset, duration, trim window, volume, playback rate, opacity, and effects."
      />
      <MockWindow title="media mogul — timeline session" badge="4 tracks">
        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>V1 · boss-fight.mp4 (gameplay)</span><span className="font-black text-violet-300">0:00–0:42</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>V2 · title-card (blender_render)</span><span className="font-black text-violet-300">0:42–0:48</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>A1 · synth-bed (music)</span><span className="font-black text-violet-300">vol 0.7</span></div>
          <div className="flex justify-between gap-3 rounded-lg border border-violet-300/30 bg-violet-300/10 px-3 py-2"><span className="font-bold text-violet-200">A2 · voiceover take 3</span><span className="font-black text-violet-200">trim 2s–31s</span></div>
        </div>
      </MockWindow>

      <SectionHead
        index="2"
        kicker="Walkthrough"
        title="Cut, trim, grade, preview"
        body="Work left to right: arrange, split, snap, zoom for precision, grade with effects, and watch the audio-clock preview. The preview never decodes whole videos into memory — it draws per-frame slates and video-element frames only."
      />
      <Steps
        items={[
          ["Arrange clips on tracks", <>Place video kinds (gameplay, Blender, fal.ai) on video tracks and music/voiceover on audio tracks. Set each clip&apos;s start offset and duration; dial volume, opacity, and playback rate per clip.</>],
          ["Razor-split at the playhead", <>Drag the playhead to the cut point and split: one clip becomes two sharing the same source with complementary trim windows. Re-trim either side without losing media.</>],
          ["Snap and zoom", <>Leave snap-to-grid on while rough-cutting so clip edges align; zoom the timeline (pixels-per-second) to land frame-tight trims on the voiceover.</>],
          ["Grade with effects", <>Stack effects per clip: color_grade, blur, chroma_key, speed, or fade. Effects are data (type + params) on the clip — nothing is baked until render.</>],
          ["Preview on the audio clock", <>Press play and watch the preview viewport. Timing runs on the audio clock, so what you see stays in sync with what you hear.</>],
        ]}
      />

      <SectionHead
        index="3"
        kicker="Export"
        title="Package for the render worker"
        body="Export packages the timeline state into a versioned JSON envelope — version 1, export timestamp, target endpoint /api/compute/render-video, profile 1080p60 — for a headless FFmpeg worker to consume later."
      />
      <Callout tone="rose" title="Render export is stub-only">
        There is no render backend in Wave 3: <code>POST /api/compute/render-video</code> does not exist yet, so the studio reports a fail-open stub status after packaging. When the RunPod FFmpeg worker lands, it will accept this exact envelope and return a 1080p60 MP4 job. Never present export as rendering today.
      </Callout>

      <Pager current="/docs/studio/media-mogul" />
    </article>
  );
}

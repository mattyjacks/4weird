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

      <SectionHead
        index="4"
        kicker="Worked example"
        title="Cut a 45 second boss fight recap"
        body="A tight recap uses four tracks and five moves: lay the fight, title it, bed the music, ride the voiceover, then package. Total timeline shown below finishes at 48 seconds."
      />
      <Steps
        items={[
          ["Lay the fight on V1", <>Place <code>boss fight.mp4</code> from 0:00 to 0:42 on video track 1. Razor split at 0:18 to drop the wiped attempt, then re trim the surviving half open by 2 seconds to restore the winning parry.</>],
          ["Title it on V2", <>Overlay the Blender title card from 0:42 to 0:48 on video track 2 at full opacity. Keep it clear of the fight so the knockout frame breathes before the card lands.</>],
          ["Bed synth under A1", <>Lay the synth bed across the full 48 seconds on audio track 1 at volume 0.7. Add a fade effect over the last 3 seconds so the card does not end cold.</>],
          ["Ride the voiceover on A2", <>Trim voiceover take 3 to the 2s..31s window on audio track 2. Zoom the timeline to land the callout (now!) within a quarter second of the parry frame.</>],
          ["Package the envelope", <>Export the versioned JSON envelope with profile 1080p60 and target endpoint /api/compute/render video. Expect the fail open stub status today, and keep the envelope file for the day the FFmpeg worker accepts it.</>],
        ]}
      />

      <SectionHead
        index="5"
        kicker="Troubleshooting"
        title="Preview drift, silent audio, export rejects"
        body="The editor is deterministic data plus a live preview. When the preview disagrees with the timeline, the timeline is right and the preview clock or the clip params need attention."
      />
      <Steps
        items={[
          ["Audio and video drift apart", <>Replay from the top. The preview runs on the audio clock, so scrubbing mid clip then playing can start a frame off. Return the playhead to zero, press play, and confirm sync before re trimming.</>],
          ["A clip is silent or invisible", <>Check track assignment first. Video kinds (gameplay, Blender, fal.ai) belong on video tracks and music plus voiceover belong on audio tracks. Then check trim windows, volume, opacity, and playback rate, since a zeroed param mutes a clip without any error.</>],
          ["Snap keeps stealing my trim", <>Snap to grid is a rough cut aid. Leave it on while arranging, then toggle it off for the final voiceover pass so sub second trims land where you drop them instead of where the grid pulls them.</>],
          ["Export says stub instead of rendering", <>Correct behavior in Wave 3. The studio packages the envelope and reports that no render backend exists yet. Save the JSON, do not re export repeatedly, and never promise a viewer an MP4 today.</>],
          ["Effects look baked but are not", <>Effects are params on the clip (type plus settings), so color grade, blur, chroma key, speed, and fade all travel with the envelope. Nothing renders until the worker exists, which means reordering effects never costs quality.</>],
        ]}
      />
      <Callout tone="violet" title="Need generative b roll or voiceover?">
        Pair the timeline with the art vending machine for filler: generated clips and voice takes drop onto the same video and audio tracks. Keep gameplay on V1, generations on V2, and music separate from voice so the mix stays legible.
      </Callout>

      <Pager current="/docs/studio/media-mogul" />
    </article>
  );
}

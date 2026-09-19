import type { Metadata } from "next";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/studio/dictate-pic" },
  title: "DictatePic Layers Walkthrough — Paint Sprites on a 512px Canvas",
  description:
    "Paint game sprites in DictatePic: 512px layered canvas, 5 working raster tools, 8 blend modes, per-layer opacity, 30-step undo, transparent PNG export, and clearly-marked AI stubs.",
};

const theme = {
  bg: "bg-gradient-to-br from-violet-950 via-slate-950 to-fuchsia-950",
  border: "border-violet-300/20",
  chip: "border-violet-300/40 bg-violet-300/10 text-violet-200",
  title: "bg-gradient-to-r from-violet-300 via-fuchsia-200 to-amber-200 bg-clip-text text-transparent",
};

export default function DictatePicPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · studio · dictatepic"
        title={<>Layers, paint, <span className={theme.title}>export the sprite.</span></>}
        lede={<>DictatePic at /studio/image is a GIMP-style raster and sprite editor on a fixed 512 × 512 document: a layer stack with blend modes and opacity, five working paint tools, bounded undo, and one-click transparent PNG export.</>}
        stats={[
          ["512²", "px document"],
          ["5", "working tools"],
          ["8", "blend modes"],
          ["30", "undo snapshots"],
        ]}
        glyph="🎨"
        theme={theme}
        crumb="DictatePic"
        art={
          <div className="flex items-end gap-2" aria-hidden="true">
            {[66, 44, 58, 72, 50, 62, 54].map((h, i) => (
              <div
                key={i}
                className="docs-float w-10 rounded-t-full border border-amber-200/50 bg-gradient-to-t from-fuchsia-500 to-amber-300 shadow-lg sm:w-12"
                style={{ height: h, animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="Layers"
        title="Stack, blend, fade"
        body="Every layer carries a name, visibility and lock flags, opacity from 0.0 to 1.0 (applied as canvas alpha at composite time), and one of 8 blend modes: source-over, multiply, screen, overlay, darken, lighten, color-dodge, color-burn. A 16px checkerboard paints under the stack so transparency reads honestly."
      />
      <MockWindow title="dictatepic — layer stack" badge="512 × 512">
        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>☀ highlights · screen · 0.6</span><span className="font-black text-violet-300">visible</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>✏ lineart · multiply · 1.0</span><span className="font-black text-violet-300">visible</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>🎨 flats · source-over · 1.0</span><span className="font-black text-violet-300">visible</span></div>
          <div className="flex justify-between gap-3 rounded-lg border border-violet-300/30 bg-violet-300/10 px-3 py-2"><span className="font-bold text-violet-200">🔒 sketch · source-over · 0.4</span><span className="font-black text-violet-200">locked</span></div>
        </div>
      </MockWindow>

      <SectionHead
        index="2"
        kicker="Walkthrough"
        title="From blank doc to exported sprite"
        body="Paint with the five working raster tools, manage the stack as you go, and export. Strokes and layer changes publish interop events (dictate-pic:stroke, dictate-pic:layer-change, dictate-pic:export) on the shared 4weird_interop_bus so other tools can follow along."
      />
      <Steps
        items={[
          ["Sketch on a locked layer", <>Add a layer named “sketch”, drop opacity to ~0.4, and rough in the sprite with the pencil. Lock the layer so paint strokes never land on it by accident.</>],
          ["Paint flats, then shade", <>Add a “flats” layer (source-over, 1.0) and block in color with the brush and bucket. Add a shading layer set to multiply for shadows and a highlights layer set to screen or color-dodge.</>],
          ["Sample and erase precisely", <>Alt-pick colors with the eyedropper instead of guessing hex codes; clean edges with the eraser. Hidden layers stay hidden — visibility is per-layer, not global.</>],
          ["Undo without fear", <>History holds the last 30 snapshots per layer, newest first — scribble boldly, step back freely. Snapshots are capped so a huge canvas never eats storage.</>],
          ["Export the PNG", <>One click exports dictate-pic-512.png: full 512 × 512 with transparency kept, no checkerboard baked in. Ready for GraveGain 2D/3D textures or NewGamePlus assets.</>],
        ]}
      />

      <SectionHead
        index="3"
        kicker="Honest boundaries"
        title="Stubs say stub, planned says planned"
        body="Not every button paints yet. The UI labels each tool's state so a grayed control is never a mystery — and selection/clone tools are openly deferred past Wave 3."
      />
      <Callout tone="rose" title="AI tools are stubs with no backend">
        <code>ai_inpaint</code>, <code>ai_remove_bg</code>, and <code>slice</code> render as clearly-marked stubs: clicking one explains that no backend is wired rather than pretending to work. Marquee, lasso, and clone_stamp are listed as planned. Only brush, pencil, eraser, bucket, and eyedropper paint today.
      </Callout>

      <SectionHead
        index="4"
        kicker="Worked example"
        title="Paint a coin pickup sprite in six passes"
        body="Follow this pass order for a clean 512px pickup sprite: sketch, flats, shade, highlight, edge cleanup, export. Each pass lives on its own layer so mistakes stay local."
      />
      <Steps
        items={[
          ["Pass 1: rough the silhouette", <>Create a layer named sketch, set opacity near 0.4, lock it, and block in a 200px coin ellipse with the pencil. Keep the shape centered with at least 100px of margin so the export never clips.</>],
          ["Pass 2: block the flats", <>Add a flats layer at full opacity with source over blending. Fill the coin with the bucket, then switch to the brush for the inner star. Sample the gold with the eyedropper whenever you drift off palette.</>],
          ["Pass 3: shade with multiply", <>Add a shade layer set to multiply at 0.7 opacity. Paint a crescent along the lower right edge for curvature. Because multiply darkens through, one stroke reads as a full gradient.</>],
          ["Pass 4: pop the highlight", <>Add a highlights layer set to screen at 0.6 opacity. Dot a small white glint near the upper left rim. Toggle layer visibility to compare with and without the glint before committing.</>],
          ["Pass 5: clean the rim", <>Zoom close, erase stray pixels outside the ellipse, and re sample edge colors with the eyedropper. Undo steps back through the last 30 snapshots per layer, so scrub aggressively.</>],
          ["Pass 6: export and reuse", <>Export dictate pic 512 PNG with transparency intact. Drop the file into GraveGain textures or NewGamePlus assets, or submit it with a game mod through the mods browser.</>],
        ]}
      />

      <SectionHead
        index="5"
        kicker="Troubleshooting"
        title="Muddy blends, lost strokes, export surprises"
        body="Most DictatePic confusion comes from three places: painting on the wrong layer, a blend mode doing exactly what it says, or expecting a stub tool to paint."
      />
      <Steps
        items={[
          ["Strokes land on the sketch", <>Unlock check: the sketch layer should stay locked after pass 1. If paint keeps hitting it, select the flats layer explicitly, confirm the lock flag, and retry. Locked layers never accept strokes.</>],
          ["Colors turn muddy or blown out", <>Read the blend mode. Multiply deepens fast and color dodge blows highlights fast. Drop shade opacity to 0.5 or switch highlights from color dodge to screen for a gentler lift.</>],
          ["A tool button does nothing", <>Check its badge. Brush, pencil, eraser, bucket, and eyedropper paint today. AI inpaint, AI remove background, slice, marquee, lasso, and clone stamp are marked stub or planned and say so on click.</>],
          ["Export has a checkerboard baked in", <>It should not. The 16px checkerboard is a viewer aid only. Re export the PNG and open it over a dark background to confirm transparency. If the grid persists, you painted gray squares by hand, so erase them on the flats layer.</>],
        ]}
      />
      <Callout tone="cyan" title="Send finished sprites to your game mod">
        Exported PNGs plug straight into community mods. Shape the manifest (slug, semver version, target game scope, allow listed permissions, https bundle URL) using the plugin submission checklist, then preview the bundle in the mods browser before submitting.
      </Callout>

      <Pager current="/docs/studio/dictate-pic" />
    </article>
  );
}

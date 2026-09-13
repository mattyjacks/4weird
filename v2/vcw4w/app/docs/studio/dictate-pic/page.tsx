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

      <Pager current="/docs/studio/dictate-pic" />
    </article>
  );
}

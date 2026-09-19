import type { Metadata } from "next";
import Link from "next/link";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/studio" },
  title: "Creative Studio Guides — Cut, Paint, Command, Ship",
  description:
    "Wave-3 studio guides: Media Mogul video timeline, DictatePic layered canvas, Commander terminal reference, Luck Factory odds transparency, and the plugin submission checklist.",
};

const theme = {
  bg: "bg-gradient-to-br from-violet-950 via-slate-950 to-fuchsia-950",
  border: "border-violet-300/20",
  chip: "border-violet-300/40 bg-violet-300/10 text-violet-200",
  title: "bg-gradient-to-r from-violet-300 via-fuchsia-200 to-amber-200 bg-clip-text text-transparent",
};

const GUIDES: [string, string, string][] = [
  ["/docs/studio/media-mogul", "🎬 Media Mogul timeline", "Cut gameplay, Blender, fal.ai, music, and voiceover on the browser timeline — then package for render."],
  ["/docs/studio/dictate-pic", "🎨 DictatePic layers", "Paint sprites on a 512px layered canvas: 5 working tools, 8 blend modes, 30-step undo, PNG export."],
  ["/docs/studio/commander", "⚡ Commander reference", "Every allow-listed terminal command — help to luck — with exact syntax and offline guarantees."],
  ["/docs/studio/luck-factory", "🍀 Luck Factory odds", "Full odds transparency: uniform D100 math, streak bonus formula, and the no-gambling boundary."],
  ["/docs/studio/plugin-checklist", "🧩 Plugin checklist", "Ship a mod or theme that passes validation first try: manifest fields, permissions, sandbox rules."],
];

export default function StudioDocsPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · studio"
        title={<>Cut, paint, command. <span className={theme.title}>Then ship it.</span></>}
        lede={<>The Wave-3 creative suite turns the browser into a studio: a multi-track video timeline, a GIMP-style layered canvas, a power-user terminal, a deterministic luck engine — and a plugin pipeline that validates before it mounts. Five guides, zero installs.</>}
        stats={[
          ["5", "guides, this section"],
          ["512", "px DictatePic doc"],
          ["7", "commander commands"],
          ["1%", "perfect-100 face, exactly"],
        ]}
        glyph="🎬"
        theme={theme}
        crumb="Studio"
        art={
          <div className="flex items-end gap-2" aria-hidden="true">
            {[58, 40, 70, 48, 76, 54, 64].map((h, i) => (
              <div
                key={i}
                className="docs-float w-10 rounded-t-full border border-fuchsia-200/50 bg-gradient-to-t from-violet-500 to-fuchsia-300 shadow-lg sm:w-12"
                style={{ height: h, animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="The map"
        title="Five guides, one studio"
        body="Start with the tool you need today — each guide is self-contained and code-true to the shipped Wave-3 slice. Stubs and planned tools are labeled as stubs and planned, never as shipped."
      />
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {GUIDES.map(([href, title, blurb]) => (
          <a key={href} href={href} className="rounded-xl border border-border bg-card p-3.5 transition hover:border-violet-300/50">
            <p className="text-sm font-black">{title}</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{blurb}</p>
          </a>
        ))}
      </div>

      <SectionHead
        index="2"
        kicker="How to use these"
        title="Read one, do one"
        body="Every guide follows the same rhythm: what the tool is, the exact walkthrough or reference, then the honest boundary (what is stub-only, planned, or display-only)."
      />
      <Steps
        items={[
          ["Pick your surface", <>Video work starts at <code>/studio/video</code>, sprites at <code>/studio/image</code>, terminal at <code>/terminal</code>, luck at <code>/luck</code>, plugins at <code>/games/mods</code>.</>],
          ["Follow the walkthrough", <>Media Mogul and DictatePic guides are step-by-step; Commander and Luck Factory are exact references; the plugin page is a submit checklist.</>],
          ["Respect the boundary", <>Render export is stub-only, AI paint tools are marked stubs, Commander never touches a server, luck draws are entertainment-only previews.</>],
        ]}
      />
      <Callout tone="violet" title="New files only, nav via the steward">
        These pages live under <code>app/docs/studio/</code> and touch no existing guide. Site-nav wiring (DOCS_DATA, sitemap, llms.txt) is requested through QUEUE.md — the pages are directly reachable at their /docs/studio/* URLs today.
      </Callout>

      <SectionHead
        index="3"
        kicker="Worked example"
        title="Trailer in an evening"
        body="One maker ships a 30 second GraveGain trailer with three studio tools and zero installs: cut the footage, paint the thumbnail, package both as a plugin."
      />
      <Steps
        items={[
          ["Cut the footage", <>Drop gameplay clips on the Media Mogul timeline: playhead, razor split, snap, zoom, voiceover. Follow the <Link className="underline" href="/docs/studio/media-mogul">Media Mogul walkthrough</Link> until the preview plays clean end to end.</>],
          ["Paint the thumbnail", <>Open DictatePic, sketch the boss silhouette on one layer and the title text on another, tune opacity and blend modes, export a transparent PNG. The <Link className="underline" href="/docs/studio/dictate-pic">DictatePic walkthrough</Link> covers all five working tools.</>],
          ["Ship it as a plugin", <>Wrap the trailer page and thumbnail as a mod: manifest fields, slug and version rules, permission allowlist, sandbox limits. The <Link className="underline" href="/docs/studio/plugin-checklist">plugin checklist</Link> gets validation passing on the first try.</>],
        ]}
      />
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Power users drive the evening from the terminal with the allow-listed commands in the{" "}
        <Link className="underline" href="/docs/studio/commander">Commander reference</Link>, and the{" "}
        <Link className="underline" href="/docs/studio/luck-factory">Luck Factory odds page</Link> explains
        the deterministic dice math behind any thumbnail roll effects. Render export stays stub-only, so the
        timeline preview plus the PNG are the shippable artifacts tonight.
      </p>

      <SectionHead
        index="4"
        kicker="Troubleshooting"
        title="Stuck in the studio"
      />
      <Steps
        items={[
          ["Timeline preview stutters", <>Shorten the preview range and close heavy tabs. Preview is the deliverable until render export graduates from stub-only, so optimize for smooth preview rather than final output.</>],
          ["PNG export looks wrong", <>Recheck per-layer opacity and blend modes, then confirm the background layer is transparent before export. Flattened surprises are almost always a hidden layer or an opaque backdrop.</>],
          ["Plugin validation fails", <>Read the exact failing field: slugs must match the naming rules, versions must parse, and every permission must sit on the allowlist. Fix fields, revalidate, and only then mount.</>],
        ]}
      />

      <Pager current="/docs/studio" />
    </article>
  );
}

import type { Metadata } from "next";
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
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {GUIDES.map(([href, title, blurb]) => (
          <a key={href} href={href} className="rounded-2xl border border-border bg-card p-5 transition hover:border-violet-300/50">
            <p className="font-black">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>
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

      <Pager current="/docs/studio" />
    </article>
  );
}

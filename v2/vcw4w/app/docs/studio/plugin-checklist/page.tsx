import type { Metadata } from "next";
import { DocsHero } from "@/components/docs/docs-hero";
import { SectionHead, Callout, Steps, MockWindow, Pager } from "@/components/docs/docs-bits";

export const metadata: Metadata = {
  alternates: { canonical: "/docs/studio/plugin-checklist" },
  title: "Plugin Submission Checklist — Pass Validation First Try",
  description:
    "Submit a 4weird mod or theme that passes validation first try: GameModManifest fields, slug and version rules, target games, permission allowlist, theme tokens, sandbox and origin rules.",
};

const theme = {
  bg: "bg-gradient-to-br from-violet-950 via-slate-950 to-fuchsia-950",
  border: "border-violet-300/20",
  chip: "border-violet-300/40 bg-violet-300/10 text-violet-200",
  title: "bg-gradient-to-r from-violet-300 via-fuchsia-200 to-amber-200 bg-clip-text text-transparent",
};

export default function PluginChecklistPage() {
  return (
    <article>
      <DocsHero
        eyebrow="Docs · studio · plugins"
        title={<>Validate first. <span className={theme.title}>Mount second.</span></>}
        lede={<>The /games/mods browser mounts community mods and themes only after they validate: a typed manifest, an allow-listed permission set, curated theme tokens, and a sandboxed iframe. Run this checklist before submitting and your plugin passes first try.</>}
        stats={[
          ["5", "target scopes"],
          ["5", "permissions max"],
          ["6", "curated tokens"],
          ["0", "auto-granted perms"],
        ]}
        glyph="🧩"
        theme={theme}
        crumb="Plugin checklist"
        art={
          <div className="flex items-end gap-2" aria-hidden="true">
            {[54, 68, 46, 72, 58, 64, 50].map((h, i) => (
              <div
                key={i}
                className="docs-float w-10 rounded-t-full border border-violet-200/50 bg-gradient-to-t from-violet-500 to-fuchsia-300 shadow-lg sm:w-12"
                style={{ height: h, animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </div>
        }
      />

      <SectionHead
        index="1"
        kicker="Manifest"
        title="Shape your manifest exactly"
        body="Every submission is validated by validateGameModManifest, which never throws — it returns { ok, errors, manifest } so bad rows drop fail-open. Mirror this shape and the error list stays empty."
      />
      <MockWindow title="manifest.json — ember-arsenal-pack (valid)" badge="validates clean">
        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>name / slug</span><span className="font-black text-violet-300">Ember Arsenal Pack / ember-arsenal-pack</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>version / target_game</span><span className="font-black text-violet-300">1.2.0 / gravegain3d</span></div>
          <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"><span>script_url</span><span className="font-black text-violet-300">https://…/ember-pack.js</span></div>
          <div className="flex justify-between gap-3 rounded-lg border border-violet-300/30 bg-violet-300/10 px-3 py-2"><span className="font-bold text-violet-200">permissions</span><span className="font-black text-violet-200">storage:local, audio:play</span></div>
        </div>
      </MockWindow>

      <SectionHead
        index="2"
        kicker="Checklist"
        title="Seven checks before you submit"
        body="Each check maps to a real validation rule. Fail any of them and the row is dropped with errors listed — fix, resubmit, no harm done."
      />
      <Steps
        items={[
          ["Name it, slug it", <>Provide a display <code>name</code> and a URL-safe <code>slug</code> matching <code>^[a-z0-9-]+$</code>, unique per catalog. Slugs are the identity — renames are new submissions.</>],
          ["Version it semver-ish", <>Use <code>major.minor.patch</code> with an optional prerelease suffix (e.g. <code>1.2.0</code>, <code>2.0.0-beta.1</code>). Anything else fails version validation.</>],
          ["Target one scope", <>Set <code>target_game</code> to <code>gravegain3d</code>, <code>gravegain2d</code>, <code>gravegain1d</code>, <code>battlesharks2</code>, or <code>global</code>. New games never need a validator change — any slug-shaped scope is accepted.</>],
          ["Declare only allow-listed permissions", <>Request from <code>storage:local</code>, <code>audio:play</code>, <code>interop:emit</code>, <code>clipboard:read</code>, <code>clipboard:write</code> — and nothing else. Permissions are declaration-only today and the mount grants none automatically; an unknown permission fails validation instead of being ignored.</>],
          ["Theme with --* tokens", <>Theme keys must match <code>--*</code>. The shell applies the six curated tokens (<code>--mod-bg</code>, <code>--mod-fg</code>, <code>--mod-accent</code>, <code>--mod-panel</code>, <code>--mod-border</code>, <code>--mod-font</code>); extra keys ride along forward-compatibly.</>],
          ["Serve the bundle from https", <>Point <code>script_url</code> at an https:// bundle (relative paths allowed for first-party dev). The mount runs it in an <code>allow-scripts</code>-only sandboxed iframe, and only 4weird.com origins are trusted.</>],
          ["Preview in the browser first", <>Open <code>/games/mods</code>: the browser validates every row locally and ignores invalid entries, so you see exactly what reviewers see — including the offline fallback bundle when the future live catalog endpoint isn&apos;t wired yet.</>],
        ]}
      />
      <Callout tone="violet" title="Verified badge is earned, not claimed">
        The <code>is_verified</code> flag mirrors a review column, not your manifest&apos;s opinion of itself — self-setting it changes nothing. Ship clean, get reviewed, earn the badge. Include an <code>author</code> handle so reviewers know who to credit.
      </Callout>

      <Pager current="/docs/studio/plugin-checklist" />
    </article>
  );
}

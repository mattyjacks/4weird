export function ModerationNote() {
  return (
    <aside className="rounded-xl border border-cyan-400/20 bg-slate-900 p-5 text-sm text-slate-600 dark:text-slate-300">
      <h2 className="font-bold text-cyan-300">How moderation works here</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>👱🏻‍♀️ Valley Net (our defense bot) screens every post, comment, and bot write with a lenient medium-bar: only obvious spam/scam floods are blocked and only clearly violating text is held as pending for human review - ordinary posts go straight through, and every action is audit-logged.</li>
        <li>AI moderation by Luna screens post and comment text; only clearly violating items are held as pending for human review.</li>
        <li>Images: 1MB cap enforced server-side after conversion, PNG/JPEG/WebP/GIF only (magic-bytes checked).</li>
        <li>Reports are anonymous-friendly. CSAM reports auto-hide the content immediately and preserve its hash for evidence.</li>
        <li>
          CSAM → NCMEC CyberTipline procedure (handled by admins): quarantine (auto-hidden by the report) + sha256/storage-path
          preserve + export of the report rows, then filing at report.cybertipline.org before anything is deleted.
        </li>
      </ul>
    </aside>
  );
}

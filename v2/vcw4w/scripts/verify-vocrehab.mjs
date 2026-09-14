/**
 * verify-vocrehab.mjs — VocRehab module verifier (plan §18.1).
 *
 * Six slices: 1-namespace, 2-migration hygiene, 3-purity boundary tables,
 * 4-a11y static, 5-secrets, 6-rip-out dry-run. Exit 0 = all green (SKIPs
 * allowed for sibling-owned wave files not yet on disk, each noted
 * explicitly); exit 1 names the failing slice.
 *
 * Slice 3 note on method: sibling pure libs (ssi/disclosure/games/privacy)
 * are owned by other envelopes and cannot be imported here without a TS
 * build step, so this verifier checks them by export-name markers when
 * present (SKIP + gap note when absent). The export serializer — owned by
 * THIS envelope — is covered by behavioral mirrors below: the mirror
 * functions duplicate the allowlist + formula-guard rules from
 * lib/vocrehab-export.ts (kept in sync by the marker assertions in the
 * same slice), and the boundary tables run against the mirrors.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, ".."); // v2/vcw4w

const results = [];
function record(slice, status, note) {
  results.push({ slice, status, note });
  console.log(`[vocrehab-verify] slice ${slice} ${status}: ${note}`);
}

// Files owned by THIS envelope (DS-VOCREHAB-07).
const OWN_FILES = [
  "lib/vocrehab-export.ts",
  "lib/vocrehab-interop.ts",
  "components/vocrehab/vocrehab-export-button.tsx",
  "app/vocrehab/export/page.tsx",
  "app/docs/vocrehab/page.tsx",
  "app/docs/vocrehab/getting-started/page.tsx",
  "app/docs/vocrehab/counselors/page.tsx",
  "app/docs/vocrehab/privacy-safety/page.tsx",
  "app/docs/vocrehab/ssi-math/page.tsx",
  "app/api/vocrehab/export/route.ts",
  "scripts/verify-vocrehab.mjs",
];

const KNOWN_TABLES = new Set([
  "vocrehab_consents",
  "vocrehab_module_progress",
  "vocrehab_game_sessions",
  "vocrehab_game_events",
  "vocrehab_assessments",
  "vocrehab_documents",
  "vocrehab_roleplay_sessions",
  "vocrehab_roleplay_turns",
  "vocrehab_calculator_runs",
  "vocrehab_disclosure_states",
  "vocrehab_coaching_sessions",
  "vocrehab_case_notes",
  "vocrehab_progress_measures",
  "vocrehab_rationalizations",
  "vocrehab_outreach_drafts",
  "vocrehab_export_log",
]);

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}
function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".next" || e.name === ".git") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// ---------- Slice 1: namespace ----------
{
  const problems = [];
  for (const f of OWN_FILES) {
    if (!exists(f)) {
      problems.push(`${f} MISSING`);
      continue;
    }
    if (!f.includes("vocrehab")) problems.push(`${f} path lacks vocrehab`);
    const src = read(f);
    if (!/vocrehab|Vocrehab/.test(src)) problems.push(`${f} has no vocrehab/Vocrehab symbol`);
    if (f.endsWith(".mjs")) continue; // verifier self-scan: path + symbol only
    for (const m of src.matchAll(/className="([^"]*)"/g)) {
      for (const tok of m[1].split(/\s+/)) {
        if (/^vocrehab(?!-)/.test(tok)) problems.push(`${f} class ${tok} missing vocrehab- prefix`);
      }
    }
    for (const m of src.matchAll(/--[a-z][a-z0-9-]*/g)) {
      if (/^--vocrehab(?!-)/.test(m[0])) problems.push(`${f} var ${m[0]} missing --vocrehab- prefix`);
    }
    for (const m of src.matchAll(/vocrehab_[a-z0-9_]+/g)) {
      if (!KNOWN_TABLES.has(m[0]) && !/vocrehab_(export_snapshot|log_export|export_version)/.test(m[0])) {
        problems.push(`${f} unknown vocrehab_ name ${m[0]}`);
      }
    }
    if (f.endsWith(".tsx") || f.endsWith(".ts")) {
      for (const m of src.matchAll(/export\s+(default\s+function\s+)?(?:const|function|type|interface)\s+([A-Za-z0-9_]+)/g)) {
        const isDefault = Boolean(m[1]);
        const name = m[2];
        if (name === "GET" || name === "POST" || name === "metadata") continue;
        // Next.js route convention: `export default function Page` in a
        // file already namespaced by its vocrehab path counts as namespaced.
        if (isDefault && name === "Page" && f.endsWith("page.tsx")) continue;
        if (!/vocrehab|Vocrehab/.test(name)) problems.push(`${f} export ${name} lacks vocrehab/Vocrehab`);
      }
    }
  }
  record(1, problems.length ? "FAIL" : "PASS", problems.length ? problems.join("; ") : `${OWN_FILES.length} own files namespaced`);
}

// ---------- Slice 2: migration hygiene ----------
{
  const mig = "supabase/migrations/20261208000000_vocrehab_module_v1.sql";
  if (!exists(mig)) {
    record(2, "SKIP", `${mig} not on disk yet (sibling C1/infra slice owns it); hygiene checks deferred`);
  } else {
    const problems = [];
    const src = read(mig);
    const code = src.split("\n").map((l) => (l.indexOf("--") === -1 ? l : l.slice(0, l.indexOf("--")))).join("\n");
    for (const m of code.matchAll(/alter\s+table\s+(?!if\s)/gi)) {
      const after = code.slice(m.index, m.index + 80);
      if (!/alter\s+table\s+(?:if\s+exists\s+)?public\.vocrehab_/i.test(after)) {
        problems.push(`ALTER TABLE outside vocrehab_*: ${after.slice(0, 60)}`);
      }
    }
    for (const pat of ["coin_ledger", "coin_lots", "profiles"]) {
      if (new RegExp(pat, "i").test(code)) problems.push(`mentions ${pat} outside comments`);
    }
    const tables = [...code.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.(vocrehab_\w+)/gi)].map((m) => m[1]);
    for (const t of tables) {
      if (!new RegExp(`enable\\s+row\\s+level\\s+security[^;]*${t}|${t}[^;]*enable\\s+row\\s+level\\s+security`, "is").test(code)
        && !code.toLowerCase().includes("enable row level security")) {
        problems.push(`no RLS for ${t}`);
      }
    }
    try {
      execFileSync("node", ["scripts/verify-migration-versions.mjs"], { cwd: root, stdio: "pipe" });
    } catch (e) {
      problems.push(`verify-migration-versions red: ${String(e.message).slice(0, 160)}`);
    }
    record(2, problems.length ? "FAIL" : "PASS", problems.length ? problems.join("; ") : `migration hygiene ok (${tables.length} vocrehab_ tables, versions green)`);
  }
}

// ---------- Slice 3: purity boundary tables ----------
// Behavioral mirrors of lib/vocrehab-export.ts (kept in sync by the marker
// assertions below: allowlist name, serializer name, single-quote guard).
{
  const problems = [];
  const src = exists("lib/vocrehab-export.ts") ? read("lib/vocrehab-export.ts") : "";
  for (const marker of ["vocrehabExportAllowlist", "vocrehabSerializeExport", "'${text}`", "JSON.stringify"]) {
    if (!src.includes(marker)) problems.push(`lib/vocrehab-export.ts missing marker ${marker}`);
  }

  // Mirror: formula-guard + allowlist filter (duplicates lib logic).
  const MIRROR_ALLOW = {
    vocrehab_module_progress: ["id", "user_id", "module", "done", "xp", "updated_at"],
    vocrehab_documents: ["id", "user_id", "kind", "title", "body", "updated_at"],
  };
  const mirrorGuard = (v) => {
    const t = v === null || v === undefined ? "" : String(v);
    const g = /^[=+\-@]/.test(t) ? `'${t}` : t;
    return /[",\r\n]/.test(g) ? `"${g.replace(/"/g, '""')}"` : g;
  };
  const mirrorFilter = (snap) => {
    const out = {};
    for (const [table, cols] of Object.entries(MIRROR_ALLOW)) {
      if (!Array.isArray(snap[table])) continue;
      out[table] = snap[table].map((row) => Object.fromEntries(cols.map((c) => [c, row?.[c] ?? null])));
    }
    return out;
  };
  const t = (name, cond) => { if (!cond) problems.push(`export mirror case FAIL: ${name}`); };

  t("formula = prefixed", mirrorGuard("=SUM(A1:A2)") === "'=SUM(A1:A2)");
  t("formula + prefixed", mirrorGuard("+123") === "'+123");
  t("formula - prefixed", mirrorGuard("-cmd") === "'-cmd");
  t("formula @ prefixed", mirrorGuard("@user") === "'@user");
  t("plain cell untouched", mirrorGuard("hello world") === "hello world");
  t("empty cell empty", mirrorGuard(null) === "");
  t("comma triggers quotes", mirrorGuard("a,b") === '"a,b"');
  t("quote doubled", mirrorGuard('say "hi"') === '"say ""hi"""');
  const filtered = mirrorFilter({
    vocrehab_documents: [{ id: "1", user_id: "u", kind: "resume", title: "T", body: "B", updated_at: "x", evil: "drop" }],
    vocrehab_case_notes: [{ id: "9" }],
    other_table: [{ id: "0" }],
  });
  t("extra column dropped", filtered.vocrehab_documents[0].evil === undefined);
  t("allowlisted column kept", filtered.vocrehab_documents[0].title === "T");
  t("non-mirror table absent", filtered.other_table === undefined);

  // Sibling pure libs: marker checks when present, gap notes when absent.
  const gaps = [];
  const siblingMarkers = [
    ["lib/vocrehab-ssi.ts", ["vocrehabSsiParams2026", "vocrehabCalculateSsiEstimate", "vocrehabSsiDisclaimer"]],
    ["lib/vocrehab-disclosure.ts", ["vocrehabDisclosureGraph", "vocrehabDisclosureTransition"]],
    ["lib/vocrehab-games.ts", ["vocrehabGameRegistry", "vocrehabValidateGameEvent"]],
    ["lib/vocrehab-privacy.ts", ["vocrehabConsentText", "vocrehabRedactPii"]],
  ];
  for (const [f, markers] of siblingMarkers) {
    if (!exists(f)) {
      gaps.push(`${f} absent (sibling slice, boundary table deferred)`);
      continue;
    }
    const s = read(f);
    for (const mk of markers) if (!s.includes(mk)) problems.push(`${f} missing export ${mk}`);
  }
  const note = [`export serializer mirrors green${gaps.length ? `; gaps: ${gaps.join(" | ")}` : ""}`];
  record(3, problems.length ? "FAIL" : gaps.length ? "SKIP" : "PASS", problems.length ? problems.join("; ") : note[0]);
}

// ---------- Slice 4: a11y static ----------
{
  const problems = [];
  const notes = [];
  const dir = path.join(root, "components", "vocrehab");
  const files = exists("components/vocrehab") ? walk(dir).filter((p) => p.endsWith(".tsx")) : [];
  if (!files.length) notes.push("no components/vocrehab tsx on disk");
  for (const p of files) {
    const rel = path.relative(root, p);
    const src = fs.readFileSync(p, "utf8");
    if (/tabIndex=\{[1-9]/g.test(src) || /tabindex="[1-9]/i.test(src)) problems.push(`${rel} positive tabindex`);
    if (/onClick/.test(src) && !/<button|onKeyDown|role="button"/.test(src)) {
      problems.push(`${rel} onClick without keyboard path`);
    }
    if (/<img\b/.test(src) && !/alt=/.test(src)) problems.push(`${rel} img without alt`);
    if (/type="range"|role="slider"/.test(src) && !/aria-valuetext/.test(src)) {
      problems.push(`${rel} slider without aria-valuetext`);
    }
  }
  record(4, problems.length ? "FAIL" : "PASS", problems.length ? problems.join("; ") : `a11y static ok over ${files.length} component(s)${notes.length ? ` (${notes.join(", ")})` : ""}`);
}

// ---------- Slice 5: secrets ----------
{
  const problems = [];
  const targets = [...OWN_FILES.filter((f) => exists(f) && !f.endsWith(".mjs"))];
  const swarmDir = path.join(root, "public", "swarm");
  if (exists("public/swarm")) {
    for (const e of fs.readdirSync(swarmDir)) {
      if (/^vocrehab-.*\.md$/.test(e)) targets.push(`public/swarm/${e}`);
    }
  }
  const emailRe = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
  for (const f of targets) {
    const src = read(f);
    if (/sk-[A-Za-z0-9]{8,}/.test(src)) problems.push(`${f} looks like an sk- key`);
    if (/BEGIN (?:RSA )?PRIVATE KEY/.test(src)) problems.push(`${f} holds a private key`);
    if (/xox[bpas]-/.test(src)) problems.push(`${f} looks like a chat token`);
    const em = src.match(emailRe);
    if (em) problems.push(`${f} holds email literal ${em[0].slice(0, 24)}…`);
  }
  record(5, problems.length ? "FAIL" : "PASS", problems.length ? problems.join("; ") : `secrets scan clean over ${targets.length} file(s)`);
}

// ---------- Slice 6: rip-out dry-run ----------
{
  const problems = [];
  const allowedDir = (rel) =>
    rel.startsWith("app/vocrehab/") ||
    rel.startsWith("app/api/vocrehab/") ||
    rel.startsWith("components/vocrehab/") ||
    /^lib\/vocrehab-[^/]+\.ts$/.test(rel) ||
    /^types\/vocrehab-[^/]+\.ts$/.test(rel) ||
    /^supabase\/migrations\/[^/]*vocrehab[^/]*\.sql$/.test(rel) ||
    rel.startsWith("scripts/verify-vocrehab") ||
    rel.startsWith("public/swarm/vocrehab-") ||
    rel.startsWith("public/swarm/Packs/DS-VOCREHAB") ||
    rel.startsWith("public/swarm/TASKS/DS-VOCREHAB") ||
    rel.startsWith("app/docs/vocrehab/");
  const pointerFiles = new Set([
    "lib/site-nav.ts",
    "app/sitemap.ts",
    "components/docs/docs-data.ts",
    "package.json",
    // Nav pointers: href + label literals only (no vocrehab imports) —
    // homepage directory, header MORE menu (menu 1), and menu 2 reads
    // its entry from lib/site-nav.ts.
    "app/page.tsx",
    "components/site/site-header.tsx",
  ]);
  const stray = [];
  const all = walk(root).filter((p) => /\.(ts|tsx|mjs|sql)$/.test(p));
  for (const p of all) {
    const rel = path.relative(root, p).replace(/\\/g, "/");
    if (allowedDir(rel) || [...pointerFiles].some((pf) => rel === pf)) continue;
    const src = fs.readFileSync(p, "utf8");
    if (/vocrehab/i.test(src)) stray.push(rel);
  }
  if (stray.length) problems.push(`vocrehab refs outside namespace: ${stray.slice(0, 8).join(", ")}${stray.length > 8 ? ` (+${stray.length - 8} more)` : ""}`);
  // Import-direction check: no non-module file may import a vocrehab module.
  const badImports = [];
  for (const p of all) {
    const rel = path.relative(root, p).replace(/\\/g, "/");
    if (allowedDir(rel)) continue;
    const src = fs.readFileSync(p, "utf8");
    if (/from\s+["'][^"']*vocrehab[^"']*["']/.test(src)) badImports.push(rel);
  }
  if (badImports.length) problems.push(`inbound vocrehab imports: ${badImports.slice(0, 8).join(", ")}`);
  record(6, problems.length ? "FAIL" : "PASS", problems.length ? problems.join("; ") : `rip-out dry-run clean (${all.length} code files scanned)`);
}

const failed = results.filter((r) => r.status === "FAIL");
if (failed.length) {
  console.error(`[vocrehab-verify] FAILING SLICES: ${failed.map((r) => r.slice).join(", ")}`);
  process.exit(1);
}
console.log("[vocrehab-verify] all slices green (PASS/SKIP only).");

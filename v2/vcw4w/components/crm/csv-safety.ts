// Shared CSV/TXT export + CSV import guards for the CRM workspace.
//
// Spreadsheet formula-injection hardening (OWASP CSV guidance): any exported
// field whose first character could start a formula when the file is opened
// in Excel/Sheets is prefix-defused with a single quote. Quoting/escaping
// behaviour is unchanged — defusing happens before quoting.
//
// Import side: size/row caps, BOM handling, per-field trims + length caps,
// malformed-row skipping. Parsing is string-splitting only — never eval.

export const CSV_MAX_FILE_BYTES = 1_000_000; // 1MB cap for contact CSV imports.
export const CSV_MAX_DATA_ROWS = 200; // data rows (excluding the header row).

// First characters that can arm a spreadsheet formula, plus the control
// characters and lookalikes attackers use to dodge naive [=+-@] checks:
// tab/CR (cell/line smuggling), pipe (DDE), % (old Lotus prefix),
// fullwidth Gleichheitszeichen variants (＝＋－＠).
const DEFUSE_FIRST = new Set([
  "=",
  "+",
  "-",
  "@",
  "\t",
  "\r",
  "\n",
  "|",
  "%",
  "＝",
  "＋",
  "－",
  "＠",
]);

export function needsCsvDefuse(s: string): boolean {
  return s.length > 0 && DEFUSE_FIRST.has(s.charAt(0));
}

// Prepend a single quote so spreadsheet apps treat the value as text.
// Values that are already safe pass through untouched.
export function defuseCsvValue(s: string): string {
  return needsCsvDefuse(s) ? `'${s}` : s;
}

// Quote/escape a single CSV cell. Defuse first, then apply the standard
// RFC-4180 quoting so embedded quotes, commas, and newlines stay intact.
export function csvCell(v: unknown): string {
  const s = defuseCsvValue(String(v ?? ""));
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

// Neutralize a TXT summary line the same way. Static "- " bullets are
// exempt (dash followed by space/end is prose, not a formula); anything
// else with a risky leading char — including a smuggled "=evil" after an
// embedded newline — gets the single-quote prefix.
export function defuseTxtLine(line: string): string {
  if (!line) return line;
  const c = line.charAt(0);
  if (c === "-" || c === "|" || c === "%") {
    const n = line.charAt(1);
    if (n === "" || n === " " || n === "\t") return line;
  }
  return defuseCsvValue(line);
}

// Filenames must never carry user input: only a validated YYYY-MM-DD stamp
// plus a slug scrubbed to [a-z0-9._-].
export function safeDateStamp(raw: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "nodate";
}

export function slugForFilename(raw: string, fallback: string): string {
  const slug = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "")
    .slice(0, 40);
  return slug || fallback;
}

// Strip a UTF-8 BOM so it never becomes part of the first header name.
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

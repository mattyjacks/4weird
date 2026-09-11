/**
 * Game .zip submissions — client-safe constants, pricing, and static audit.
 *
 * Legal + safety contract (see Terms Sections 2/3/5/11):
 * - Verdicts: safe | warning | unsafe | denied.
 * - `denied` is for hard-deny signals: malware/virus/keylogger/cybercrime
 *   shapes, CSAM-adjacent signals, or sexual/adult content (the platform
 *   allows NO sexual content — it is removed, not rated).
 * - A `denied` or `unsafe` result QUARANTINES the package: it is never
 *   served, never rendered, and queued for HUMAN moderator review.
 * - Suspected CSAM is never stored viewable, never reposted, never
 *   described — hash preserved as evidence, human review required.
 * - Reports to authorities happen BY A HUMAN through proper channels
 *   (NCMEC CyberTipline for CSAM). IP addresses are disclosed ONLY on
 *   valid legal process (court order / subpoena). There is NO automatic
 *   IP-to-authorities pipeline — that would be unlawful doxxing.
 * - Every price INCLUDES the 25% platform cut (SUBMIT_CUT_PCT), never on top.
 *
 * No new npm deps: the file list comes from a minimal central-directory
 * reader over the raw zip bytes (no decompression server-side beyond a
 * bounded text sniff of caller-supplied file samples).
 */

import { SERVICE_CUT_PCT } from "@/lib/economy";

/** Hard cap: 69 MiB per .zip. */
export const ZIP_MAX_BYTES = 69 * 1024 * 1024;
/** Vercel-style game root inside the zip (where index.html / entry lives). */
export const GAME_ROOT_MAX_CHARS = 256;
/** Bounded audit: never feed more than this many text bytes to regexes. */
export const AUDIT_TEXT_CAP_BYTES = 512 * 1024;
/** Max files inspected per audit (cheapest viable — headers first). */
export const AUDIT_MAX_FILES = 500;

export const SUBMIT_CUT_PCT = SERVICE_CUT_PCT;
export const STORAGE_CUT_PCT = SERVICE_CUT_PCT;
export const AUDIT_CUT_PCT = SERVICE_CUT_PCT;

/** Storage: 3 coins per GB-month (matches object-storage), pro-rated daily. */
export const STORAGE_COINS_PER_GB_MO = 3;
/** Code audit: flat gross per submission (covers static scan + AI review). */
export const AUDIT_COINS_FLAT = 6;
/** Deep AI audit (Luna/OpenAI review of flagged files): gross add-on. */
export const AUDIT_DEEP_COINS = 10;

export type ZipVerdict = "safe" | "warning" | "unsafe" | "denied";

export const ZIP_VERDICTS: ZipVerdict[] = ["safe", "warning", "unsafe", "denied"];

export function isZipVerdict(value: unknown): value is ZipVerdict {
  return (
    typeof value === "string" &&
    (ZIP_VERDICTS as readonly string[]).includes(value)
  );
}

/** Split any submission gross charge into platform cut + provider share. */
export function submitSplit(grossCoins: number): {
  gross: number;
  cut: number;
  provider: number;
} {
  const gross = Math.max(0, Math.round(Number(grossCoins) * 100) / 100);
  const cut = Math.round(((gross * SUBMIT_CUT_PCT) / 100) * 100) / 100;
  return { gross, cut, provider: Math.round((gross - cut) * 100) / 100 };
}

/** Pro-rated storage quote for bytes held one month (gross, cut INCLUDED). */
export function quoteZipStorage(bytes: number): number {
  const b = Math.max(0, Math.floor(bytes || 0));
  const gb = b / (1024 * 1024 * 1024);
  return Math.max(0.01, Math.round(gb * STORAGE_COINS_PER_GB_MO * 100) / 100);
}

export function quoteZipStorageSplit(bytes: number): {
  gross: number;
  cut: number;
  provider: number;
} {
  return submitSplit(quoteZipStorage(bytes));
}

export function quoteAuditSplit(deep: boolean): {
  gross: number;
  cut: number;
  provider: number;
} {
  return submitSplit(AUDIT_COINS_FLAT + (deep ? AUDIT_DEEP_COINS : 0));
}

export const SUBMIT_CUT_NOTE = `Includes ${SUBMIT_CUT_PCT}% platform cut — never added on top.`;

/**
 * Clean a Vercel-style game root: POSIX-ish relative path, no escapes.
 * "" = zip root. Returns "" when invalid.
 */
export function cleanGameRoot(value: unknown): string {
  const raw = String(value ?? "").trim().replace(/\\/g, "/");
  if (!raw || raw === "/" || raw === ".") return "";
  if (raw.length > GAME_ROOT_MAX_CHARS) return "";
  if (raw.startsWith("/") || raw.includes("..") || raw.includes("//")) return "";
  if (!/^[A-Za-z0-9._/-]+$/.test(raw)) return "";
  return raw.replace(/^\/+|\/+$/g, "");
}

export type ZipEntry = { name: string; bytes: number };

/**
 * Minimal ZIP central-directory file list. Reads EOCD -> central headers
 * for names + uncompressed sizes. No decompression. Returns [] when the
 * buffer is not a parseable zip (caller treats as warning, not denial).
 */
export function listZipEntries(buf: Uint8Array): ZipEntry[] {
  const out: ZipEntry[] = [];
  try {
    if (buf.length < 22) return out;
    // PK magic check on local header.
    if (!(buf[0] === 0x50 && buf[1] === 0x4b)) return out;
    let eocd = -1;
    const scanFrom = Math.max(0, buf.length - 66000);
    for (let i = buf.length - 22; i >= scanFrom; i--) {
      if (
        buf[i] === 0x50 &&
        buf[i + 1] === 0x4b &&
        buf[i + 2] === 0x05 &&
        buf[i + 3] === 0x06
      ) {
        eocd = i;
        break;
      }
    }
    if (eocd < 0) return out;
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const count = view.getUint16(eocd + 10, true);
    let off = view.getUint32(eocd + 16, true);
    const n = Math.min(count, AUDIT_MAX_FILES * 2);
    for (let k = 0; k < n; k++) {
      if (off + 46 > buf.length) break;
      if (
        buf[off] !== 0x50 ||
        buf[off + 1] !== 0x4b ||
        buf[off + 2] !== 0x01 ||
        buf[off + 3] !== 0x02
      )
        break;
      const nameLen = view.getUint16(off + 28, true);
      const extraLen = view.getUint16(off + 30, true);
      const commentLen = view.getUint16(off + 32, true);
      const size = view.getUint32(off + 24, true);
      const nameBytes = buf.subarray(off + 46, off + 46 + nameLen);
      let name = "";
      try {
        name = new TextDecoder("utf-8", { fatal: false }).decode(nameBytes);
      } catch {
        name = "";
      }
      if (name && !name.endsWith("/")) out.push({ name, bytes: size });
      off += 46 + nameLen + extraLen + commentLen;
      if (out.length >= AUDIT_MAX_FILES * 2) break;
    }
  } catch {
    return out;
  }
  return out;
}

export type AuditFinding = {
  level: "info" | "warning" | "deny";
  code: string;
  detail: string;
};

export type AuditReport = {
  verdict: ZipVerdict;
  findings: AuditFinding[];
  files: number;
  bytes: number;
  gameRoot: string;
  entryFound: boolean;
};

// Hard-deny shapes: malware / cybercrime / credential theft.
const DENY_PATTERNS: { code: string; re: RegExp }[] = [
  { code: "malware:keylogger", re: /keylog|keystroke\s*(log|captur)|SetWindowsHookEx\s*\(\s*WH_KEYBOARD/i },
  { code: "malware:ransomware", re: /vssadmin\s+delete\s+shadows|bcdedit\s+\/set\s+.*recoveryenabled\s+no|decrypt[a-z_]*\s*for\s*(bitcoin|btc|monero|xmr)/i },
  { code: "malware:rat", re: /reverse_shell|nc\s+-e\s+\/bin\/(ba)?sh|powershell\s+.*-enc(?:odedcommand)?\s+[A-Za-z0-9+/=]{80,}/i },
  { code: "malware:stealer", re: /discord.*token|Login\s*Data|Cookies.*sqlite|seed\s*phrase|mnemonic.*harvest/i },
  { code: "malware:dropper", re: /Invoke-Mimikatz|mimikatz|meterpreter| CobaltStrike|beacon\s*(http|dns|smb)/i },
  { code: "cybercrime:exploit-kit", re: /exploit\s*(cve-\d{4}-\d+|zero-?day)|sqlmap|nmap\s+-sS|hydra\s+-l\b/i },
  { code: "cybercrime:phishing", re: /verify\s*(your\s*)?(account|wallet).{0,40}(password|seed|mnemonic)|fake\s*login/i },
  { code: "malware:virus-sig", re: /X5O!P%@AP\[4\\PZX54\(P\^\)7CC\)7\}\$EICAR|XMRig|xmrig|cryptonight/i },
];

// Warning shapes: risky-but-legit capabilities needing human eyeballs.
const WARN_PATTERNS: { code: string; re: RegExp }[] = [
  { code: "risk:eval-obfuscation", re: /eval\s*\(\s*(atob|unescape|String\.fromCharCode)|(?:\\x[0-9a-f]{2}){8,}|fromCharCode\s*\(\s*\d{2,}/i },
  { code: "risk:remote-fetch", re: /fetch\s*\(\s*["']https?:|XMLHttpRequest|import\s*\(\s*["']https?:/i },
  { code: "risk:crypto-miner", re: /coinhive|cryptoloot|miner\.start|WebAssembly.*mine/i },
  { code: "risk:exfiltration", re: /localStorage\s*\[\s*["']token|document\.cookie.*fetch|navigator\.sendBeacon/i },
  { code: "risk:binary-blob", re: /\.(exe|dll|so|dylib|msi|bat|ps1|vbs|scr|com)$/i },
  { code: "risk:adult-signal", re: /porn|xxx|hentai|onlyfans|escort|explicit\s*(sex|nude)/i },
];

const ENTRY_NAMES = ["index.html", "index.htm", "main.html", "game.html"];

/**
 * Pure static audit over the entry list + bounded text samples.
 * `texts` maps file name -> leading text sample (caller caps bytes).
 * NEVER receives CSAM imagery — text signals only; imagery is held for
 * human review without description.
 */
export function auditZipPackage(input: {
  entries: ZipEntry[];
  texts?: Record<string, string>;
  totalBytes: number;
  gameRoot?: string;
}): AuditReport {
  const gameRoot = cleanGameRoot(input.gameRoot ?? "");
  const entries = (input.entries ?? []).slice(0, AUDIT_MAX_FILES * 2);
  const findings: AuditFinding[] = [];
  const texts = input.texts ?? {};

  if ((input.totalBytes || 0) > ZIP_MAX_BYTES) {
    findings.push({
      level: "deny",
      code: "policy:oversize",
      detail: `Package exceeds the 69 MB cap (${input.totalBytes} bytes).`,
    });
  }
  if (entries.length === 0) {
    findings.push({
      level: "warning",
      code: "package:unlisted",
      detail: "File list unreadable — held for human review, not denied.",
    });
  }

  // Zip-slip / traversal guard on names.
  for (const e of entries.slice(0, AUDIT_MAX_FILES)) {
    if (
      e.name.includes("..") ||
      e.name.startsWith("/") ||
      e.name.includes("\\") ||
      e.bytes > ZIP_MAX_BYTES
    ) {
      findings.push({
        level: "deny",
        code: "package:traversal",
        detail: `Unsafe entry path held for review: ${e.name.slice(0, 80)}`,
      });
      break;
    }
  }

  // Entry point under the declared game root (Vercel-style).
  const prefix = gameRoot ? `${gameRoot}/` : "";
  const names = new Set(entries.map((e) => e.name.toLowerCase()));
  const entryFound = ENTRY_NAMES.some(
    (n) => names.has(`${prefix}${n}`.toLowerCase()) || names.has(n),
  );
  if (!entryFound && entries.length > 0) {
    findings.push({
      level: "warning",
      code: "package:no-entry",
      detail: gameRoot
        ? `No index.html under game root "${gameRoot}" — check the path.`
        : "No index.html found — set the game root (like Vercel) if nested.",
    });
  }

  // Content scan over bounded text samples.
  for (const e of entries.slice(0, AUDIT_MAX_FILES)) {
    if (!/\.(html?|js|mjs|cjs|ts|json|txt|md)$/i.test(e.name)) continue;
    const sample = String(texts[e.name] ?? "").slice(
      0,
      Math.floor(AUDIT_TEXT_CAP_BYTES / 50),
    );
    if (!sample) continue;
    for (const { code, re } of DENY_PATTERNS) {
      if (re.test(sample)) {
        findings.push({
          level: "deny",
          code,
          detail: `Hard-deny signal in ${e.name.slice(0, 80)} (${code}). Quarantined for human review.`,
        });
      }
    }
    for (const { code, re } of WARN_PATTERNS) {
      if (code === "risk:binary-blob") continue; // handled by extension pass
      if (re.test(sample)) {
        findings.push({
          level: "warning",
          code,
          detail: `Needs human review in ${e.name.slice(0, 80)} (${code}).`,
        });
      }
    }
    if (findings.filter((f) => f.level === "deny").length >= 5) break;
  }

  // Binary extension pass over the full list.
  for (const e of entries) {
    if (/\.(exe|dll|so|dylib|msi|bat|ps1|vbs|scr|com)$/i.test(e.name)) {
      findings.push({
        level: "warning",
        code: "risk:binary-blob",
        detail: `Executable held for review: ${e.name.slice(0, 80)}`,
      });
      break;
    }
  }

  const denies = findings.filter((f) => f.level === "deny");
  const warns = findings.filter((f) => f.level === "warning");
  const verdict: ZipVerdict =
    denies.length > 0 ? "denied" : warns.length > 2 ? "unsafe" : warns.length > 0 ? "warning" : "safe";

  return {
    verdict,
    findings: findings.slice(0, 25),
    files: entries.length,
    bytes: input.totalBytes,
    gameRoot,
    entryFound,
  };
}

/** Scope keys this surface introduces (least-privilege, split by action). */
export const ZIP_SUBMIT_SCOPES = [
  "code:submit",
  "code:audit",
  "code:review",
] as const;

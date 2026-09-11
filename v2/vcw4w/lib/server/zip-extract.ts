/**
 * Server-only minimal ZIP extractor for the game-submission audit.
 * No new npm deps: parses local file headers sequentially and inflates
 * DEFLATE (method 8) via node:zlib with strict output caps. STORED
 * (method 0) is sliced directly. Anything else is skipped (name-only).
 */

import { inflateRawSync } from "node:zlib";

export type ExtractedFile = { name: string; text: string };

const MAX_FILES = 120;
const MAX_EACH_BYTES = 64 * 1024;
const MAX_TOTAL_BYTES = 512 * 1024;

export function extractTextSamples(buf: Buffer): ExtractedFile[] {
  const out: ExtractedFile[] = [];
  let total = 0;
  try {
    const b = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    let off = 0;
    while (off + 30 <= b.length && out.length < MAX_FILES && total < MAX_TOTAL_BYTES) {
      if (
        b[off] !== 0x50 ||
        b[off + 1] !== 0x4b ||
        b[off + 2] !== 0x03 ||
        b[off + 3] !== 0x04
      )
        break;
      const method = view.getUint16(off + 8, true);
      const compSize = view.getUint32(off + 18, true);
      const nameLen = view.getUint16(off + 26, true);
      const extraLen = view.getUint16(off + 28, true);
      const nameStart = off + 30;
      const dataStart = nameStart + nameLen + extraLen;
      if (dataStart > b.length) break;
      let name = "";
      try {
        name = new TextDecoder("utf-8", { fatal: false }).decode(
          b.subarray(nameStart, nameStart + nameLen),
        );
      } catch {
        name = "";
      }
      const compEnd = Math.min(b.length, dataStart + compSize);
      if (
        name &&
        !name.endsWith("/") &&
        /\.(html?|js|mjs|cjs|ts|json|txt|md)$/i.test(name) &&
        compSize > 0 &&
        compSize < 2 * 1024 * 1024
      ) {
        try {
          const slice = Buffer.from(b.subarray(dataStart, compEnd));
          const raw =
            method === 0
              ? slice.subarray(0, MAX_EACH_BYTES)
              : method === 8
                ? inflateRawSync(slice, { windowBits: 15 }).subarray(0, MAX_EACH_BYTES)
                : null;
          if (raw && raw.length > 0) {
            const text = new TextDecoder("utf-8", { fatal: false })
              .decode(raw)
              .slice(0, MAX_EACH_BYTES);
            // Skip binary noise: require mostly printable.
            const probe = text.slice(0, 2000);
            const bad = (probe.match(/[\u0000-\u0008\u000e-\u001f]/g) ?? []).length;
            if (bad < probe.length * 0.05) {
              out.push({ name, text });
              total += text.length;
            }
          }
        } catch {
          // Corrupt entry: name-only audit still applies.
        }
      }
      off = compEnd;
      if (off <= dataStart) break;
    }
  } catch {
    return out;
  }
  return out;
}

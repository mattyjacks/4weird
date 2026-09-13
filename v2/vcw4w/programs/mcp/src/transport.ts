/**
 * Minimal stdio JSON-RPC framing helpers for @4weird/mcp.
 *
 * Complements `index.ts`, which speaks MCP over stdio via the MCP SDK's
 * `StdioServerTransport`. These utilities are standalone newline-delimited
 * JSON (JSON + `\n`) framing primitives only — they are not wired into the
 * server and duplicate nothing in `index.ts`.
 *
 * Pure, dependency-free, Node-types only. No imports. No secrets.
 */

/** Serialize a value as a single newline-terminated JSON line. Throws on circular input. */
export function encodeMessage(obj: unknown): string {
  return JSON.stringify(obj) + "\n";
}

/**
 * Parse a single JSON line. Throws a SyntaxError that names the byte-offset
 * context on bad JSON.
 */
export function decodeMessage(line: string): unknown {
  try {
    return JSON.parse(line) as unknown;
  } catch (err: unknown) {
    const raw = err instanceof Error ? err.message : String(err);
    const match = /position\s+(\d+)/i.exec(raw) ?? /at\s+(\d+)\b/.exec(raw);
    const charOffset = match ? Number(match[1]) : 0;
    // Byte offset under UTF-8 (matches char offset for ASCII).
    let byteOffset = charOffset;
    try {
      byteOffset = new TextEncoder().encode(line.slice(0, charOffset)).length;
    } catch {
      byteOffset = charOffset;
    }
    const start = Math.max(0, charOffset - 20);
    const context = JSON.stringify(line.slice(start, charOffset + 20));
    throw new SyntaxError(
      `decodeMessage: invalid JSON at byte offset ${byteOffset} (line length ${line.length}, context ${context}): ${raw}`,
    );
  }
}

/** Buffer partial string chunks and emit complete lines (sans `\n`/`\r\n`) via `onLine`. */
export function createLineSplitter(onLine: (line: string) => void): {
  push(chunk: string): void;
} {
  let buffer = "";
  return {
    push(chunk: string): void {
      buffer += chunk;
      let idx = buffer.indexOf("\n");
      while (idx >= 0) {
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.endsWith("\r")) {
          line = line.slice(0, -1);
        }
        onLine(line);
        idx = buffer.indexOf("\n");
      }
    },
  };
}

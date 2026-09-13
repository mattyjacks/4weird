/**
 * Tiny markdown renderer for clan posts/comments. Shared by server and
 * client (no dependencies).
 *
 * SAFETY CONTRACT (matches the site rule "never render user content as
 * HTML"): input is HTML-escaped FIRST, then a small markdown subset is
 * applied to the escaped text. The output contains only tags this module
 * emits (<strong>, <em>, <del>, <code>, <pre>, <a>, <blockquote>, <ul>,
 * <ol>, <li>, <hr>, <p>, <br>). Links accept http(s) only; everything else
 * renders as plain text. There is no code path where raw `<` survives.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inlineMd(escaped: string): string {
  // Mask inline code spans before other inline passes so `[text](https://…)`
  // inside backticks stays inert text (phishing-resistant). Placeholders are
  // restored after link/bold processing.
  const codeSpans: string[] = [];
  let s = escaped.replace(/`([^`\n]+)`/g, (_m, inner: string) => {
    codeSpans.push(`<code>${inner}</code>`);
    return `\u0000CODE${codeSpans.length - 1}\u0000`;
  });
  // Bold / italic / strikethrough.
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^_\w])_([^_\n]+)_/g, "$1<em>$2</em>");
  s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  // Links: [text](https://…) only. Anything else stays literal text.
  s = s.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener nofollow ugc">$1</a>',
  );
  s = s.replace(/\u0000CODE(\d+)\u0000/g, (_m, idx: string) => codeSpans[Number(idx)] ?? "");
  return s;
}

function renderBlockLines(lines: string[]): string {
  const out: string[] = [];
  let list: "ul" | "ol" | null = null;
  const closeList = () => {
    if (list) {
      out.push(list === "ul" ? "</ul>" : "</ol>");
      list = null;
    }
  };
  for (const line of lines) {
    const ul = line.match(/^\s*[-*]\s+(.+)$/);
    const ol = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (ul) {
      if (list !== "ul") {
        closeList();
        out.push("<ul>");
        list = "ul";
      }
      out.push(`<li>${inlineMd(ul[1])}</li>`);
    } else if (ol) {
      if (list !== "ol") {
        closeList();
        out.push("<ol>");
        list = "ol";
      }
      out.push(`<li>${inlineMd(ol[1])}</li>`);
    } else if (/^\s*&gt;/.test(line)) {
      closeList();
      out.push(`<blockquote>${inlineMd(line.replace(/^\s*&gt;\s?/, ""))}</blockquote>`);
    } else if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      closeList();
      out.push("<hr />");
    } else if (line.trim() === "") {
      closeList();
    } else {
      closeList();
      out.push(`<p>${inlineMd(line)}</p>`);
    }
  }
  closeList();
  return out.join("\n");
}

/**
 * Render markdown-ish text to sanitized HTML. Fenced ``` blocks become
 * <pre><code>; all other lines go through the block renderer above.
 */
export function renderMarkdownSafe(input: string): string {
  // Strip NULs first: inlineMd uses \u0000 placeholders for code spans, so a
  // literal NUL in user input must never reach the placeholder machinery (or
  // a link href).
  const text = String(input ?? "").replace(/\u0000/g, "").slice(0, 8000);
  const parts = text.split(/```/);
  const out: string[] = [];
  parts.forEach((part, i) => {
    if (i % 2 === 1) {
      // Fenced code block: escaped, no markdown inside.
      out.push(`<pre><code>${escapeHtml(part.replace(/^\n/, ""))}</code></pre>`);
    } else {
      out.push(renderBlockLines(escapeHtml(part).split("\n")));
    }
  });
  return out.join("\n");
}

/** One-line toolbar cheat sheet shown under the editor. */
export const MARKDOWN_HELP =
  "**bold** *italic* `code` ~~strike~~ [link](https://…) > quote - list 1. list ```block```";

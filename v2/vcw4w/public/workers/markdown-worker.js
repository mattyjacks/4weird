// 4weird perf worker: markdown render.
// Byte-equivalent subset of lib/markdown.ts (escape-first, whitelist tags).
// Long clan bodies render here so chat scrolls never jank the main thread.

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inlineMd(escaped) {
  // Mask inline code spans before other inline passes (mirrors
  // lib/markdown.ts) so `[text](https://…)` inside backticks stays inert
  // text instead of an active link. Placeholders are restored afterwards.
  const codeSpans = [];
  let s = String(escaped ?? "").replace(/`([^`\n]+)`/g, (_m, inner) => {
    codeSpans.push("<code>" + inner + "</code>");
    return "\u0000CODE" + (codeSpans.length - 1) + "\u0000";
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^_\w])_([^_\n]+)_/g, "$1<em>$2</em>");
  s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  s = s.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener nofollow ugc">$1</a>',
  );
  s = s.replace(/\u0000CODE(\d+)\u0000/g, (_m, idx) => codeSpans[Number(idx)] ?? "");
  return s;
}

function renderBlockLines(lines) {
  const out = [];
  let list = null;
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
      out.push("<li>" + inlineMd(ul[1]) + "</li>");
    } else if (ol) {
      if (list !== "ol") {
        closeList();
        out.push("<ol>");
        list = "ol";
      }
      out.push("<li>" + inlineMd(ol[1]) + "</li>");
    } else if (/^\s*&gt;/.test(line)) {
      closeList();
      out.push("<blockquote>" + inlineMd(line.replace(/^\s*&gt;\s?/, "")) + "</blockquote>");
    } else if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      closeList();
      out.push("<hr />");
    } else if (line.trim() === "") {
      closeList();
    } else {
      closeList();
      out.push("<p>" + inlineMd(line) + "</p>");
    }
  }
  closeList();
  return out.join("\n");
}

function renderMarkdownSafe(input) {
  const text = String(input ?? "").split(String.fromCharCode(0)).join("").slice(0, 8000);
  const parts = text.split(/```/);
  const out = [];
  parts.forEach((part, i) => {
    if (i % 2 === 1) {
      out.push("<pre><code>" + escapeHtml(part.replace(/^\n/, "")) + "</code></pre>");
    } else {
      out.push(renderBlockLines(escapeHtml(part).split("\n")));
    }
  });
  return out.join("\n");
}

self.onmessage = function (e) {
  const msg = e.data || {};
  try {
    if (msg.type === "render") {
      self.postMessage({ ok: true, result: renderMarkdownSafe(msg.text) });
    } else if (msg.type === "render-batch") {
      const items = Array.isArray(msg.items) ? msg.items.slice(0, 100) : [];
      const out = items.map((t) => renderMarkdownSafe(t));
      self.postMessage({ ok: true, result: out });
    } else {
      self.postMessage({ ok: false, error: "unknown-type" });
    }
  } catch (err) {
    self.postMessage({ ok: false, error: String((err && err.message) || err) });
  }
};

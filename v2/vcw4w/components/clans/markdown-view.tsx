import { renderMarkdownSafe } from "@/lib/markdown";

/**
 * Renders clan markdown bodies. Safe by construction: renderMarkdownSafe()
 * escapes HTML first and only emits its own whitelist of tags — user content
 * is never injected as raw HTML.
 */
export function MarkdownView({ text }: { text: string }) {
  const html = renderMarkdownSafe(text);
  return (
    <div
      className="clan-md mt-2 text-sm text-slate-300 [&_a]:text-cyan-300 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-cyan-400/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_code]:rounded [&_code]:bg-black/50 [&_code]:px-1 [&_code]:text-cyan-200 [&_hr]:my-2 [&_hr]:border-white/10 [&_li]:ml-5 [&_li]:list-disc [&_ol_li]:list-decimal [&_p]:my-1 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-black/50 [&_pre]:p-3 [&_strong]:text-white"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

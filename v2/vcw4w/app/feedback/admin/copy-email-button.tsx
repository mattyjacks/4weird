"use client";

import { useState } from "react";

/**
 * Copy-email button for the admin feedback detail drawer. Tiny client
 * island: the drawer itself is server-rendered (searchParams `selected`),
 * only the clipboard write needs JS.
 */
export function CopyEmailButton({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => void copy()}
        className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/10"
      >
        {state === "copied" ? "Copied ✓" : "Copy email"}
      </button>
      {state === "failed" && (
        <span className="text-xs text-amber-300">
          Copy blocked — select the address manually.
        </span>
      )}
    </span>
  );
}

"use client";

import { useEffect, useState } from "react";

export function ReferralPanel() {
  const [code, setCode] = useState("");
  const [invited, setInvited] = useState(0);
  const [inviteCoins, setInviteCoins] = useState(25);
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("Invite friends — you both earn coins.");

  useEffect(() => {
    fetch("/api/referrals", { credentials: "include" }).then((r) => r.json()).then((body) => {
      if (typeof body.code === "string" && body.code) {
        setCode(body.code);
        setInvited(Number(body.invited) || 0);
        if (Number(body.inviterCoins)) setInviteCoins(Number(body.inviterCoins));
      }
    }).catch(() => {});
  }, []);

  async function apply() {
    if (!input.trim()) return;
    setMessage("Applying…");
    try {
      const response = await fetch("/api/referrals", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ code: input }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Unable to apply code.");
      setMessage(`Welcome bonus: +${body.inviteeCoins} coins! Your inviter earned +${body.inviterCoins}.`);
      setInput("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to apply code.");
    }
  }

  return <section className="rounded-2xl border border-white/10 bg-white/[.04] p-6"><h2 className="text-xl font-bold">Referrals</h2>{code ? <p className="mt-2 text-sm text-slate-300">Your code: <strong className="font-mono text-cyan-300">{code}</strong> · {invited} friend{invited === 1 ? "" : "s"} joined · +{inviteCoins} coins each</p> : <p className="mt-2 text-sm text-slate-400">Sign in to get your invite code.</p>}<div className="mt-4 flex gap-2"><input aria-label="Invite code" value={input} onChange={(e) => setInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))} placeholder="Friend's code" className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 font-mono" /><button type="button" onClick={apply} className="rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950">Apply</button></div><p role="status" className="mt-3 text-sm text-amber-200">{message}</p></section>;
}

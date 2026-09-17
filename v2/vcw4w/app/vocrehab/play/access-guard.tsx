"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

type ChildStatus = {
  allowed_games: string[];
  allowed_features: string[];
  daily_minutes: number | null;
  seconds_today: number;
  in_window: boolean;
  vocrehab_enabled: boolean;
};

type GateState = "allowed" | "denied" | "unavailable";
type KidGameSession = { id: string; path: string };
const GAME_IDS = new Set([
  "file-sort", "inbox-sprint", "focus-shift", "barrier-run", "schedule-juggle",
  "phone-greeting", "time-punch", "tool-match", "paycheck-plan", "energy-budget", "resume-rescue",
]);

function isAllowed(child: ChildStatus, gameId: string): boolean {
  if (!GAME_IDS.has(gameId)) return true;
  if (!child.vocrehab_enabled || !child.in_window) return false;
  if (child.daily_minutes !== null && child.seconds_today >= child.daily_minutes * 60) return false;
  if (child.allowed_games.length > 0 && !child.allowed_games.includes(gameId)) return false;
  const rules = child.allowed_features.filter((feature) => feature.startsWith("game:"));
  return rules.length === 0 || rules.includes(`game:${gameId}`);
}

export default function VocrehabPlayAccessGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [gate, setGate] = useState<GateState>("allowed");
  const [checkedPath, setCheckedPath] = useState<string | null>(null);
  const [kidGameSession, setKidGameSession] = useState<KidGameSession | null>(null);
  const [reason, setReason] = useState("Checking this child account's game access…");

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const response = await fetch("/api/family/kid-login", { credentials: "include", cache: "no-store" });
        if (!response.ok) throw new Error("Unable to check child account controls.");
        const data = await response.json() as { kid?: ChildStatus | null; kid_session_present?: boolean };
        if (cancelled) return;
        if (!data.kid) {
          if (data.kid_session_present) {
            setReason("The child session could not be verified. Sign in to the child account again.");
            setGate("unavailable");
          } else setGate("allowed");
          setCheckedPath(pathname);
          return;
        }
        const segment = pathname.split("/").filter(Boolean)[2] ?? "";
        if (isAllowed(data.kid, segment)) {
          if (GAME_IDS.has(segment)) {
            const startResponse = await fetch("/api/vocrehab/games", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "start", game_id: segment }),
            });
            const startData = await startResponse.json() as { session?: { session_id?: string } | null; error?: string };
            if (cancelled) return;
            if (!startResponse.ok) {
              setReason(startData.error || "This play session could not start under the current parent controls.");
              setGate("denied");
              setCheckedPath(pathname);
              return;
            }
            if (typeof startData.session?.session_id === "string") {
              setKidGameSession({ id: startData.session.session_id, path: pathname });
            }
          }
          setGate("allowed");
          setCheckedPath(pathname);
          return;
        }
        if (!data.kid.vocrehab_enabled) setReason("Ask your parent to enable the VocRehab practice workspace.");
        else if (!data.kid.in_window) setReason("VocRehab games are outside your allowed play time right now.");
        else if (data.kid.daily_minutes !== null && data.kid.seconds_today >= data.kid.daily_minutes * 60) setReason("You have reached today's play-time limit.");
        else setReason("Your parent has not allowed this game for your account.");
        setGate("denied");
        setCheckedPath(pathname);
      } catch {
        if (!cancelled) {
          setReason("Game access could not be checked. Reload after reconnecting.");
          setGate("unavailable");
          setCheckedPath(pathname);
        }
      }
    }
    void check();
    return () => { cancelled = true; };
  }, [pathname]);

  useEffect(() => {
    if (!kidGameSession || kidGameSession.path !== pathname) return;
    let stopped = false;
    let busy = false;
    const sessionId = kidGameSession.id;
    let visibleSinceBeat = document.visibilityState === "visible" ? Date.now() : null;
    let visibleMilliseconds = 0;
    const flushVisibleTime = () => {
      if (visibleSinceBeat !== null) {
        visibleMilliseconds += Math.max(0, Date.now() - visibleSinceBeat);
        visibleSinceBeat = Date.now();
      }
      const seconds = Math.min(300, Math.floor(visibleMilliseconds / 1000));
      if (seconds > 0) visibleMilliseconds -= seconds * 1000;
      return seconds;
    };
    const heartbeat = async () => {
      if (stopped || busy) return;
      const activeSeconds = flushVisibleTime();
      if (activeSeconds === 0) return;
      busy = true;
      try {
        const response = await fetch("/api/vocrehab/games", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "heartbeat", game_id: pathname.split("/").filter(Boolean)[2], session_id: sessionId, active_seconds: activeSeconds }),
        });
        if (!response.ok && !stopped) {
          const data = await response.json() as { error?: string };
          setReason(data.error || "Your play session reached a parent limit.");
          setGate("denied");
          setCheckedPath(pathname);
          stopped = true;
        }
      } catch {
        if (!stopped) {
          setReason("Your play session could not be checked. Reload before continuing.");
          setGate("unavailable");
          setCheckedPath(pathname);
          stopped = true;
        }
      } finally {
        busy = false;
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (visibleSinceBeat !== null) {
          visibleMilliseconds += Math.max(0, Date.now() - visibleSinceBeat);
          visibleSinceBeat = null;
        }
        void heartbeat();
      } else if (visibleSinceBeat === null) {
        visibleSinceBeat = Date.now();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    const timer = window.setInterval(() => { void heartbeat(); }, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stopped = true;
      window.clearInterval(timer);
      const finalSeconds = flushVisibleTime();
      const end = async () => {
        if (finalSeconds > 0) {
          await fetch("/api/vocrehab/games", {
            method: "POST", credentials: "include", keepalive: true,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "heartbeat", game_id: pathname.split("/").filter(Boolean)[2], session_id: sessionId, active_seconds: finalSeconds }),
          }).catch(() => undefined);
        }
        await fetch("/api/vocrehab/games", {
          method: "POST", credentials: "include", keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "end", game_id: pathname.split("/").filter(Boolean)[2], session_id: sessionId }),
        }).catch(() => undefined);
      };
      void end();
    };
  }, [kidGameSession, pathname]);

  if (checkedPath !== pathname) return <main className="mx-auto max-w-3xl p-6" role="status">Checking game access…</main>;
  if (gate === "allowed") return children;
  return (
    <main className="mx-auto max-w-3xl space-y-3 p-6" role="status">
      <h1 className="text-xl font-bold">{gate === "denied" ? "Game unavailable" : "Access check unavailable"}</h1>
      <p>{reason}</p>
      <Link href="/vocrehab/play" className="inline-block rounded border px-4 py-2">Back to practice arcade</Link>
    </main>
  );
}

"use client";

/**
 * /feedback — standalone guest feedback page (FBOV-10).
 *
 * Same POST /api/feedback contract as the top-bar Give Feedback dialog, with
 * `source: "page"` on every submit so admins can slice page vs dialog traffic.
 * Reuses the shared lane components — ScreenshotDropzone (FBOV-03,
 * paste/drop/pick + preview), ScreenshotAnnotator (FBOV-05, arrow/circle/
 * highlight/blur + per-shape comments), capturePageForFeedback (FBOV-04,
 * quiet DOM snapshot with display-media fallback) — and the same identity
 * model as the dialog (FBOV-01: Tracked/Anonymous/Guest visibility + optional
 * guest contact name/email).
 *
 * Client validation uses the route's strings verbatim so inline errors match
 * server errors; API failures surface body.error verbatim (including the 401
 * "Authentication required." for Tracked-without-session and the 429 guest
 * limit). Success shows the Report ID. The text draft persists to the same
 * localStorage key the dialog uses, so a draft survives navigation.
 *
 * No coin movement here — feedback never touches the ledger.
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ScreenshotDropzone } from "@/components/feedback/screenshot-dropzone";
import {
  ScreenshotAnnotator,
  type Annotation,
} from "@/components/feedback/screenshot-annotator";
import { capturePageForFeedback } from "@/components/feedback/screenshot-capture";
import type { FeedbackVisibility } from "@/components/feedback/feedback-dialog";
import { createClient } from "@/lib/supabase/client";

type Rating = "good" | "okay" | "bad";
  type Critique = "positive" | "neutral" | "negative";

const MAX_TEXT = 4000;
const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;
const DRAFT_KEY = "fw-feedback-draft";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isFeedbackVisibility(value: unknown): value is FeedbackVisibility {
  return value === "tracked" || value === "anonymous" || value === "guest";
}

function readDraft(): {
  text: string;
  rating: Rating | null;
  critique: Critique | null;
  visibility: FeedbackVisibility | null;
} {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return { text: "", rating: null, critique: null, visibility: null };
    }
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return { text: "", rating: null, critique: null, visibility: null };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const rating = parsed["rating"];
    const critique = parsed["critique"];
    const visibility = parsed["visibility"];
    return {
      text: typeof parsed["text"] === "string" ? parsed["text"].slice(0, MAX_TEXT) : "",
      rating: rating === "good" || rating === "okay" || rating === "bad" ? rating : null,
      critique: critique === "positive" || critique === "neutral" || critique === "negative" ? critique : null,
      visibility: isFeedbackVisibility(visibility) ? visibility : null,
    };
  } catch {
    return { text: "", rating: null, critique: null, visibility: null };
  }
}

export default function FeedbackPage() {
  // Draft restore via lazy initializers (same key/shape the dialog uses;
  // text only — screenshots never persist). SSR-safe: readDraft() returns
  // defaults without window.
  const [rating, setRating] = useState<Rating>(() => readDraft().rating ?? "okay");
  const [critique, setCritique] = useState<Critique>(() => readDraft().critique ?? "negative");
  const [visibility, setVisibility] = useState<FeedbackVisibility>(() => readDraft().visibility ?? "guest");
  const [visibilityTouched, setVisibilityTouched] = useState(() => readDraft().visibility !== null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [text, setText] = useState(() => readDraft().text);
  const [labelsRaw, setLabelsRaw] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [reportId, setReportId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [startedUrl, setStartedUrl] = useState("");

  // startedUrl must sync post-hydration (window is unavailable in prerender).
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.location?.href) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- post-hydration sync only; avoids an SSR mismatch.
        setStartedUrl(window.location.href.slice(0, 2048));
      }
    } catch {
      /* best-effort */
    }
  }, []);

  // Session detect (fail-open to guest): signed-in reporters default to
  // Tracked unless they already picked a mode or restored a draft choice.
  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (cancelled) return;
        const authed = data?.user != null;
        setSignedIn(authed);
        if (authed) {
          setVisibility((current) => {
            if (visibilityTouched || current !== "guest") return current;
            return "tracked";
          });
        }
      })
      .catch(() => {
        if (!cancelled) setSignedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visibilityTouched]);

  // Persist the text draft under the dialog's key (never screenshots).
  useEffect(() => {
    if (reportId !== null) return;
    try {
      window.localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ text: text.slice(0, MAX_TEXT), rating, critique, visibility }),
      );
    } catch {
      /* best-effort; quota/private-mode failures must not break the form */
    }
  }, [text, rating, critique, visibility, reportId]);

  const handleScreenshotChange = useCallback((next: File | null) => {
    setScreenshot(next);
    // Stale shapes belong to the previous image — never carry them over.
    setAnnotations([]);
    setError("");
  }, []);

  const handleCapture = useCallback(async () => {
    setError("");
    setCapturing(true);
    try {
      const blob = await capturePageForFeedback();
      handleScreenshotChange(new File([blob], "capture.jpg", { type: "image/jpeg" }));
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Could not capture this page.");
    } finally {
      setCapturing(false);
    }
  }, [handleScreenshotChange]);

  function parseLabels(raw: string): string[] | null {
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (parts.length > 20) return null;
    if (parts.some((l) => l.length < 1 || l.length > 64)) return null;
    return parts;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice("");
    setReportId(null);
    setError("");
    try {
      // Client validation mirrors POST /api/feedback verbatim.
      if (rating !== "good" && rating !== "okay" && rating !== "bad") {
        setError("Invalid rating (good|okay|bad).");
        setBusy(false);
        return;
      }
      if (critique !== "positive" && critique !== "neutral" && critique !== "negative") {
        setError("Invalid critique (positive|neutral|negative).");
        setBusy(false);
        return;
      }
      if (!isFeedbackVisibility(visibility)) {
        setError("Invalid visibility (tracked|anonymous|guest).");
        setBusy(false);
        return;
      }
      const body = text.trim();
      if (body.length < 1 || body.length > MAX_TEXT) {
        setError("Invalid text (1..4000 chars).");
        setBusy(false);
        return;
      }
      const labels = parseLabels(labelsRaw);
      if (labels === null) {
        setError("Invalid labels (string array, <=20, each 1..64 chars).");
        setBusy(false);
        return;
      }
      const name = contactName.trim();
      if (visibility === "guest" && name.length > 0 && (name.length < 1 || name.length > 100)) {
        setError("Invalid contact_name (1..100 chars).");
        setBusy(false);
        return;
      }
      const email = contactEmail.trim();
      if (
        visibility === "guest" &&
        email.length > 0 &&
        (email.length < 3 || email.length > 254 || !EMAIL_RE.test(email))
      ) {
        setError("Invalid contact_email (valid email, 3..254 chars).");
        setBusy(false);
        return;
      }
      if (screenshot) {
        if (screenshot.size === 0) {
          setError("Invalid screenshot (empty).");
          setBusy(false);
          return;
        }
        if (screenshot.size > MAX_SCREENSHOT_BYTES) {
          setError(`Screenshot too large (${screenshot.size} bytes). 8MB max.`);
          setBusy(false);
          return;
        }
        const t = screenshot.type.toLowerCase();
        if (t !== "image/jpeg" && t !== "image/png" && t !== "image/webp") {
          setError("Invalid screenshot (JPEG/PNG/WebP only).");
          setBusy(false);
          return;
        }
      }
      if (annotations.length > 20) {
        setError("Invalid annotations (array, <=20).");
        setBusy(false);
        return;
      }
      // The annotator's highlight tool is named "box"; the route's enum
      // calls it "highlight" — map it so the contract always validates.
      const annotationsPayload = annotations.map((a) => ({
        tool: a.tool === "box" ? "highlight" : a.tool,
        x: a.x,
        y: a.y,
        w: a.w,
        h: a.h,
        ...(a.comment.trim() ? { comment: a.comment.trim().slice(0, 280) } : {}),
      }));

      let pageUrl = startedUrl;
      try {
        if (typeof window !== "undefined" && window.location?.href) {
          pageUrl = window.location.href.slice(0, 2048);
        }
      } catch {
        /* keep startedUrl */
      }

      let res: Response;
      if (screenshot) {
        const form = new FormData();
        form.set("reporterType", "human");
        form.set("rating", rating);
        form.set("critique", critique);
        form.set("text", body);
        form.set("visibility", visibility);
        form.set("source", "page");
        if (visibility === "guest") {
          if (name) form.set("contact_name", name.slice(0, 100));
          if (email) form.set("contact_email", email.slice(0, 254));
        }
        if (labels.length > 0) form.set("labels", JSON.stringify(labels));
        if (annotationsPayload.length > 0) form.set("annotations", JSON.stringify(annotationsPayload));
        if (pageUrl) form.set("pageUrl", pageUrl);
        if (startedUrl) form.set("startedUrl", startedUrl);
        form.set("screenshot", screenshot, screenshot.name);
        res = await fetch("/api/feedback", { method: "POST", body: form });
      } else {
        res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            reporterType: "human",
            rating,
            critique,
            text: body,
            visibility,
            source: "page",
            ...(visibility === "guest"
              ? {
                  ...(name ? { contact_name: name.slice(0, 100) } : {}),
                  ...(email ? { contact_email: email.slice(0, 254) } : {}),
                }
              : {}),
            ...(labels.length > 0 ? { labels } : {}),
            ...(annotationsPayload.length > 0 ? { annotations: annotationsPayload } : {}),
            pageUrl,
            startedUrl,
          }),
        });
      }
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        id?: string;
      };
      if (!res.ok || !data.success) {
        setError(
          typeof data.error === "string" && data.error.length > 0
            ? data.error
            : "Could not save feedback. Try again shortly.",
        );
        return;
      }
      const id = typeof data.id === "string" && data.id.length > 0 ? data.id : null;
      setReportId(id);
      setNotice(id ? `Feedback submitted. Report ID: ${id}` : "Thanks — your feedback is in the queue for review.");
      setText("");
      setLabelsRaw("");
      setScreenshot(null);
      setAnnotations([]);
      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* best-effort */
      }
    } catch {
      setError("Could not reach the feedback store. Try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  const pill = (on: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-bold ${
      on
        ? "border-cyan-300 bg-cyan-300/15 text-cyan-200"
        : "border-white/15 text-slate-300 hover:bg-white/10"
    }`;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-2xl space-y-4 px-4 py-10">
        <Link className="text-sm text-cyan-300 hover:underline" href="/">
          ← Home
        </Link>
        <header className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">Feedback</p>
          <h1 className="text-3xl font-black">Tell us what&apos;s weird.</h1>
          <p className="text-sm text-slate-300">
            Spotted a bug, a confusing page, or something great? Send it here — humans review every report. No
            account needed, no coins involved.
          </p>
        </header>

        {notice && (
          <p
            role="status"
            className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm text-emerald-100"
          >
            {notice}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-300/30 bg-red-300/10 p-3 text-sm text-red-100"
          >
            {error}
          </p>
        )}

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <div>
            <p className="text-sm font-bold text-slate-200">Who is reporting?</p>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Identity">
              {(["tracked", "anonymous", "guest"] as FeedbackVisibility[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={visibility === v}
                  onClick={() => {
                    setVisibility(v);
                    setVisibilityTouched(true);
                    setError("");
                  }}
                  className={pill(visibility === v)}
                >
                  {v === "tracked" ? "👤 Tracked" : v === "guest" ? "🧑‍💻 Guest" : "🕵️ Anonymous"}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {visibility === "tracked"
                ? signedIn
                  ? "Tracked: filed under your signed-in account so admins can follow up."
                  : "Tracked: needs a signed-in session — sign in first, or pick Guest."
                : visibility === "guest"
                  ? "Guest: no account needed. Add a name or email below if you want a reply."
                  : "Anonymous: no name attached, even when signed in."}
            </p>
          </div>

          {visibility === "guest" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-bold text-slate-200">
                Name <span className="font-normal text-slate-500">(optional)</span>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value.slice(0, 100))}
                  placeholder="What should we call you?"
                  maxLength={100}
                  autoComplete="nickname"
                  className="mt-2 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-sm font-normal text-white placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
                />
              </label>
              <label className="block text-sm font-bold text-slate-200">
                Email <span className="font-normal text-slate-500">(optional)</span>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value.slice(0, 254))}
                  placeholder="you@example.com"
                  maxLength={254}
                  autoComplete="email"
                  className="mt-2 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-sm font-normal text-white placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
                />
              </label>
            </div>
          )}

          <div>
            <p className="text-sm font-bold text-slate-200">How was it?</p>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Rating">
              {(["good", "okay", "bad"] as Rating[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={rating === r}
                  onClick={() => setRating(r)}
                  className={pill(rating === r)}
                >
                  {r === "good" ? "😊 good" : r === "okay" ? "😐 okay" : "😞 bad"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-200">What kind of note?</p>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Critique">
              {(["positive", "neutral", "negative"] as Critique[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={critique === c}
                  onClick={() => setCritique(c)}
                  className={pill(critique === c)}
                >
                  {c === "positive" ? "😄 praise" : c === "neutral" ? "😐 meh" : "😭 problem"}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-sm font-bold text-slate-200">
            What happened?
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT))}
              rows={5}
              maxLength={MAX_TEXT}
              placeholder="What page, what you expected, what you saw…"
              aria-label="Feedback details"
              className="mt-2 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-sm font-normal text-white placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
            />
          </label>
          <p className="text-xs text-slate-500">{text.trim().length}/4000</p>

          <div>
            <label htmlFor="feedback-page-labels" className="block text-sm font-bold text-slate-200">
              Labels <span className="font-normal text-slate-500">(optional, comma-separated)</span>
            </label>
            <input
              id="feedback-page-labels"
              type="text"
              value={labelsRaw}
              onChange={(e) => setLabelsRaw(e.target.value)}
              placeholder="ui, onboarding"
              className="mt-2 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-sm font-normal text-white placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">Up to 20 labels, each 1…64 characters.</p>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-200">
              Screenshot <span className="font-normal text-slate-500">(optional, JPG/PNG/WebP ≤ 8MB)</span>
            </p>
            <div className="mt-2">
              <ScreenshotDropzone value={screenshot} onChange={handleScreenshotChange} disabled={busy} />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCapture}
                disabled={capturing || busy}
                className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10 disabled:opacity-50"
              >
                {capturing ? "Capturing…" : "📸 Capture this tab"}
              </button>
            </div>
            {screenshot && (
              <div className="mt-2 rounded-xl border border-white/10 bg-slate-900 p-3">
                <p className="mb-2 text-xs font-bold text-slate-300">
                  Annotate <span className="font-normal text-slate-500">(arrow, circle, highlight, blur + comments)</span>
                </p>
                <ScreenshotAnnotator
                  image={screenshot}
                  annotations={annotations}
                  onChange={setAnnotations}
                  disabled={busy}
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-cyan-200 disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send feedback"}
          </button>
          <p className="text-xs text-slate-500">
            Please don&apos;t include passwords, keys, or payment details. Bots can post programmatically to the same
            store via POST /api/feedback.
          </p>
        </form>

        <p className="text-xs text-slate-500">
          Site admin? The review queue lives at{" "}
          <Link href="/feedback/admin" className="text-cyan-300 hover:underline">
            /feedback/admin
          </Link>{" "}
          (login + admin role required, fail-closed).
        </p>
      </section>
    </main>
  );
}

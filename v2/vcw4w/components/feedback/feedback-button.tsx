"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type {
  FeedbackCritique,
  FeedbackRating,
  FeedbackReporterType,
  FeedbackVisibility,
} from "../feedback/feedback-dialog";
import { FEEDBACK_MAX_TEXT } from "../feedback/feedback-dialog";
import {
  SCREENSHOT_ANNOTATION_COMMENT_MAX,
  SCREENSHOT_ANNOTATION_MAX,
  type Annotation as ScreenshotAnnotation,
} from "./screenshot-annotator";
import { capturePageForFeedback } from "../feedback/screenshot-capture";

/**
 * Top-bar "Give Feedback" entry point (humans + bots).
 *
 * Renders the button only; the dialog chunk (sibling envelope
 * DS-FEEDBACK-02) is lazy-mounted via next/dynamic (client-only) the first
 * time the button is pressed, so the feedback form never weighs down the
 * initial top-bar bundle. The `../feedback/feedback-dialog` specifier keeps
 * this file free of a static cycle with the dialog module.
 *
 * Identity (DS-FBOV-02, owned here): this file detects the session
 * client-side (supabase browser client getUser, fail-open to guest),
 * defaults visibility to tracked when signed-in else guest, owns the
 * guest contact state (optional name/email), persists the text draft to
 * localStorage, and includes visibility/contact/annotations in the submit
 * payload. The dialog (fbov-01 lane) declares the matching identity +
 * annotations props, which this button passes directly with full type
 * safety.
 *
 * Mounting (integrator-owned, shared manifests untouched here): render
 * <FeedbackButton /> in the top bar (e.g. site-header) — file a QUEUE.md
 * wiring request, do not edit layout/header from this lane.
 */
const FeedbackDialogLazy = dynamic(
  () =>
    import("../feedback/feedback-dialog").then((mod) => mod.FeedbackDialog),
  { ssr: false },
);

type FeedbackButtonProps = {
  className?: string;
};

type ApiResult = {
  success?: boolean;
  error?: unknown;
  id?: unknown;
};

/** Draft shape persisted to localStorage under fw-feedback-draft — text
 *  only, never screenshots. Merged contract: the wizard fields
 *  (reporterType/labels/startedUrl) are optional so the identity-lane hooks
 *  (load/saveFeedbackDraft) keep compiling with their text+rating+critique+
 *  visibility subset, and vice versa. */
export type FeedbackDraft = {
  reporterType?: FeedbackReporterType;
  rating: FeedbackRating | null;
  critique: FeedbackCritique | null;
  text: string;
  labels?: string[];
  startedUrl?: string;
  // DS-FBOV-02 identity slice: persisted alongside the sibling fields under
  // the same key so either writer round-trips the whole draft.
  visibility?: FeedbackVisibility;
};

const DRAFT_KEY = "fw-feedback-draft";

function readDraft(): Partial<FeedbackDraft> {
  try {
    if (typeof window === "undefined" || !window.localStorage) return {};
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<FeedbackDraft>;
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed;
  } catch {
    return {};
  }
}

function sanitizeDraft(d: Partial<FeedbackDraft>): Partial<FeedbackDraft> {
  const out: Partial<FeedbackDraft> = {};
  if (d.reporterType === "human" || d.reporterType === "bot") out.reporterType = d.reporterType;
  if (d.rating === "good" || d.rating === "okay" || d.rating === "bad") out.rating = d.rating;
  if (d.critique === "positive" || d.critique === "neutral" || d.critique === "negative") out.critique = d.critique;
  if (typeof d.text === "string") out.text = d.text.slice(0, FEEDBACK_MAX_TEXT);
  if (Array.isArray(d.labels)) {
    out.labels = d.labels
      .filter((l): l is string => typeof l === "string")
      .map((l) => l.trim())
      .filter((l) => l.length >= 1 && l.length <= 64)
      .slice(0, 20);
  }
  if (typeof d.startedUrl === "string") out.startedUrl = d.startedUrl.slice(0, 2048);
  // DS-FBOV-02: identity slice — invalid values fall back to the guest
  // default at read time (loadFeedbackDraft); sanitize keeps valid ones.
  if (isFeedbackVisibility(d.visibility)) out.visibility = d.visibility;
  return out;
}

function apiErrorText(body: ApiResult | null, status: number): string {
  if (body && typeof body.error === "string" && body.error.trim().length > 0) {
    return body.error;
  }
  return `Request failed (${status}).`;
}

/**
 * Identity model (DS-FBOV-02): FeedbackVisibility (tracked | anonymous |
 * guest) is owned by the dialog contract (feedback-dialog.tsx, fbov-01
 * lane) and imported above — tracked = signed-in linked filing, anonymous
 * = signed-in unlinked, guest = signed-out + optional contact name/email.
 */

export const FEEDBACK_DRAFT_KEY = "fw-feedback-draft";
export const FEEDBACK_MAX_CONTACT_NAME = 100;
export const FEEDBACK_MIN_CONTACT_EMAIL = 3;
export const FEEDBACK_MAX_CONTACT_EMAIL = 254;
export const FEEDBACK_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Identity draft slice persisted to localStorage — text only, never screenshots. */
export type FeedbackIdentityDraft = {
  text: string;
  rating: FeedbackRating | null;
  critique: FeedbackCritique | null;
  visibility: FeedbackVisibility;
};

function isFeedbackRating(value: unknown): value is FeedbackRating {
  return value === "good" || value === "okay" || value === "bad";
}

function isFeedbackCritique(value: unknown): value is FeedbackCritique {
  return value === "positive" || value === "neutral" || value === "negative";
}

function isFeedbackVisibility(value: unknown): value is FeedbackVisibility {
  return value === "tracked" || value === "anonymous" || value === "guest";
}

/** Paste wiring hook: read the persisted draft (null when absent/invalid). */
export function loadFeedbackDraft(): FeedbackIdentityDraft | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const raw = window.localStorage.getItem(FEEDBACK_DRAFT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const rec = parsed as Record<string, unknown>;
    return {
      text:
        typeof rec["text"] === "string"
          ? (rec["text"] as string).slice(0, FEEDBACK_MAX_TEXT)
          : "",
      rating: isFeedbackRating(rec["rating"]) ? rec["rating"] : null,
      critique: isFeedbackCritique(rec["critique"]) ? rec["critique"] : null,
      visibility: isFeedbackVisibility(rec["visibility"])
        ? rec["visibility"]
        : "guest",
    };
  } catch {
    return null;
  }
}

/**
 * Paste wiring hook: persist the identity draft slice. Merges over the
 * sibling draft fields (reporterType/labels/startedUrl) under the shared
 * key — writes text + rating + critique + visibility only, screenshot
 * bytes are never persisted.
 */
export function saveFeedbackDraft(draft: FeedbackIdentityDraft): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    let prev: Record<string, unknown> = {};
    try {
      const raw = window.localStorage.getItem(FEEDBACK_DRAFT_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed === "object" && parsed !== null) {
          prev = parsed as Record<string, unknown>;
        }
      }
    } catch {
      prev = {};
    }
    window.localStorage.setItem(
      FEEDBACK_DRAFT_KEY,
      JSON.stringify({
        ...prev,
        text: draft.text.slice(0, FEEDBACK_MAX_TEXT),
        rating: draft.rating,
        critique: draft.critique,
        visibility: draft.visibility,
      }),
    );
  } catch {
    /* best-effort (private-mode quota, etc.) */
  }
}

/** Paste wiring hook: drop the persisted draft (after a successful submit). */
export function clearFeedbackDraft(): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.removeItem(FEEDBACK_DRAFT_KEY);
  } catch {
    /* best-effort */
  }
}

/**
 * Guest contact name validation: optional, but when present must be
 * 1..100 chars (trimmed).
 */
export function validateContactName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length < 1 || trimmed.length > FEEDBACK_MAX_CONTACT_NAME) {
    return "Contact name must be 1…100 characters.";
  }
  return null;
}

/**
 * Guest contact email validation: optional, but when present must match a
 * basic email shape and be 3..254 chars (trimmed).
 */
export function validateContactEmail(email: string): string | null {
  const trimmed = email.trim();
  if (trimmed.length === 0) return null;
  if (
    trimmed.length < FEEDBACK_MIN_CONTACT_EMAIL ||
    trimmed.length > FEEDBACK_MAX_CONTACT_EMAIL ||
    !FEEDBACK_EMAIL_RE.test(trimmed)
  ) {
    return "Contact email must be a valid address (3…254 characters).";
  }
  return null;
}

/**
 * Dialog wiring (DS-FBOV-02 → DS-FBOV-01): the dialog now declares the
 * identity props itself (visibility/onVisibilityChange, contactName/
 * onContactNameChange, contactEmail/onContactEmailChange) plus the
 * screenshot annotations pair (annotations/onAnnotationsChange), so the
 * button passes them directly with full type safety — no passthrough cast.
 * screenshotPreviewUrl stays unwired here (annotator lane follow-up).
 */

export function FeedbackButton({ className }: FeedbackButtonProps) {
  const [open, setOpen] = useState(false);
  const [reporterType, setReporterType] =
    useState<FeedbackReporterType>(() => readDraft().reporterType ?? "human");
  const [rating, setRating] = useState<FeedbackRating | null>(
    () => readDraft().rating ?? null,
  );
  const [critique, setCritique] = useState<FeedbackCritique | null>(
    () => readDraft().critique ?? null,
  );
  const [text, setText] = useState(() => readDraft().text ?? "");
  const [labels, setLabels] = useState<string[]>(() => readDraft().labels ?? []);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  // Percent-coord annotations from the Step 2 micro-editor (plan §5) —
  // POSTed as the `annotations` JSON field, client-validated like the server.
  const [annotations, setAnnotations] = useState<ScreenshotAnnotation[]>([]);
  // Object-URL preview feeding the Step 2 annotator, memoized per File;
  // the effect only revokes on change/unmount so URLs never leak
  // (no setState-in-effect, same pattern as screenshot-dropzone.tsx).
  const screenshotPreviewUrl = useMemo(
    () => (screenshot ? URL.createObjectURL(screenshot) : null),
    [screenshot],
  );
  useEffect(() => {
    return () => {
      if (screenshotPreviewUrl) URL.revokeObjectURL(screenshotPreviewUrl);
    };
  }, [screenshotPreviewUrl]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  // URL the user was on when feedback was started + submitted (DS-FEEDBACK-11).
  const [startedUrl, setStartedUrl] = useState(() => readDraft().startedUrl ?? "");
  // Identity (DS-FBOV-02): session-derived visibility + guest contact +
  // screenshot annotations (owned here, rendered by the dialog shell).
  // A restored non-guest visibility counts as an explicit choice.
  const [initialVisibility] = useState<FeedbackVisibility>(() => {
    const v: unknown = readDraft().visibility;
    return isFeedbackVisibility(v) ? v : "guest";
  });
  const [signedIn, setSignedIn] = useState(false);
  const [visibility, setVisibility] =
    useState<FeedbackVisibility>(initialVisibility);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const visibilityTouchedRef = useRef(initialVisibility !== "guest");

  // Session detect (fail-open to guest): default visibility tracked when
  // signed-in, else guest. Never blocks the form on auth failure.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getUser();
        if (cancelled) return;
        if (error || !data?.user) {
          setSignedIn(false);
          if (!visibilityTouchedRef.current) setVisibility("guest");
          return;
        }
        setSignedIn(true);
        if (!visibilityTouchedRef.current) setVisibility("tracked");
      } catch {
        if (cancelled) return;
        // Fail-open: session unreadable → file as guest.
        setSignedIn(false);
        if (!visibilityTouchedRef.current) setVisibility("guest");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleVisibilityChange = useCallback((next: FeedbackVisibility) => {
    visibilityTouchedRef.current = true;
    setVisibility(next);
    setSubmitError(null);
  }, []);

  // Guests always file as guest; a stale "guest" draft on a signed-in
  // session is coerced back to the tracked default.
  const effectiveVisibility: FeedbackVisibility = signedIn
    ? visibility === "guest"
      ? "tracked"
      : visibility
    : "guest";

  const resetForm = useCallback(() => {
    setRating(null);
    setCritique(null);
    setText("");
    setLabels([]);
    setScreenshot(null);
    setAnnotations([]);
    setStartedUrl("");
    setSubmitError(null);
    setSubmitSuccess(null);
    setContactName("");
    setContactEmail("");
    // Identity falls back to the session default; re-arm the untouched
    // default so a still-signed-in user gets tracked again on reopen.
    setVisibility(signedIn ? "tracked" : "guest");
    visibilityTouchedRef.current = false;
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* best-effort */
    }
  }, [signedIn]);

  // Persist the draft (cancel keeps it, success clears it via resetForm).
  // Screenshot files are intentionally not persisted.
  useEffect(() => {
    if (submitSuccess !== null) return;
    try {
      const draft: FeedbackDraft = sanitizeDraft({
        reporterType,
        rating,
        critique,
        text,
        labels,
        startedUrl,
        visibility,
      }) as FeedbackDraft;
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* best-effort; quota/private-mode failures must not break the form */
    }
  }, [reporterType, rating, critique, text, labels, startedUrl, visibility, submitSuccess]);
  const handleOpen = useCallback(() => {
    try {
      if (typeof window !== "undefined" && window.location?.href) {
        setStartedUrl(window.location.href.slice(0, 2048));
      }
    } catch {
      /* best-effort; empty stays empty */
    }
    setSubmitError(null);
    // Keep a prior success message cleared when reopening fresh.
    setSubmitSuccess(null);
    setOpen(true);
  }, []);

  // DS-FB2-02 snap slice: attached screenshot button state. snapActive is
  // the ~3s "just snapped" glyph; snapBusy locks the snap button mid-capture.
  const [snapActive, setSnapActive] = useState(false);
  const [snapBusy, setSnapBusy] = useState(false);
  const snapTimerRef = useRef<number | null>(null);

  // Clear the ~3s active window on unmount so no timer fires post-unmount.
  useEffect(() => {
    return () => {
      if (snapTimerRef.current !== null) {
        window.clearTimeout(snapTimerRef.current);
        snapTimerRef.current = null;
      }
    };
  }, []);

  const handleSnap = useCallback(() => {
    if (snapBusy || submitting) return;
    setSnapBusy(true);
    void (async () => {
      let captureError: string | null = null;
      let capturedBlob: Blob | null = null;
      try {
        const blob = await capturePageForFeedback();
        capturedBlob = blob;
        const file = new File(
          [blob],
          `feedback-screenshot-${Date.now()}.jpg`,
          { type: blob.type || "image/jpeg" },
        );
        setScreenshot(file);
        setAnnotations([]);
        setSubmitError(null);
      } catch (err) {
        // Fail-open: still open the dialog with no image + an error hint.
        captureError =
          err instanceof Error && err.message
            ? err.message
            : "Could not capture a screenshot. Attach a file instead.";
        setScreenshot(null);
        setAnnotations([]);
        setSubmitError(captureError);
      } finally {
        setSnapBusy(false);
      }
      // Active glyph for ~3s (CSS class + aria-pressed only, no JS shine).
      setSnapActive(true);
      if (snapTimerRef.current !== null) {
        window.clearTimeout(snapTimerRef.current);
      }
      snapTimerRef.current = window.setTimeout(() => {
        setSnapActive(false);
        snapTimerRef.current = null;
      }, 3000);
      // Flash/freeze overlay hook (FB2-03 owns the listener): dispatch with
      // the captured blob so the frozen frame shows; fail-open with no
      // dispatch when capture failed (no-blink path). Listener-optional.
      try {
        if (typeof window !== "undefined" && capturedBlob) {
          window.dispatchEvent(
            new CustomEvent("fw:feedback-flash", { detail: capturedBlob }),
          );
        }
      } catch {
        /* listener-optional; dialog still opens */
      }
      try {
        if (typeof window !== "undefined" && window.location?.href) {
          setStartedUrl(window.location.href.slice(0, 2048));
        }
      } catch {
        /* best-effort; empty stays empty */
      }
      // Open with the capture preloaded; on failure the error hint above
      // survives (unlike handleOpen, which clears it). Clear a stale
      // success message so a fresh snap never shows the old panel.
      if (captureError === null) setSubmitError(null);
      setSubmitSuccess(null);
      setOpen(true);
    })();
  }, [snapBusy, submitting]);

  const handleClose = useCallback(() => {
    if (submitting) return;
    // Reset only after a successful submit; a cancel keeps the draft, a
    // failure keeps everything (incl. error) for retry.
    if (submitSuccess !== null) {
      resetForm();
    }
    setOpen(false);
  }, [submitting, submitSuccess, resetForm]);

  const handleClear = useCallback(() => {
    if (submitting) return;
    resetForm();
  }, [submitting, resetForm]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;

    // Client-side validation uses the same strings as POST /api/feedback
    // (route.ts) so inline errors match server errors verbatim.
    const trimmed = text.trim();
    if (rating === null) {
      setSubmitError("Invalid rating (good|okay|bad).");
      return;
    }
    if (critique === null) {
      setSubmitError("Invalid critique (positive|neutral|negative).");
      return;
    }
    if (trimmed.length < 1 || trimmed.length > FEEDBACK_MAX_TEXT) {
      setSubmitError("Invalid text (1..4000 chars).");
      return;
    }
    if (
      labels.length > 20 ||
      labels.some((l) => l.length < 1 || l.length > 64)
    ) {
      setSubmitError("Invalid labels (string array, <=20, each 1..64 chars).");
      return;
    }
    // Annotations mirror POST /api/feedback validation (route.ts): <=20
    // shapes, percent numbers 0..100, comments 0..280 chars.
    if (annotations.length > SCREENSHOT_ANNOTATION_MAX) {
      setSubmitError("Invalid annotations (array, <=20).");
      return;
    }
    const isPct = (n: unknown): n is number =>
      typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 100;
    for (const a of annotations) {
      if (!isPct(a.x) || !isPct(a.y) || !isPct(a.w) || !isPct(a.h)) {
        setSubmitError("Invalid annotation position (x/y numbers 0..100).");
        return;
      }
      if (typeof a.comment !== "string" || a.comment.length > SCREENSHOT_ANNOTATION_COMMENT_MAX) {
        setSubmitError("Invalid annotation.comment (<=280 chars).");
        return;
      }
    }
    if (annotations.length > 0 && !screenshot) {
      setSubmitError("Annotations need a screenshot.");
      return;
    }
    if (screenshot) {
      if (screenshot.size === 0) {
        setSubmitError("Invalid screenshot (empty).");
        return;
      }
      if (screenshot.size > 8 * 1024 * 1024) {
        setSubmitError(`Screenshot too large (${screenshot.size} bytes). 8MB max.`);
        return;
      }
      const t = screenshot.type.toLowerCase();
      const n = screenshot.name.toLowerCase();
      const typeOk =
        t === "image/jpeg" ||
        t === "image/jpg" ||
        t === "image/png" ||
        t === "image/webp";
      const extOk =
        n.endsWith(".jpg") || n.endsWith(".jpeg") || n.endsWith(".png") || n.endsWith(".webp");
      if (!typeOk && !extOk) {
        setSubmitError("Invalid screenshot (PNG, JPG, or WebP only).");
        return;
      }
    }

    // Identity (DS-FBOV-02): guests may attach an optional contact name
    // (1..100 chars) + email (valid shape, 3..254 chars); contact is
    // stored server-side for guest reports only. Annotations ride along
    // (cap 20, mirroring POST /api/feedback).
    const isGuest = effectiveVisibility === "guest";
    const trimmedName = contactName.trim();
    const trimmedEmail = contactEmail.trim();
    if (isGuest) {
      const nameErr = validateContactName(contactName);
      if (nameErr) {
        setSubmitError(nameErr);
        return;
      }
      const emailErr = validateContactEmail(contactEmail);
      if (emailErr) {
        setSubmitError(emailErr);
        return;
      }
    }
    if (annotations.length > 20) {
      setSubmitError("Invalid annotations (array, <=20).");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      let pageUrl = startedUrl;
      try {
        if (typeof window !== "undefined" && window.location?.href) {
          pageUrl = window.location.href.slice(0, 2048);
        }
      } catch {
        /* keep startedUrl */
      }

      // Wire shape matches the route ANNOTATION_TOOLS enum: the annotator
      // "box" id is the same highlight-box shape the server calls "highlight".
      const wireAnnotations = annotations.map((a) => ({
        tool: a.tool === "box" ? "highlight" : a.tool,
        x: a.x,
        y: a.y,
        w: a.w,
        h: a.h,
        ...(a.comment.trim()
          ? { comment: a.comment.trim().slice(0, SCREENSHOT_ANNOTATION_COMMENT_MAX) }
          : {}),
      }));
      const wireAnnotationsJson = JSON.stringify(wireAnnotations);

      let res: Response;
      if (screenshot) {
        const form = new FormData();
        form.set("reporterType", reporterType);
        form.set("rating", rating);
        form.set("critique", critique);
        form.set("text", trimmed);
        if (pageUrl) form.set("pageUrl", pageUrl);
        if (startedUrl) form.set("startedUrl", startedUrl);
        if (labels.length > 0) form.set("labels", JSON.stringify(labels));
        form.set("visibility", effectiveVisibility);
        form.set("source", "dialog");
        if (isGuest) {
          if (trimmedName) form.set("contact_name", trimmedName);
          if (trimmedEmail) form.set("contact_email", trimmedEmail);
        }
        if (annotations.length > 0)
          form.set("annotations", wireAnnotationsJson);
        form.set("screenshot", screenshot, screenshot.name);
        res = await fetch("/api/feedback", { method: "POST", body: form });
      } else {
        res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            reporterType,
            rating,
            critique,
            text: trimmed,
            pageUrl,
            startedUrl,
            // Route parses JSON-encoded `labels` from a string field.
            ...(labels.length > 0 ? { labels: JSON.stringify(labels) } : {}),
            visibility: effectiveVisibility,
            source: "dialog",
            ...(isGuest && trimmedName ? { contact_name: trimmedName } : {}),
            ...(isGuest && trimmedEmail ? { contact_email: trimmedEmail } : {}),
            // Route accepts a raw annotations array OR a JSON string.
            ...(annotations.length > 0 ? { annotations: wireAnnotations } : {}),
          }),
        });
      }

      let body: ApiResult | null = null;
      try {
        body = (await res.json()) as ApiResult;
      } catch {
        body = null;
      }
      if (!res.ok || body?.success === false) {
        throw new Error(apiErrorText(body, res.status));
      }
      const id =
        body && typeof body.id === "string" ? ` Report ID: ${body.id}` : "";
      // Success: swap the dialog to its success panel; state resets on close.
      setSubmitSuccess(`Feedback submitted.${id}`);
    } catch (err) {
      // Surface API error text verbatim; keep all draft state for retry.
      setSubmitError(
        err instanceof Error && err.message ? err.message : "Unable to save feedback.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    submitting,
    reporterType,
    rating,
    critique,
    text,
    labels,
    screenshot,
    startedUrl,
    effectiveVisibility,
    contactName,
    contactEmail,
    annotations,
  ]);

  // Site-wide "G" shortcut: opens the dialog when not typing, dialog closed.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (open || submitting) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (event.key !== "g" && event.key !== "G") return;
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (target.isContentEditable) return;
      }
      event.preventDefault();
      handleOpen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting, handleOpen]);

  return (
    <>
      {/* DS-FB2-02 glow: gradient shine sweep across the feedback button once
          every 10s (2s sweep = first 20% of the 10s loop, idle the rest),
          CSS keyframes only — no JS timers. Reduced-motion disables it. */}
      <style>{`@keyframes fw-feedback-shine-sweep{0%{transform:translateX(-150%)}20%{transform:translateX(150%)}100%{transform:translateX(150%)}}.fw-feedback-shine{position:relative;overflow:hidden}.fw-feedback-shine::after{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 42%,rgba(255,255,255,.55) 50%,transparent 58%);transform:translateX(-150%);animation:fw-feedback-shine-sweep 10s linear infinite;pointer-events:none}@media (prefers-reduced-motion:reduce){.fw-feedback-shine::after{animation:none;display:none}}`}</style>
      <div className={`flex items-stretch ${className ?? ""}`} role="group" aria-label="Feedback actions">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="fw-feedback-shine rounded-r-none border-r-0"
          onClick={handleOpen}
          aria-haspopup="dialog"
          aria-label="Give Feedback"
        >
          💬 Give Feedback
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`rounded-l-none px-2 ${snapActive ? "fw-snap-active bg-muted" : ""}`}
          onClick={handleSnap}
          disabled={snapBusy || submitting}
          aria-label="Take screenshot and give feedback"
          aria-pressed={snapActive}
          title={snapBusy ? "Capturing screenshot…" : "Take screenshot and give feedback"}
        >
          <span aria-hidden="true">{snapActive ? "🖥️📸" : "🖥️📷"}</span>
          <span className="sr-only">Take screenshot</span>
        </Button>
      </div>
      {open ? (
        <FeedbackDialogLazy
          open={open}
          onClose={handleClose}
          reporterType={reporterType}
          setReporterType={(next) => {
            setReporterType(next);
            setSubmitError(null);
          }}
          rating={rating}
          onRatingChange={(next) => {
            setRating(next);
            setSubmitError(null);
          }}
          critique={critique}
          onCritiqueChange={(next) => {
            setCritique(next);
            setSubmitError(null);
          }}
          text={text}
          onTextChange={(next) => {
            setText(next);
            setSubmitError(null);
          }}
          labels={labels}
          onLabelsChange={(next) => {
            setLabels(next);
            setSubmitError(null);
          }}
          screenshotName={screenshot?.name ?? null}
          screenshotSize={screenshot?.size ?? null}
          screenshotFile={screenshot}
          screenshotPreviewUrl={screenshotPreviewUrl}
          onScreenshotChange={(next) => {
            setScreenshot(next);
            // Orphaned annotations belong to the removed shot — drop them.
            if (next === null) setAnnotations([]);
            setSubmitError(null);
          }}
          annotations={annotations}
          onAnnotationsChange={(next) => {
            setAnnotations(next);
            setSubmitError(null);
          }}
          visibility={effectiveVisibility}
          onVisibilityChange={handleVisibilityChange}
          signedIn={signedIn}
          contactName={contactName}
          onContactNameChange={(next) => {
            setContactName(next);
            setSubmitError(null);
          }}
          contactEmail={contactEmail}
          onContactEmailChange={(next) => {
            setContactEmail(next);
            setSubmitError(null);
          }}
          submitting={submitting}
          error={submitError}
          success={submitSuccess}
          onSubmit={() => void handleSubmit()}
          onClear={handleClear}
        />
      ) : null}
    </>
  );
}

export default FeedbackButton;

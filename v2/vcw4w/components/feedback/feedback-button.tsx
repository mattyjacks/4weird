"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import type {
  FeedbackCritique,
  FeedbackRating,
  FeedbackReporterType,
} from "../feedback/feedback-dialog";
import { FEEDBACK_MAX_TEXT } from "../feedback/feedback-dialog";

/**
 * Top-bar "Give Feedback" entry point (humans + bots).
 *
 * Renders the button only; the dialog chunk (sibling envelope
 * DS-FEEDBACK-02) is lazy-mounted via next/dynamic (client-only) the first
 * time the button is pressed, so the feedback form never weighs down the
 * initial top-bar bundle. The `../feedback/feedback-dialog` specifier keeps
 * this file free of a static cycle with the dialog module.
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

function apiErrorText(body: ApiResult | null, status: number): string {
  if (body && typeof body.error === "string" && body.error.trim().length > 0) {
    return body.error;
  }
  return `Request failed (${status}).`;
}

export function FeedbackButton({ className }: FeedbackButtonProps) {
  const [open, setOpen] = useState(false);
  const [reporterType, setReporterType] =
    useState<FeedbackReporterType>("human");
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [critique, setCritique] = useState<FeedbackCritique | null>(null);
  const [text, setText] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  // URL the user was on when feedback was started + submitted (DS-FEEDBACK-11).
  const [startedUrl, setStartedUrl] = useState("");

  const resetForm = useCallback(() => {
    setRating(null);
    setCritique(null);
    setText("");
    setLabels([]);
    setScreenshot(null);
    setStartedUrl("");
    setSubmitError(null);
    setSubmitSuccess(null);
  }, []);

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

  const handleClose = useCallback(() => {
    if (submitting) return;
    // Reset only after a successful submit; a cancel keeps the draft, a
    // failure keeps everything (incl. error) for retry.
    if (submitSuccess !== null) {
      resetForm();
    }
    setOpen(false);
  }, [submitting, submitSuccess, resetForm]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;

    // Client-side validation mirrors POST /api/feedback (route.ts):
    // rating + critique + text 1..4000 required before enabling Submit.
    const trimmed = text.trim();
    if (rating === null || critique === null) {
      setSubmitError("Pick a rating and a critique tone before submitting.");
      return;
    }
    if (trimmed.length < 1 || trimmed.length > FEEDBACK_MAX_TEXT) {
      setSubmitError("Feedback text must be 1…4000 characters.");
      return;
    }
    if (
      labels.length > 20 ||
      labels.some((l) => l.length < 1 || l.length > 64)
    ) {
      setSubmitError("Labels must be ≤20 entries, each 1…64 characters.");
      return;
    }
    if (screenshot) {
      if (screenshot.size === 0) {
        setSubmitError("Screenshot is empty.");
        return;
      }
      if (screenshot.size > 8 * 1024 * 1024) {
        setSubmitError("Screenshot too large. 8MB max.");
        return;
      }
      const t = screenshot.type.toLowerCase();
      const n = screenshot.name.toLowerCase();
      if (t !== "image/jpeg" && t !== "image/jpg" && !n.endsWith(".jpg") && !n.endsWith(".jpeg")) {
        setSubmitError("Screenshot must be a JPG.");
        return;
      }
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
  ]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={className}
        onClick={handleOpen}
        aria-haspopup="dialog"
      >
        💬 Give Feedback
      </Button>
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
          onScreenshotChange={(next) => {
            setScreenshot(next);
            setSubmitError(null);
          }}
          submitting={submitting}
          error={submitError}
          success={submitSuccess}
          onSubmit={() => void handleSubmit()}
        />
      ) : null}
    </>
  );
}

export default FeedbackButton;

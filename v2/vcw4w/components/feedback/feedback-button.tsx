"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import type {
  FeedbackCritique,
  FeedbackRating,
  FeedbackReporterType,
} from "../feedback/feedback-dialog";

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

export function FeedbackButton({ className }: FeedbackButtonProps) {
  const [open, setOpen] = useState(false);
  const [reporterType, setReporterType] =
    useState<FeedbackReporterType>("human");
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [critique, setCritique] = useState<FeedbackCritique | null>(null);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // URL the user was on when feedback was started + submitted (DS-FEEDBACK-11).
  const [startedUrl, setStartedUrl] = useState("");

  const handleOpen = useCallback(() => {
    try {
      if (typeof window !== "undefined" && window.location?.href) {
        setStartedUrl(window.location.href.slice(0, 2048));
      }
    } catch {
      /* best-effort; empty stays empty */
    }
    setOpen(true);
  }, []);
  const handleClose = useCallback(() => {
    if (!submitting) setOpen(false);
  }, [submitting]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      let pageUrl = startedUrl;
      try {
        if (typeof window !== "undefined" && window.location?.href) {
          pageUrl = window.location.href.slice(0, 2048);
        }
      } catch {
        /* keep startedUrl */
      }
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reporterType, rating, critique, text, pageUrl, startedUrl }),
      });
      setOpen(false);
      setRating(null);
      setCritique(null);
      setText("");
      setStartedUrl("");
    } finally {
      setSubmitting(false);
    }
  }, [submitting, reporterType, rating, critique, text, startedUrl]);

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
          setReporterType={setReporterType}
          rating={rating}
          onRatingChange={setRating}
          critique={critique}
          onCritiqueChange={setCritique}
          text={text}
          onTextChange={setText}
          onSubmit={() => void handleSubmit()}
        />
      ) : null}
    </>
  );
}

export default FeedbackButton;

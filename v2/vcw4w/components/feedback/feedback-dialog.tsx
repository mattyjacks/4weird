"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";

export type FeedbackReporterType = "human" | "bot";
export type FeedbackRating = "good" | "okay" | "bad";
export type FeedbackCritique = "positive" | "negative";

export const FEEDBACK_MAX_TEXT = 4000;
export const FEEDBACK_MAX_LABELS = 20;
export const FEEDBACK_MAX_LABEL_CHARS = 64;
export const FEEDBACK_MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;

export interface FeedbackDialogProps {
  open: boolean;
  onClose: () => void;
  reporterType: FeedbackReporterType;
  setReporterType: (next: FeedbackReporterType) => void;
  rating: FeedbackRating | null;
  onRatingChange: (next: FeedbackRating) => void;
  critique: FeedbackCritique | null;
  onCritiqueChange: (next: FeedbackCritique) => void;
  text: string;
  onTextChange: (next: string) => void;
  onSubmit: () => void;
  /** True while the POST is in flight — all inputs + Cancel/Submit lock. */
  submitting?: boolean;
  /** Verbatim API error text (body.error) or client validation message. */
  error?: string | null;
  /** Non-null once the POST succeeds — dialog swaps to the success panel. */
  success?: string | null;
  /** Optional labels (<=20, each 1..64 chars) sent as JSON per route contract. */
  labels?: string[];
  onLabelsChange?: (next: string[]) => void;
  /** Selected screenshot file name for display (file itself lives in button). */
  screenshotName?: string | null;
  screenshotSize?: number | null;
  onScreenshotChange?: (next: File | null) => void;
}

const RATINGS: FeedbackRating[] = ["good", "okay", "bad"];
const CRITIQUES: FeedbackCritique[] = ["positive", "negative"];

function ratingLabel(rating: FeedbackRating): string {
  if (rating === "good") return "Good";
  if (rating === "okay") return "Okay";
  return "Bad";
}

function critiqueLabel(critique: FeedbackCritique): string {
  return critique === "positive" ? "Positive critique" : "Negative critique";
}

export function FeedbackDialog({
  open,
  onClose,
  reporterType,
  setReporterType,
  rating,
  onRatingChange,
  critique,
  onCritiqueChange,
  text,
  onTextChange,
  onSubmit,
  submitting = false,
  error = null,
  success = null,
  labels = [],
  onLabelsChange,
  screenshotName = null,
  screenshotSize = null,
  onScreenshotChange,
}: FeedbackDialogProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const labelsInputId = "feedback-dialog-labels";
  const screenshotInputId = "feedback-dialog-screenshot";

  const trimmedLength = text.trim().length;
  const textValid = trimmedLength >= 1 && trimmedLength <= FEEDBACK_MAX_TEXT;
  const labelsValid =
    labels.length <= FEEDBACK_MAX_LABELS &&
    labels.every((l) => l.length >= 1 && l.length <= FEEDBACK_MAX_LABEL_CHARS);
  const canSubmit =
    success === null &&
    !submitting &&
    rating !== null &&
    critique !== null &&
    textValid &&
    labelsValid;

  const missing = useMemo(() => {
    const parts: string[] = [];
    if (rating === null) parts.push("pick a rating");
    if (critique === null) parts.push("pick a critique tone");
    if (trimmedLength < 1) parts.push("write some feedback");
    else if (trimmedLength > FEEDBACK_MAX_TEXT) parts.push("shorten feedback to 4000 chars");
    if (!labelsValid) parts.push("fix labels (≤20, each ≤64 chars)");
    return parts;
  }, [rating, critique, trimmedLength, labelsValid]);

  // Focus the textarea on open for keyboard users.
  useEffect(() => {
    if (open && success === null) {
      const t = window.setTimeout(() => textareaRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
  }, [open, success]);

  // Close on Esc (never while submitting).
  useEffect(() => {
    if (!open || submitting) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const submitted = success !== null;

  const handleBackdropClick = () => {
    if (!submitting) onClose();
  };

  const handleLabelsInput = (raw: string) => {
    if (!onLabelsChange) return;
    // Comma-separated editing; drop empties, keep order, cap at max+1 so
    // the overflow hint can trigger (validation blocks submit).
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, FEEDBACK_MAX_LABELS + 1);
    onLabelsChange(parts);
  };

  const handleScreenshotInput = (file: File | null) => {
    if (!onScreenshotChange) return;
    onScreenshotChange(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Submit feedback"
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border bg-background p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Thanks for the feedback!</h2>
            <p role="status" className="text-sm text-muted-foreground">
              {success}
            </p>
            <div className="flex justify-end">
              <Button type="button" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Submit feedback</h2>

            <div role="radiogroup" aria-label="Reporter type" className="space-y-2">
              <span className="text-sm font-medium">Who is reporting?</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={reporterType === "human" ? "default" : "outline"}
                  size="sm"
                  role="radio"
                  aria-checked={reporterType === "human"}
                  disabled={submitting}
                  onClick={() => setReporterType("human")}
                >
                  Human
                </Button>
                <Button
                  type="button"
                  variant={reporterType === "bot" ? "default" : "outline"}
                  size="sm"
                  role="radio"
                  aria-checked={reporterType === "bot"}
                  disabled={submitting}
                  onClick={() => setReporterType("bot")}
                >
                  Bot
                </Button>
              </div>
            </div>

            <div role="radiogroup" aria-label="Feeling rating" className="space-y-2">
              <span className="text-sm font-medium">
                How does this feel? <span aria-hidden="true">*</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {RATINGS.map((option) => (
                  <Button
                    key={option}
                    type="button"
                    variant={rating === option ? "default" : "outline"}
                    size="sm"
                    role="radio"
                    aria-checked={rating === option}
                    disabled={submitting}
                    onClick={() => onRatingChange(option)}
                  >
                    {ratingLabel(option)}
                  </Button>
                ))}
              </div>
            </div>

            <div role="radiogroup" aria-label="Critique tone" className="space-y-2">
              <span className="text-sm font-medium">
                What kind of critique is this? <span aria-hidden="true">*</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {CRITIQUES.map((option) => (
                  <Button
                    key={option}
                    type="button"
                    variant={critique === option ? "default" : "outline"}
                    size="sm"
                    role="radio"
                    aria-checked={critique === option}
                    disabled={submitting}
                    onClick={() => onCritiqueChange(option)}
                  >
                    {critiqueLabel(option)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="feedback-dialog-text"
                className="text-sm font-medium"
              >
                Feedback <span aria-hidden="true">*</span>
              </label>
              <textarea
                id="feedback-dialog-text"
                ref={textareaRef}
                value={text}
                onChange={(event) => onTextChange(event.target.value)}
                placeholder="Describe what happened and what you expected…"
                rows={4}
                maxLength={FEEDBACK_MAX_TEXT}
                required
                disabled={submitting}
                aria-required="true"
                aria-invalid={!textValid}
                aria-describedby="feedback-dialog-text-hint"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              />
              <p
                id="feedback-dialog-text-hint"
                className="text-xs text-muted-foreground"
              >
                {trimmedLength}/{FEEDBACK_MAX_TEXT} characters — required
                (1…4000).
              </p>
            </div>

            {onLabelsChange ? (
              <div className="space-y-1.5">
                <label htmlFor={labelsInputId} className="text-sm font-medium">
                  Labels <span className="font-normal text-muted-foreground">(optional, comma-separated)</span>
                </label>
                <input
                  id={labelsInputId}
                  type="text"
                  value={labels.join(", ")}
                  onChange={(event) => handleLabelsInput(event.target.value)}
                  placeholder="ui, onboarding"
                  disabled={submitting}
                  aria-invalid={!labelsValid}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                />
                <p className="text-xs text-muted-foreground">
                  Up to 20 labels, each 1…64 characters.
                </p>
              </div>
            ) : null}

            {onScreenshotChange ? (
              <div className="space-y-1.5">
                <label
                  htmlFor={screenshotInputId}
                  className="text-sm font-medium"
                >
                  Screenshot{" "}
                  <span className="font-normal text-muted-foreground">(optional, JPG ≤ 8MB)</span>
                </label>
                <input
                  id={screenshotInputId}
                  type="file"
                  accept="image/jpeg,.jpg,.jpeg"
                  disabled={submitting}
                  onChange={(event) =>
                    handleScreenshotInput(event.target.files?.[0] ?? null)
                  }
                  className="block w-full text-sm disabled:opacity-50"
                />
                {screenshotName ? (
                  <p className="text-xs text-muted-foreground">
                    Selected: {screenshotName}
                    {screenshotSize !== null
                      ? ` (${Math.round(screenshotSize / 1024)} KB)`
                      : ""}
                    {" — "}
                    <button
                      type="button"
                      className="underline"
                      disabled={submitting}
                      onClick={() => handleScreenshotInput(null)}
                    >
                      remove
                    </button>
                  </p>
                ) : null}
              </div>
            ) : null}

            {reporterType === "bot" && (
              <section
                aria-label="Bot-only recordkeeping"
                className="rounded-md border bg-muted/40 p-3"
              >
                <h3 className="text-sm font-medium">Bot report details</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  This report is filed as automated bot feedback for
                  recordkeeping. Human review may follow; only the fields
                  above plus an optional screenshot are collected here.
                </p>
              </section>
            )}

            {error ? (
              <p
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            ) : null}

            {!canSubmit && !submitting ? (
              <p className="text-xs text-muted-foreground">
                To submit: {missing.join(" · ")}.
              </p>
            ) : null}

            {submitting ? (
              <p role="status" className="text-sm text-muted-foreground">
                Submitting feedback…
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={onSubmit}
                disabled={!canSubmit}
                aria-disabled={!canSubmit}
                title={!canSubmit ? `To submit: ${missing.join(", ")}` : undefined}
              >
                {submitting ? "Submitting…" : "Submit"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FeedbackDialog;

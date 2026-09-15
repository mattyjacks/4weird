"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { ScreenshotAnnotator, type Annotation as ScreenshotAnnotation } from "./screenshot-annotator";
import { ScreenshotDropzone } from "./screenshot-dropzone";

export type FeedbackReporterType = "human" | "bot";
export type FeedbackRating = "good" | "okay" | "bad";
export type FeedbackCritique = "positive" | "negative";
export type FeedbackVisibility = "tracked" | "anonymous" | "guest";

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
  /** Live File for the dropzone thumbnail/capture flow (button-owned). */
  screenshotFile?: File | null;
  onScreenshotChange?: (next: File | null) => void;
  /** Object-URL preview of the screenshot (button-owned); Step 2 annotates it. */
  screenshotPreviewUrl?: string | null;
  /** Percent-coord annotations (cap 20); rendered in Step 2 when a shot is attached. */
  annotations?: ScreenshotAnnotation[];
  onAnnotationsChange?: (next: ScreenshotAnnotation[]) => void;
  /**
   * Identity picker (Step 2). All optional — old callers that pass none of
   * these get the previous behaviour (treated as Anonymous, picker hidden).
   */
  visibility?: FeedbackVisibility;
  onVisibilityChange?: (next: FeedbackVisibility) => void;
  /**
   * Session hint from the owner (FeedbackButton probes the browser session
   * and passes it explicitly). signedIn=true renders the Tracked (default) /
   * Anonymous radio with no contact inputs; signedIn=false renders the
   * guest Name + Email inputs with privacy copy (visibility fixed to
   * guest upstream). Undefined preserves the legacy full picker
   * (tracked/guest/anonymous + contact when non-anonymous).
   */
  signedIn?: boolean;
  contactName?: string;
  onContactNameChange?: (next: string) => void;
  contactEmail?: string;
  onContactEmailChange?: (next: string) => void;
}

const RATINGS: FeedbackRating[] = ["good", "okay", "bad"];
const CRITIQUES: FeedbackCritique[] = ["positive", "negative"];

const TEMPLATES: { label: string; body: string }[] = [
  {
    label: "Bug",
    body: "Bug: [what happened]\n\nExpected: \nActual: ",
  },
  {
    label: "Confusing",
    body: "Confusing: [where in the UI]\n\nI expected … but I saw …",
  },
  {
    label: "Love it",
    body: "Love it: [what works well]\n\nKeep it up because …",
  },
];

function ratingLabel(rating: FeedbackRating): string {
  if (rating === "good") return "Good";
  if (rating === "okay") return "Okay";
  return "Bad";
}

function critiqueLabel(critique: FeedbackCritique): string {
  return critique === "positive" ? "Positive critique" : "Negative critique";
}

function visibilityLabel(visibility: FeedbackVisibility): string {
  if (visibility === "tracked") return "Tracked";
  if (visibility === "guest") return "Guest";
  return "Anonymous";
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
  screenshotFile = null,
  onScreenshotChange,
  screenshotPreviewUrl = null,
  annotations = [],
  onAnnotationsChange,
  visibility = "anonymous",
  onVisibilityChange,
  signedIn,
  contactName = "",
  onContactNameChange,
  contactEmail = "",
  onContactEmailChange,
}: FeedbackDialogProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const labelsInputId = "feedback-dialog-labels";
  const [step, setStep] = useState<1 | 2>(1);
  const [stepError, setStepError] = useState<string | null>(null);

  const trimmedLength = text.trim().length;
  const textValid = trimmedLength >= 1 && trimmedLength <= FEEDBACK_MAX_TEXT;
  const labelsValid =
    labels.length <= FEEDBACK_MAX_LABELS &&
    labels.every((l) => l.length >= 1 && l.length <= FEEDBACK_MAX_LABEL_CHARS);
  const step1Valid =
    rating !== null && critique !== null && textValid;
  // Identity is optional: Anonymous always passes; Tracked passes (the
  // account link comes from the server session, no contact needed); Guest
  // passes with a blank-or-valid name (1..100) and email. Old callers pass
  // nothing → Anonymous → unchanged.
  const contactNameValid = contactName.trim().length <= 100;
  const contactEmailValid =
    contactEmail.trim().length === 0 ||
    (contactEmail.trim().length >= 3 &&
      contactEmail.trim().length <= 254 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim()));
  const identityValid =
    visibility === "tracked" ||
    visibility === "anonymous" ||
    (contactNameValid && contactEmailValid);
  const canSubmit =
    success === null &&
    !submitting &&
    rating !== null &&
    critique !== null &&
    textValid &&
    labelsValid &&
    identityValid;

  const missing = useMemo(() => {
    const parts: string[] = [];
    if (rating === null) parts.push("pick a rating");
    if (critique === null) parts.push("pick a critique tone");
    if (trimmedLength < 1) parts.push("write some feedback");
    else if (trimmedLength > FEEDBACK_MAX_TEXT) parts.push("shorten feedback to 4000 chars");
    if (!labelsValid) parts.push("fix labels (≤20, each ≤64 chars)");
    if (!contactNameValid) parts.push("fix contact name (≤100 chars)");
    if (!contactEmailValid && visibility !== "tracked" && visibility !== "anonymous") parts.push("fix contact email");
    return parts;
  }, [rating, critique, trimmedLength, labelsValid, contactNameValid, contactEmailValid, visibility]);

  // Reset to step 1 on fresh open (render-time adjustment, not an effect).
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open && success === null) {
      setStep(1);
      setStepError(null);
    }
  }

  // Focus the textarea on open / when landing on step 1.
  useEffect(() => {
    if (open && success === null && step === 1) {
      const t = window.setTimeout(() => textareaRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
  }, [open, success, step]);

  // Close on Esc (never while submitting) + trap Tab within the dialog.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (submitting) return;
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "Tab") {
        const root = dialogRef.current;
        if (!root) return;
        const focusables = Array.from(
          root.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (focusables.length === 0) {
          event.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey) {
          if (document.activeElement === first) {
            event.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  // Cmd/Ctrl+Enter submits from anywhere in the dialog when submittable.
  useEffect(() => {
    if (!open || success !== null) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        if (canSubmit && !submitting) onSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, success, canSubmit, submitting, onSubmit]);

  // Scroll-lock + background inert while open (stacking fix: dialog portals
  // to document.body at z-[100], above header/nav dropdowns).
  useEffect(() => {
    if (!open) return;
    if (typeof document === "undefined") return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const siblings = Array.from(document.body.children).filter(
      (el) =>
        !(el instanceof HTMLElement && el.hasAttribute("data-feedback-portal-root")),
    );
    const prevInert: boolean[] = siblings.map(
      (el) => (el as HTMLElement & { inert?: boolean }).inert ?? false,
    );
    siblings.forEach((el) => {
      if (el instanceof HTMLElement) {
        (el as HTMLElement & { inert?: boolean }).inert = true;
      }
    });
    return () => {
      document.body.style.overflow = originalOverflow;
      siblings.forEach((el, i) => {
        if (el instanceof HTMLElement) {
          (el as HTMLElement & { inert?: boolean }).inert =
            prevInert[i] ?? false;
        }
      });
    };
  }, [open]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const submitted = success !== null;

  const identitySummary =
    visibility === "anonymous"
      ? "Anonymous"
      : [
          visibilityLabel(visibility),
          contactName.trim(),
          contactEmail.trim() ? `<${contactEmail.trim()}>` : "",
        ]
          .filter((s) => s.length > 0)
          .join(" · ");

  // Session-aware picker: signed-in users choose Tracked (default) /
  // Anonymous with no contact inputs (the account link suffices); guests
  // file as guest with optional Name + Email inputs; legacy callers without
  // a session hint keep the full three-way picker.
  const identityOptions: FeedbackVisibility[] | null =
    signedIn === true
      ? ["tracked", "anonymous"]
      : signedIn === false
        ? null
        : ["tracked", "guest", "anonymous"];
  const showContactInputs =
    signedIn === true
      ? false
      : signedIn === false
        ? true
        : visibility !== "anonymous";

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

  const handleTemplate = (body: string) => {
    if (submitting) return;
    if (text.trim().length === 0) onTextChange(body);
    else onTextChange(`${text}\n\n${body}`);
    setStepError(null);
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleContinue = () => {
    // Inline step-1 validation uses the same strings as the server
    // (app/api/feedback/route.ts) so users see one vocabulary.
    if (rating === null) {
      setStepError("Invalid rating (good|okay|bad).");
      return;
    }
    if (critique === null) {
      setStepError("Invalid critique (positive|negative).");
      return;
    }
    if (!textValid) {
      setStepError("Invalid text (1..4000 chars).");
      return;
    }
    setStepError(null);
    setStep(2);
  };

  const inlineError = step === 2 ? error : (stepError ?? error);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
      role="presentation"
      data-feedback-portal-root="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        data-feedback-dialog="true"
        aria-label={submitted ? "Feedback submitted" : `Submit feedback — step ${step} of 2`}
        className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border bg-background p-5 shadow-lg sm:max-w-lg sm:rounded-lg sm:p-6"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Thanks for the feedback!</h2>
            <p role="status" className="text-sm text-muted-foreground">
              {success}
            </p>
            <div className="flex justify-end">
              <Button type="button" onClick={onClose} className="min-h-[44px]">
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">
                {step === 1 ? "What happened?" : "Show it (optional)"}
              </h2>
              {/* Progress dots */}
              <div className="flex items-center gap-2" role="group" aria-label="Feedback progress">
                <button
                  type="button"
                  aria-label="Go to step 1: What happened?"
                  aria-current={step === 1 ? "step" : undefined}
                  disabled={submitting}
                  onClick={() => setStep(1)}
                  className={`h-[12px] min-h-[44px] min-w-[44px] rounded-full px-2 text-xs ${
                    step === 1 ? "font-bold" : "text-muted-foreground"
                  }`}
                >
                  <span aria-hidden="true" className={`inline-block h-2 w-2 rounded-full ${step === 1 ? "bg-foreground" : "bg-muted-foreground/40"}`} />
                  <span className="sr-only">Step 1</span> 1
                </button>
                <button
                  type="button"
                  aria-label="Go to step 2: Show it"
                  aria-current={step === 2 ? "step" : undefined}
                  disabled={submitting}
                  onClick={() => {
                    if (step1Valid) {
                      setStepError(null);
                      setStep(2);
                    } else {
                      handleContinue();
                    }
                  }}
                  className={`h-[12px] min-h-[44px] min-w-[44px] rounded-full px-2 text-xs ${
                    step === 2 ? "font-bold" : "text-muted-foreground"
                  }`}
                >
                  <span aria-hidden="true" className={`inline-block h-2 w-2 rounded-full ${step === 2 ? "bg-foreground" : "bg-muted-foreground/40"}`} />
                  <span className="sr-only">Step 2</span> 2
                </button>
              </div>
            </div>

            {step === 1 ? (
              <div className="space-y-4">
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
                        onClick={() => {
                          onRatingChange(option);
                          setStepError(null);
                        }}
                        className="min-h-[44px] min-w-[44px] rounded-full px-4"
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
                        onClick={() => {
                          onCritiqueChange(option);
                          setStepError(null);
                        }}
                        className="min-h-[44px] min-w-[44px] rounded-full px-4"
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
                  <div className="flex flex-wrap gap-2" aria-label="Feedback templates">
                    {TEMPLATES.map((t) => (
                      <Button
                        key={t.label}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={submitting}
                        onClick={() => handleTemplate(t.body)}
                        className="min-h-[44px] rounded-full"
                      >
                        {t.label}
                      </Button>
                    ))}
                  </div>
                  <textarea
                    id="feedback-dialog-text"
                    ref={textareaRef}
                    value={text}
                    onChange={(event) => {
                      onTextChange(event.target.value);
                      setStepError(null);
                    }}
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
                    aria-live="polite"
                  >
                    {trimmedLength}/{FEEDBACK_MAX_TEXT} characters — required
                    (1…4000).
                  </p>
                </div>

                {inlineError ? (
                  <p
                    role="alert"
                    className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    {inlineError}
                  </p>
                ) : null}

                {!step1Valid && !submitting && !inlineError ? (
                  <p className="text-xs text-muted-foreground">
                    To continue: {missing.join(" · ")}.
                  </p>
                ) : null}

                <div className="flex justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={submitting}
                    className="min-h-[44px]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleContinue}
                    disabled={submitting}
                    className="min-h-[44px]"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {onScreenshotChange ? (
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-medium">
                      Step 2 — Show it{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional, PNG/JPG/WebP ≤ 8MB)
                      </span>
                    </h3>
                    <ScreenshotDropzone
                      value={screenshotFile}
                      onChange={(next) => {
                        setStepError(null);
                        onScreenshotChange(next);
                      }}
                      disabled={submitting}
                    />
                  </div>
                ) : null}

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
                      className="min-h-[44px]"
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
                      className="min-h-[44px]"
                    >
                      Bot
                    </Button>
                  </div>
                </div>

                {onVisibilityChange ? (
                  <div role="radiogroup" aria-label="Identity" className="space-y-2">
                    <span className="text-sm font-medium">How should we credit this?</span>
                    {identityOptions ? (
                    <div className="flex flex-wrap gap-2">
                      {identityOptions.map((option) => (
                        <Button
                          key={option}
                          type="button"
                          variant={visibility === option ? "default" : "outline"}
                          size="sm"
                          role="radio"
                          aria-checked={visibility === option}
                          disabled={submitting}
                          onClick={() => onVisibilityChange(option)}
                          className="min-h-[44px]"
                        >
                          {visibilityLabel(option)}
                        </Button>
                      ))}
                    </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Filing as <span className="font-medium text-foreground">Guest</span>
                      </p>
                    )}
                    {showContactInputs ? (
                      <div className="grid gap-2">
                        {onContactNameChange ? (
                          <div className="space-y-1.5">
                            <label htmlFor="feedback-dialog-contact-name" className="text-sm font-medium">
                              Name <span className="font-normal text-muted-foreground">(optional)</span>
                            </label>
                            <input
                              id="feedback-dialog-contact-name"
                              type="text"
                              value={contactName}
                              onChange={(event) => onContactNameChange(event.target.value)}
                              placeholder="Ada Lovelace"
                              disabled={submitting}
                              autoComplete="name"
                              maxLength={100}
                              aria-invalid={!contactNameValid}
                              className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                            />
                            {!contactNameValid ? (
                              <p className="text-xs text-destructive">
                                Keep the name to 100 characters, or leave it blank.
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                        {onContactEmailChange ? (
                          <div className="space-y-1.5">
                            <label htmlFor="feedback-dialog-contact-email" className="text-sm font-medium">
                              Email <span className="font-normal text-muted-foreground">(optional)</span>
                            </label>
                            <input
                              id="feedback-dialog-contact-email"
                              type="email"
                              value={contactEmail}
                              onChange={(event) => onContactEmailChange(event.target.value)}
                              placeholder="ada@example.com"
                              disabled={submitting}
                              autoComplete="email"
                              maxLength={254}
                              aria-invalid={!contactEmailValid}
                              className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                            />
                            {!contactEmailValid ? (
                              <p className="text-xs text-destructive">
                                Enter a valid email, or leave it blank.
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          Contact is for follow-up only. Shown to admins, never public.
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}

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
                      className="min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                    />
                    <p className="text-xs text-muted-foreground">
                      Up to 20 labels, each 1…64 characters.
                    </p>
                  </div>
                ) : null}

                {/* Review summary before submit */}
                <section aria-label="Review your feedback" className="rounded-md border bg-muted/40 p-3">
                  <h3 className="text-sm font-medium">Review</h3>
                  <dl className="mt-1 space-y-1 text-xs text-muted-foreground">
                    <div className="flex gap-1">
                      <dt className="font-medium">Rating:</dt>
                      <dd>{rating ? ratingLabel(rating) : "—"}</dd>
                    </div>
                    <div className="flex gap-1">
                      <dt className="font-medium">Tone:</dt>
                      <dd>{critique ? critiqueLabel(critique) : "—"}</dd>
                    </div>
                    <div className="flex gap-1">
                      <dt className="font-medium">Identity:</dt>
                      <dd>{identitySummary}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Feedback:</dt>
                      <dd className="mt-0.5 line-clamp-3 whitespace-pre-wrap break-words text-foreground/80">
                        {text.trim() ? text.trim().slice(0, 280) : "—"}
                      </dd>
                    </div>
                  </dl>
                </section>

                {screenshotName && screenshotPreviewUrl && onAnnotationsChange ? (
              <div className="space-y-1.5">
                <h3 className="text-sm font-medium">
                  Step 2 — Annotate <span className="font-normal text-muted-foreground">(optional)</span>
                </h3>
                <ScreenshotAnnotator
                  image={screenshotPreviewUrl}
                  annotations={annotations}
                  onChange={onAnnotationsChange}
                  disabled={submitting}
                />
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

                {inlineError ? (
                  <p
                    role="alert"
                    className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    {inlineError}
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

                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    disabled={submitting}
                    className="min-h-[44px]"
                  >
                    Back
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      disabled={submitting}
                      className="min-h-[44px]"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={onSubmit}
                      disabled={!canSubmit}
                      aria-disabled={!canSubmit}
                      title={!canSubmit ? `To submit: ${missing.join(", ")}` : "Submit (Cmd/Ctrl+Enter)"}
                      className="min-h-[44px]"
                    >
                      {submitting ? "Submitting…" : "Submit"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default FeedbackDialog;

"use client";

import React from "react";

export type FeedbackReporterType = "human" | "bot";
export type FeedbackRating = "good" | "okay" | "bad";
export type FeedbackCritique = "positive" | "negative";

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
}: FeedbackDialogProps) {
  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Submit feedback">
      <h2>Submit feedback</h2>

      <div role="radiogroup" aria-label="Reporter type">
        <span>Who is reporting?</span>
        <button
          type="button"
          role="radio"
          aria-checked={reporterType === "human"}
          onClick={() => setReporterType("human")}
        >
          Human
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={reporterType === "bot"}
          onClick={() => setReporterType("bot")}
        >
          Bot
        </button>
      </div>

      <div role="radiogroup" aria-label="Feeling rating">
        <span>How does this feel?</span>
        {RATINGS.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={rating === option}
            onClick={() => onRatingChange(option)}
          >
            {ratingLabel(option)}
          </button>
        ))}
      </div>

      <div role="radiogroup" aria-label="Critique tone">
        <span>What kind of critique is this?</span>
        {CRITIQUES.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={critique === option}
            onClick={() => onCritiqueChange(option)}
          >
            {critiqueLabel(option)}
          </button>
        ))}
      </div>

      <div>
        <label htmlFor="feedback-dialog-text">Feedback</label>
        <textarea
          id="feedback-dialog-text"
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="Describe what happened and what you expected…"
          rows={4}
        />
      </div>

      {reporterType === "bot" && (
        <section aria-label="Bot-only recordkeeping">
          <h3>Bot report details</h3>
          <p>
            This report is filed as automated bot feedback for recordkeeping.
            Human review may follow; no screenshot or editor state is collected
            here.
          </p>
        </section>
      )}

      <div>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        <button type="button" onClick={onSubmit}>
          Submit
        </button>
      </div>
    </div>
  );
}

export default FeedbackDialog;

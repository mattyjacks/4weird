"use client";

import { useMemo, useRef, useState } from "react";
import type { VocrehabGameRunProps } from "./vocrehab-game-frame";
import { makeSeed, parseSeed } from "@/lib/vocrehab-seed";
import { vocrehabSelectInbox } from "@/lib/vocrehab-seed-pools";
import { inboxSprintTemplate } from "@/lib/vocrehab-game-template-state";

type VocrehabTriage = "reply" | "schedule" | "file" | "flag";
type VocrehabMsgKind = "urgent" | "normal" | "fyi" | "phishing" | "accommodation";

interface VocrehabMessage {
  id: string;
  from: string;
  subject: string;
  body: string;
  kind: VocrehabMsgKind;
}

const VOCREHAB_ACTIONS: readonly { id: VocrehabTriage; label: string }[] = [
  { id: "reply", label: "Reply now" },
  { id: "schedule", label: "Schedule" },
  { id: "file", label: "File" },
  { id: "flag", label: "Flag" },
];

const VOCREHAB_STARTER = "Thank you for sharing this. What would help is ";

export default function VocrehabGameInboxSprint({ vocrehabEmit, vocrehabFinish, vocrehabSeed, vocrehabRunKey, vocrehabTemplateState }: VocrehabGameRunProps) {
  // Seeded deal: 8 scenarios (4 phish + 4 legit), same seed replays the same set+order.
  const sel = useMemo(
    () => vocrehabSelectInbox(parseSeed(vocrehabSeed ?? null) ?? makeSeed()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vocrehabSeed, vocrehabRunKey],
  );
  const customTemplate = inboxSprintTemplate(vocrehabTemplateState);
  const scenarios = customTemplate ? customTemplate.messages.map((message) => ({
    id: message.id,
    sender: message.from,
    subject: message.subject,
    bodySnippet: message.body,
    verdict: message.kind === "phishing" ? "phish" as const : "legit" as const,
    safeAction: message.kind === "phishing" ? "flag" as const : message.kind === "urgent" ? "reply" as const : message.kind === "fyi" ? "file" as const : "schedule" as const,
    kind: message.kind,
  })) : sel.scenarios.map((scenario) => ({
    ...scenario,
    kind: scenario.verdict === "phish" ? "phishing" as const : scenario.safeAction === "reply" ? "urgent" as const : scenario.safeAction === "file" ? "fyi" as const : "normal" as const,
  }));
  const VOCREHAB_MESSAGES: readonly VocrehabMessage[] = scenarios.map((s) => ({
    id: s.id,
    from: s.sender,
    subject: s.subject,
    body: s.bodySnippet,
    kind: s.kind,
  }));
  // Reply-box target: first legit scenario asking for a reply, else first legit, else first dealt.
  const vocrehabReplyTargetId = customTemplate?.replyTargetId ??
    scenarios.find((s) => s.verdict === "legit" && s.safeAction === "reply")?.id ??
    scenarios.find((s) => s.verdict === "legit")?.id ?? scenarios[0].id;
  const [vocrehabTriaged, setVocrehabTriaged] = useState<Record<string, VocrehabTriage>>({});
  const [vocrehabReply, setVocrehabReply] = useState("");
  const [vocrehabReplySaved, setVocrehabReplySaved] = useState(false);
  const [vocrehabCoach, setVocrehabCoach] = useState<string | null>(null);
  const doneRef = useRef(false);

  const vocrehabTriage = (msg: VocrehabMessage, action: VocrehabTriage) => {
    setVocrehabTriaged((p) => ({ ...p, [msg.id]: action }));
    if (msg.kind === "phishing" && action === "flag") {
      vocrehabEmit("action", { message: msg.id, action, phishingCaution: true });
      setVocrehabCoach("✓ Flagging that password message was the safe move — urgent threats asking for clicks deserve a flag, not a reply.");
    } else if (msg.kind === "phishing") {
      vocrehabEmit("error", { message: msg.id, action, coached: true });
      setVocrehabCoach("That password message looks like phishing — flagging is always safe. No penalty here; that is exactly what practice is for.");
    } else {
      vocrehabEmit("action", { message: msg.id, action, kind: msg.kind });
      setVocrehabCoach(null);
    }
  };

  const vocrehabSaveReply = () => {
    const text = vocrehabReply.trim();
    if (text.length < 10) {
      setVocrehabCoach("Add a little more — one or two sentences is plenty.");
      return;
    }
    setVocrehabReplySaved(true);
    vocrehabEmit("action", { message: vocrehabReplyTargetId, action: "reply-saved", replyLength: text.length });
    setVocrehabCoach("✓ Reply saved — clear and kind.");
  };

  const triagedCount = Object.keys(vocrehabTriaged).length;
  const urgentRight = scenarios
    .filter((s) => s.verdict === "legit")
    .filter((s) => vocrehabTriaged[s.id] === "reply" || vocrehabTriaged[s.id] === "schedule").length;
  const phishingFlagged = scenarios
    .filter((s) => s.verdict === "phish")
    .every((s) => vocrehabTriaged[s.id] === "flag");

  const vocrehabDone = () => {
    if (doneRef.current || triagedCount < VOCREHAB_MESSAGES.length || !vocrehabReplySaved) return;
    doneRef.current = true;
    vocrehabFinish({ triaged: triagedCount, urgentHandled: urgentRight, phishingFlagged, seed: sel.seed });
  };

  return (
    <div className="vocrehab-game-inbox-sprint space-y-3">
      <p className="text-sm text-muted-foreground" role="status">
        Triaged {triagedCount} of {VOCREHAB_MESSAGES.length} messages · Reply to teammate:{" "}
        {vocrehabReplySaved ? "✓ saved" : "○ not yet"}
      </p>
      {vocrehabCoach && (
        <p className="rounded-lg border p-3 text-sm" role="status">
          {vocrehabCoach}
        </p>
      )}
      <ul className="space-y-2">
        {VOCREHAB_MESSAGES.map((msg) => {
          const chosen = vocrehabTriaged[msg.id];
          return (
            <li key={msg.id} className="rounded-lg border p-3">
              <p className="font-medium">
                ✉ {msg.subject} <span className="text-sm font-normal text-muted-foreground">— {msg.from}</span>
              </p>
              <p className="text-sm text-muted-foreground">{msg.body}</p>
              <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={`Triage: ${msg.subject}`}>
                {VOCREHAB_ACTIONS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => vocrehabTriage(msg, a.id)}
                    aria-pressed={chosen === a.id}
                    className="rounded border px-2.5 py-1 text-sm font-medium aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              {msg.id === vocrehabReplyTargetId && (chosen === "reply" || vocrehabReplySaved) && (
                <div className="mt-2 space-y-2">
                  <label htmlFor="vocrehab-inbox-reply" className="text-sm font-medium">
                    Your 1–2 sentence reply (start from the sentence starter, finish in your own words)
                  </label>
                  <textarea
                    id="vocrehab-inbox-reply"
                    rows={3}
                    value={vocrehabReply}
                    onChange={(e) => setVocrehabReply(e.target.value)}
                    placeholder={VOCREHAB_STARTER}
                    className="w-full rounded border p-2"
                    aria-describedby="vocrehab-inbox-reply-hint"
                  />
                  <p id="vocrehab-inbox-reply-hint" className="text-sm text-muted-foreground">
                    Clarity counts here — spelling and grammar do not.
                  </p>
                  <button
                    type="button"
                    onClick={vocrehabSaveReply}
                    disabled={vocrehabReplySaved}
                    className="rounded border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                  >
                    {vocrehabReplySaved ? "✓ Reply saved" : "Save reply"}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={vocrehabDone}
        disabled={triagedCount < VOCREHAB_MESSAGES.length || !vocrehabReplySaved}
        className="rounded bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50"
      >
        Finish inbox
      </button>
    </div>
  );
}

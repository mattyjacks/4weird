export type VocrehabInboxSprintExtraAction = "reply-now" | "schedule" | "file" | "flag";

export type VocrehabInboxSprintExtraPriority = "urgent" | "normal" | "fyi";

export type VocrehabInboxSprintExtraKind =
  | "urgent"
  | "normal"
  | "fyi"
  | "phishing-ish"
  | "accommodation-request";

export interface VocrehabInboxSprintExtraMessage {
  vocrehabId: string;
  vocrehabSubject: string;
  vocrehabFrom: string;
  vocrehabBody: string;
  vocrehabPriority: VocrehabInboxSprintExtraPriority;
  vocrehabKind: VocrehabInboxSprintExtraKind;
  vocrehabBestAction: VocrehabInboxSprintExtraAction;
  vocrehabSentenceStarter?: string;
  vocrehabKeywords?: string[];
  vocrehabPhishing?: boolean;
}

export interface VocrehabInboxSprintExtraValidation {
  vocrehabOk: boolean;
  vocrehabErrors: string[];
}

const VOCREHAB_INBOX_SPRINT_EXTRA_ACTIONS: readonly VocrehabInboxSprintExtraAction[] = [
  "reply-now",
  "schedule",
  "file",
  "flag",
] as const;

export const VOCREHAB_INBOX_SPRINT_EXTRA_MESSAGES: readonly VocrehabInboxSprintExtraMessage[] = [
  {
    vocrehabId: "vocrehab-inbox-extra-01",
    vocrehabSubject: "Shift start moved to 8am tomorrow",
    vocrehabFrom: "Scheduling Team",
    vocrehabBody:
      "Heads up: your shift tomorrow starts at 8am instead of 9am. Please reply now to confirm you saw this.",
    vocrehabPriority: "urgent",
    vocrehabKind: "urgent",
    vocrehabBestAction: "reply-now",
  },
  {
    vocrehabId: "vocrehab-inbox-extra-02",
    vocrehabSubject: "Accommodation form due today",
    vocrehabFrom: "Supervisor Rivera",
    vocrehabBody:
      "Your accommodation form needs a signature before 5pm today so we can set up your workstation. Please reply now.",
    vocrehabPriority: "urgent",
    vocrehabKind: "urgent",
    vocrehabBestAction: "reply-now",
  },
  {
    vocrehabId: "vocrehab-inbox-extra-03",
    vocrehabSubject: "Team lunch next Friday",
    vocrehabFrom: "Coworker Sam",
    vocrehabBody:
      "We are planning a team lunch next Friday at noon. Let me know this week if you can make it.",
    vocrehabPriority: "normal",
    vocrehabKind: "normal",
    vocrehabBestAction: "schedule",
  },
  {
    vocrehabId: "vocrehab-inbox-extra-04",
    vocrehabSubject: "Updated break room guidelines",
    vocrehabFrom: "Office Manager",
    vocrehabBody:
      "Please review the updated break room guidelines when you get a chance and file this for your records.",
    vocrehabPriority: "normal",
    vocrehabKind: "normal",
    vocrehabBestAction: "file",
  },
  {
    vocrehabId: "vocrehab-inbox-extra-05",
    vocrehabSubject: "Feedback on last week's task",
    vocrehabFrom: "Job Coach Lee",
    vocrehabBody:
      "Nice work on last week's sorting task. I left two notes for you. Reply with one thing you want to practice next.",
    vocrehabPriority: "normal",
    vocrehabKind: "normal",
    vocrehabBestAction: "reply-now",
  },
  {
    vocrehabId: "vocrehab-inbox-extra-06",
    vocrehabSubject: "FYI: building elevator maintenance Sunday",
    vocrehabFrom: "Facilities",
    vocrehabBody:
      "FYI only: the main elevator is down for maintenance on Sunday. No action needed; plan extra time if you visit.",
    vocrehabPriority: "fyi",
    vocrehabKind: "fyi",
    vocrehabBestAction: "file",
  },
  {
    vocrehabId: "vocrehab-inbox-extra-07",
    vocrehabSubject: "URGENT: verify your payroll login now",
    vocrehabFrom: "payroll-support-fast.example.net",
    vocrehabBody:
      "Your paycheck is on hold. Click through and enter your password to release it. Flagging this kind of message is praised; never enter credentials from an email link.",
    vocrehabPriority: "normal",
    vocrehabKind: "phishing-ish",
    vocrehabBestAction: "flag",
    vocrehabPhishing: true,
  },
  {
    vocrehabId: "vocrehab-inbox-extra-08",
    vocrehabSubject: "Request: quieter workstation setup",
    vocrehabFrom: "New Hire Alex",
    vocrehabBody:
      "Hi, I focus best in a quieter spot. Could I move to the corner desk and use noise-reducing headphones? Please reply in 1-2 sentences starting with the sentence starter below.",
    vocrehabPriority: "normal",
    vocrehabKind: "accommodation-request",
    vocrehabBestAction: "reply-now",
    vocrehabSentenceStarter: "Thank you for letting me know...",
    vocrehabKeywords: ["thank", "corner desk", "headphones"],
  },
] as const;

export function vocrehabValidateInboxExtra(
  vocrehabMessages: readonly VocrehabInboxSprintExtraMessage[] = VOCREHAB_INBOX_SPRINT_EXTRA_MESSAGES,
): VocrehabInboxSprintExtraValidation {
  const vocrehabErrors: string[] = [];
  if (vocrehabMessages.length !== 8) {
    vocrehabErrors.push(`vocrehab-count: expected 8 messages, got ${vocrehabMessages.length}.`);
  }
  const vocrehabCountByKind = (vocrehabKind: VocrehabInboxSprintExtraKind): number =>
    vocrehabMessages.filter((vocrehabMessage) => vocrehabMessage.vocrehabKind === vocrehabKind).length;
  if (vocrehabCountByKind("urgent") !== 2) {
    vocrehabErrors.push("vocrehab-mix: expected 2 urgent messages.");
  }
  if (vocrehabCountByKind("normal") !== 3) {
    vocrehabErrors.push("vocrehab-mix: expected 3 normal messages.");
  }
  if (vocrehabCountByKind("fyi") !== 1) {
    vocrehabErrors.push("vocrehab-mix: expected 1 FYI message.");
  }
  if (vocrehabCountByKind("phishing-ish") !== 1) {
    vocrehabErrors.push("vocrehab-mix: expected 1 phishing-ish message.");
  }
  if (vocrehabCountByKind("accommodation-request") !== 1) {
    vocrehabErrors.push("vocrehab-mix: expected 1 accommodation-request message.");
  }
  for (const vocrehabMessage of vocrehabMessages) {
    if (!VOCREHAB_INBOX_SPRINT_EXTRA_ACTIONS.includes(vocrehabMessage.vocrehabBestAction)) {
      vocrehabErrors.push(`vocrehab-action: ${vocrehabMessage.vocrehabId} has an invalid action.`);
    }
  }
  const vocrehabPhishing = vocrehabMessages.filter(
    (vocrehabMessage) => vocrehabMessage.vocrehabKind === "phishing-ish",
  );
  for (const vocrehabMessage of vocrehabPhishing) {
    if (vocrehabMessage.vocrehabBestAction !== "flag") {
      vocrehabErrors.push(`vocrehab-phishing: ${vocrehabMessage.vocrehabId} should flag.`);
    }
    if (vocrehabMessage.vocrehabPhishing !== true) {
      vocrehabErrors.push(`vocrehab-phishing: ${vocrehabMessage.vocrehabId} must set vocrehabPhishing.`);
    }
  }
  const vocrehabAccommodation = vocrehabMessages.filter(
    (vocrehabMessage) => vocrehabMessage.vocrehabKind === "accommodation-request",
  );
  for (const vocrehabMessage of vocrehabAccommodation) {
    if (!vocrehabMessage.vocrehabSentenceStarter) {
      vocrehabErrors.push(
        `vocrehab-accommodation: ${vocrehabMessage.vocrehabId} needs a sentence starter.`,
      );
    }
  }
  return { vocrehabOk: vocrehabErrors.length === 0, vocrehabErrors };
}

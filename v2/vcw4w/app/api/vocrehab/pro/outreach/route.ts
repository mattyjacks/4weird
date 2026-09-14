import { createClient } from "@/lib/supabase/server";
import { dbFail, fail, ok } from "@/lib/api-respond";

const VOCREHAB_EMPLOYER_MAX = 120;
const VOCREHAB_DETAILS_MAX = 2000;
const VOCREHAB_KINDS = ["tour", "trial", "training"] as const;

type VocrehabOutreachKind = (typeof VOCREHAB_KINDS)[number];

function isKind(value: unknown): value is VocrehabOutreachKind {
  return (
    typeof value === "string" &&
    (VOCREHAB_KINDS as readonly string[]).includes(value)
  );
}

const VOCREHAB_KIND_LABELS: Record<VocrehabOutreachKind, string> = {
  tour: "site tour",
  trial: "trial work experience",
  training: "training partnership",
};

/**
 * POST: copy-only business-outreach draft. The counselor provides the
 * employer name, partnership kind, and two local details; the route
 * returns a draft row (status 'draft') for copy + user-sent only.
 * No auto-send, no contact store, no tracking — there is no send path.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const { employer, kind, details } = (body ?? {}) as {
    employer?: unknown;
    kind?: unknown;
    details?: unknown;
  };

  if (typeof employer !== "string" || employer.trim().length < 1) {
    return fail("employer is required.", 400);
  }
  if (employer.trim().length > VOCREHAB_EMPLOYER_MAX) {
    return fail("employer must be 120 characters or fewer.", 400);
  }
  if (!isKind(kind)) {
    return fail("kind must be tour, trial, or training.", 400);
  }
  if (
    details !== undefined &&
    (typeof details !== "string" || details.length > VOCREHAB_DETAILS_MAX)
  ) {
    return fail("details must be text, 2000 characters or fewer.", 400);
  }
  const cleanEmployer = employer.trim();
  const cleanDetails = typeof details === "string" ? details.trim() : "";
  const kindLabel = VOCREHAB_KIND_LABELS[kind];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return fail("Sign in as a counselor to draft outreach.", 401);
  }

  const subject = `Partnership idea: ${cleanEmployer} x VocRehab`;
  const draftBody = [
    `Subject: ${subject}`,
    "",
    `Hello ${cleanEmployer} team,`,
    "",
    "I am a vocational rehabilitation counselor, and I help job seekers take practiced, supported first steps into work.",
    cleanDetails.length > 0
      ? `What caught my eye locally: ${cleanDetails}.`
      : "I would love to learn what entry paths look like on your team.",
    `I am writing about one idea: a ${kindLabel} with VocRehab support alongside, shaped around your workflow — not around our paperwork.`,
    "",
    "My one ask: a 15-minute call next week to explore fit. If it is not a match, I will thank you and move on.",
    "",
    "Copy, edit, and send this from your own email — VocRehab never sends anything for you.",
    "",
    "Thank you,",
    "[Counselor name]",
  ].join("\n");

  const { data, error } = await supabase
    .from("vocrehab_outreach_drafts")
    .insert({
      counselor_id: user.id,
      employer: cleanEmployer,
      body: draftBody,
      status: "draft",
    })
    .select("id,created_at")
    .single();
  if (error || !data) {
    return dbFail("vocrehab/pro/outreach", error ?? new Error("no id"));
  }

  return ok({
    draft_id: (data as { id: string }).id,
    employer: cleanEmployer,
    kind,
    subject,
    body: draftBody,
    copied: false,
    note: "Copy-only draft. Nothing was sent and no contact was stored.",
  });
}

import { dbFail, fail, ok } from "@/lib/api-respond";
import { resolveVocrehabActor } from "@/lib/vocrehab-actor";

const states = {
  WA: {
    name: "Washington", agency: "Washington DVR",
    sourceMetadata: [{ title: "DVR Customer Services Manual — Case Service Record Documentation", url: "https://www.dshs.wa.gov/sites/default/files/dvr/documents/CustomerServicesManual.pdf", revision: "Revised 2025-08-14", sections: ["Case Service Record Documentation", "Expectation of Timely Documentation"] }],
    fieldSet: "case_record",
    fields: [
      { key: "reporting_period", label: "Reporting period" },
      { key: "current_status", label: "Participant's present status" },
      { key: "case_history", label: "Case history from application through current phase" },
      { key: "participant_contacts", label: "Participant contacts and actions" },
      { key: "reviews_and_results", label: "Required or other reviews and results" },
      { key: "decisions", label: "Decisions made" },
      { key: "decision_rationale", label: "Written rationale for decisions and assistance provided" },
      { key: "next_steps", label: "Next steps and responsible person" },
      { key: "note_date", label: "Date this case note was prepared" },
    ],
  },
  NY: {
    name: "New York", agency: "ACCES-VR",
    sourceMetadata: [{ title: "010.00P Employment Outcome Procedure", url: "https://www.acces.nysed.gov/vr/01000p-employment-outcome-procedure", revision: "Revised 2018-08", sections: ["Documentation requirements for the record of services", "Closures into Competitive Integrated Employment", "Data Folder"] }],
    fieldSet: "employment_closure",
    fields: [
      { key: "job_title", label: "Job title" },
      { key: "employer_name", label: "Employer name" },
      { key: "employer_address", label: "Employer address" },
      { key: "job_duties", label: "Job duties" },
      { key: "employment_start_date", label: "Employment start date" },
      { key: "employment_interruptions", label: "Explanation of interruptions in continuous employment" },
      { key: "weekly_hours", label: "Weekly hours" },
      { key: "salary", label: "Salary" },
      { key: "medical_benefits", label: "Medical benefits" },
      { key: "how_job_obtained", label: "How the individual obtained the job" },
      { key: "participant_role_in_closure", label: "Individual's involvement in the decision to close the case" },
      { key: "closure_verification", label: "How closure information was verified" },
      { key: "verification_source", label: "Source and date used to verify employment and wages" },
    ],
  },
  NH: {
    name: "New Hampshire", agency: "New Hampshire Vocational Rehabilitation",
    sourceMetadata: [{ title: "New Hampshire Administrative Rules, Chapter Ed 1000 — Vocational Rehabilitation Programs", url: "https://gc.nh.gov/rules/state_agencies/ed1000.html", revision: "Adopted 2021-07-13 (Document #13231; verify current rule text)", sections: ["Ed 1003.03 — PII and Other Personal Information and Data Collection", "Ed 1005.03 — Individual's Participation in the Assessment Process", "Ed 1008.09 — IPE Documentation Requirements", "Ed 1015.01 — Closing the Record of Services"] }],
    fieldSet: "participation_and_ipe",
    fields: [
      { key: "reporting_period", label: "Reporting period" },
      { key: "application_and_assessment_status", label: "Application, assessment, and eligibility status" },
      { key: "individual_participation", label: "Individual's active involvement in assessment and decisions" },
      { key: "employment_outcome", label: "Employment outcome selected with the individual" },
      { key: "goal_rationale", label: "Rationale for the goal based on employment factors" },
      { key: "assessment_results", label: "Assessment results and individual's response" },
      { key: "alternatives_considered", label: "Alternatives considered with the individual" },
      { key: "informed_choice", label: "Opportunities provided for informed choice" },
      { key: "services_and_progress", label: "Services provided and progress toward goal" },
      { key: "coordination", label: "Coordination with other relevant plans or programs" },
      { key: "decisions_and_rationale", label: "Counselor decisions, rationale, and case-record documentation" },
      { key: "next_steps", label: "Next steps, agreed timeframes, and responsible person" },
    ],
  },
} as const;

/** Counselor worksheet limited to the selected parent-owned child account. */
export async function GET(req: Request) {
  const state = new URL(req.url).searchParams.get("state")?.toUpperCase() as keyof typeof states | undefined;
  const enrollmentId = new URL(req.url).searchParams.get("enrollment_id");
  if (!state || !(state in states)) return fail("Choose state=WA, NY, or NH.", 400);
  if (!enrollmentId) return fail("Select a VocRehab client enrollment.", 400);
  const actor = await resolveVocrehabActor(req);
  if (!actor || actor.kind !== "provider") return fail("Sign in with the adult parent/provider account.", 401);
  const { data: enrollment, error: enrollmentError } = await actor.db.from("vocrehab_provider_clients").select("id,kid_id,client_label").eq("id", enrollmentId).eq("counselor_id", actor.userId).eq("parent_id", actor.userId).is("revoked_at", null).maybeSingle();
  if (enrollmentError) return dbFail("vocrehab/reports", enrollmentError);
  if (!enrollment) return fail("Client enrollment not found or revoked.", 404);
  const [{ data: sessions, error: sessionError }, { data: saved, error: savedError }, { data: kid, error: kidError }] = await Promise.all([
    actor.db.from("vocrehab_game_sessions").select("game_id,started_at,ended_at,summary").eq("user_id", actor.userId).eq("kid_id", enrollment.kid_id).order("started_at", { ascending: false }).limit(200),
    actor.db.from("vocrehab_saved_game_states").select("game_id,title,updated_at,state").eq("user_id", actor.userId).eq("kid_id", enrollment.kid_id).order("updated_at", { ascending: false }).limit(100),
    actor.db.from("kid_accounts").select("username,discriminator,age_band").eq("id", enrollment.kid_id).eq("parent_id", actor.userId).maybeSingle(),
  ]);
  const error = sessionError ?? savedError ?? kidError;
  if (error) return dbFail("vocrehab/reports", error);
  return ok({ report: {
    document_type: "VocRehab counselor worksheet — draft, verify before agency use",
    state, jurisdiction: states[state], prepared_at: new Date().toISOString(),
    client: { label: enrollment.client_label || "", age_band: kid?.age_band ?? "", handle: kid ? `${kid.username}#${kid.discriminator}` : "" },
    notice: "This is a draft counselor worksheet, not an official state form, eligibility finding, service authorization, or compliance guarantee. Fields are mapped to the cited guidance and do not establish that an agency requirement is satisfied. Confirm current rules, case facts, consent, and agency system requirements before use. Game activity is supplemental and must not be treated as a clinical or eligibility assessment.",
    field_set: states[state].fieldSet,
    practitioner_fields: Object.fromEntries(states[state].fields.map((field) => [field.key, ""])),
    field_definitions: states[state].fields,
    activity: { game_sessions: sessions ?? [], saved_game_states: saved ?? [] },
  } });
}

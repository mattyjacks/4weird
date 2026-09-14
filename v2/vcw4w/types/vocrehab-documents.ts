/**
 * VocRehab document types — user-saved interview + decision artifacts.
 *
 * Pure interfaces only, zero runtime code, zero imports (standalone per the
 * module contract: types never import from sibling vocrehab libs).
 * Every interface is prefixed with `Vocrehab`.
 * Kind literals mirror the `vocrehab_documents.kind` check constraint
 * in `supabase/migrations/20261208000000_vocrehab_module_v1.sql`.
 */

export type VocrehabDocumentKind =
  | "prep"
  | "pivot"
  | "script"
  | "resume"
  | "decision-onepager";

/** One row of `vocrehab_documents` (owner reads/writes own rows only). */
export interface VocrehabDocument {
  id: string;
  kind: VocrehabDocumentKind;
  title: string;
  body: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** POST body for `/api/vocrehab/documents` (explicit save only). */
export interface VocrehabDocumentSaveInput {
  kind: VocrehabDocumentKind;
  title: string;
  body: Record<string, unknown>;
}

/** One tailored interview question with an optional rehearsal seed. */
export interface VocrehabPrepQuestion {
  vocrehabQuestion: string;
  vocrehabHint: string;
  vocrehabRehearseSeed: string;
}

/** Body shape for `kind='prep'` — interview prep generator output. */
export interface VocrehabPrepSet {
  vocrehabGoal: string;
  vocrehabQuestions: VocrehabPrepQuestion[];
  vocrehabFollowUps: string[];
}

/** Body shape for `kind='pivot'` — background pivot builder output. */
export interface VocrehabPivotDraft {
  vocrehabNeutralLine: string;
  vocrehabWhatChanged: string;
  vocrehabWhatIsTrueNow: string;
  vocrehabSpokenDraft: string;
}

/** Body shape for `kind='script'` — disclosure + accommodation script. */
export interface VocrehabDisclosureScript {
  vocrehabTiming: string;
  vocrehabDisclosureLines: string[];
  vocrehabAccommodationAsk: string;
  vocrehabBenefitLine: string;
  vocrehabNoDisclosureFallback: string;
}

/** Structured resume section (experience includes volunteer, caregiving, gigs). */
export interface VocrehabResumeSection {
  vocrehabHeading: string;
  vocrehabLines: string[];
}

/** Body shape for `kind='resume'` — resume builder output. */
export interface VocrehabResume {
  vocrehabName: string;
  vocrehabContact: string;
  vocrehabGoalLine: string;
  vocrehabStrengths: string[];
  vocrehabSections: VocrehabResumeSection[];
  vocrehabAccommodationsOptIn: string[];
}

/** Body shape for `kind='decision-onepager'` — combined course decision page. */
export interface VocrehabDecisionOnePager {
  vocrehabGoal: string;
  vocrehabStrengths: string[];
  vocrehabSupports: string[];
  vocrehabDisclosureChoice: string;
  vocrehabMoneySketch: string;
  vocrehabNextSteps: [string, string, string];
}

/** GET response for `/api/vocrehab/documents?kind=` (own rows, newest first). */
export interface VocrehabDocumentList {
  vocrehabDocuments: VocrehabDocument[];
}

/**
 * VocRehab course types — pure interfaces only, zero runtime code.
 * Every interface is prefixed with `Vocrehab` per the module contract.
 */

export interface VocrehabCourseTryIt {
  vocrehabLabel: string;
  vocrehabHref: string;
}

export type VocrehabCourseKind =
  | "lesson"
  | "game"
  | "roleplay"
  | "slider"
  | "adventure";

export interface VocrehabCourseModule {
  vocrehabSlug: string;
  vocrehabChapter: number;
  vocrehabChapterTitle: string;
  vocrehabTitle: string;
  vocrehabExplainer: string;
  vocrehabTryIt: VocrehabCourseTryIt;
  vocrehabReflect: [string, string];
  vocrehabXp: number;
  vocrehabBadge: string;
  vocrehabKind: VocrehabCourseKind;
}

export interface VocrehabCourseProgress {
  vocrehabDone: string[];
  vocrehabXp: number;
  vocrehabUpdatedAt: string;
}

export interface VocrehabA11yPrefs {
  vocrehabTextSize: 100 | 112 | 125;
  vocrehabContrast: "standard" | "high";
  vocrehabVoice: boolean;
  vocrehabMotion: "full" | "reduced";
  vocrehabHints: boolean;
}

export interface VocrehabBadge {
  vocrehabId: string;
  vocrehabLabel: string;
}

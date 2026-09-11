// Central accessibility settings: storage, types, color-vision definitions.
//
// One localStorage key ("4weird-a11y") holds every setting so the site
// chrome, the play shell, and the in-iframe runtime bridge all read the
// same object. The bridge cannot read localStorage across origins, so
// GameRuntimeFrame forwards these settings over postMessage instead.

export const A11Y_STORAGE_KEY = "4weird-a11y";
export const A11Y_EVENT = "fourweird-a11y";

export type ColorblindMode =
  | "none"
  | "protanopia"
  | "protanomaly"
  | "deuteranopia"
  | "deuteranomaly"
  | "tritanopia"
  | "tritanomaly"
  | "achromatopsia";

export type WebcamPosition =
  | "front"
  | "phone"
  | "left"
  | "right"
  | "above"
  | "below";

export const WEBCAM_POSITIONS: Array<{ id: WebcamPosition; label: string; hint: string }> = [
  { id: "front", label: "Front (desktop)", hint: "Webcam centered above your screen" },
  { id: "phone", label: "Phone front", hint: "Held below eye line — pitch compensated" },
  { id: "left", label: "Left side", hint: "Webcam sits left of where you look" },
  { id: "right", label: "Right side", hint: "Webcam sits right of where you look" },
  { id: "above", label: "High above", hint: "Camera looks down at you" },
  { id: "below", label: "Low below", hint: "Camera looks up at you" },
];

export function isWebcamPosition(value: unknown): value is WebcamPosition {
  return WEBCAM_POSITIONS.some((p) => p.id === value);
}

export type A11ySettings = {
  motion: boolean;
  contrast: boolean;
  large: boolean;
  /** Dyslexia-friendly reading mode (font stack + spacing). */
  dyslexia: boolean;
  /** Extra letter/word/line spacing on top of the dyslexia font. */
  spacing: boolean;
  colorblind: ColorblindMode;
  /** Enlarge interactive targets + strengthen focus rings. */
  largeTargets: boolean;
  /** Dwell-to-click for eye trackers / head pointers (也很适合 switch). */
  dwell: boolean;
  /** Dwell time before a focused/hovered control activates, ms. */
  dwellMs: number;
  /** Nose-direction head pointer (drives an on-screen cursor). */
  headPointer: boolean;
  /** Where the webcam sits relative to where you look. */
  webcam: WebcamPosition;
  /** Head-pointer gain (cursor speed multiplier). */
  headGain: number;
  /** Head-pointer smoothing 0..0.95 (higher = steadier, laggier). */
  headSmooth: number;
  /** Single-switch auto-scan through controls. */
  switchScan: boolean;
  /** Scan step interval, ms. */
  scanMs: number;
  /** Game key sent by smile (default Space). */
  smileKey: string;
};

export const DEFAULT_A11Y: A11ySettings = {
  motion: false,
  contrast: false,
  large: false,
  dyslexia: false,
  spacing: false,
  colorblind: "none",
  largeTargets: false,
  dwell: false,
  dwellMs: 1200,
  headPointer: false,
  webcam: "front",
  headGain: 1.6,
  headSmooth: 0.75,
  switchScan: false,
  scanMs: 1400,
  smileKey: " ",
};

export const COLORBLIND_MODES: Array<{
  id: ColorblindMode;
  label: string;
  hint: string;
}> = [
  { id: "none", label: "No filter", hint: "Default colors" },
  { id: "protanopia", label: "Protanopia", hint: "No red cones" },
  { id: "protanomaly", label: "Protanomaly", hint: "Weak red cones" },
  { id: "deuteranopia", label: "Deuteranopia", hint: "No green cones" },
  { id: "deuteranomaly", label: "Deuteranomaly", hint: "Weak green cones" },
  { id: "tritanopia", label: "Tritanopia", hint: "No blue cones" },
  { id: "tritanomaly", label: "Tritanomaly", hint: "Weak blue cones" },
  { id: "achromatopsia", label: "Grayscale", hint: "No color vision" },
];

export function isColorblindMode(value: unknown): value is ColorblindMode {
  return COLORBLIND_MODES.some((m) => m.id === value);
}

/** Read settings without throwing (private mode / corrupt JSON safe). */
export function loadA11y(): A11ySettings {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return { ...DEFAULT_A11Y };
  try {
    const raw = localStorage.getItem(A11Y_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_A11Y };
    const parsed = JSON.parse(raw) as Partial<A11ySettings>;
    const dwellMs = Math.min(5000, Math.max(400, Math.floor(Number(parsed.dwellMs ?? DEFAULT_A11Y.dwellMs) || DEFAULT_A11Y.dwellMs)));
    const headGain = Math.min(5, Math.max(0.4, Number(parsed.headGain ?? DEFAULT_A11Y.headGain) || DEFAULT_A11Y.headGain));
    const headSmooth = Math.min(0.95, Math.max(0, Number(parsed.headSmooth ?? DEFAULT_A11Y.headSmooth)));
    const scanMs = Math.min(6000, Math.max(600, Math.floor(Number(parsed.scanMs ?? DEFAULT_A11Y.scanMs) || DEFAULT_A11Y.scanMs)));
    const smileKey = typeof parsed.smileKey === "string" && parsed.smileKey.length === 1 ? parsed.smileKey : DEFAULT_A11Y.smileKey;
    return {
      motion: !!parsed.motion,
      contrast: !!parsed.contrast,
      large: !!parsed.large,
      dyslexia: !!parsed.dyslexia,
      spacing: !!parsed.spacing,
      colorblind: isColorblindMode(parsed.colorblind) ? parsed.colorblind : "none",
      largeTargets: !!parsed.largeTargets,
      dwell: !!parsed.dwell,
      dwellMs,
      headPointer: !!parsed.headPointer,
      webcam: isWebcamPosition(parsed.webcam) ? parsed.webcam : "front",
      headGain,
      headSmooth: Number.isFinite(headSmooth) ? headSmooth : DEFAULT_A11Y.headSmooth,
      switchScan: !!parsed.switchScan,
      scanMs,
      smileKey,
    };
  } catch {
    try {
      localStorage.removeItem(A11Y_STORAGE_KEY);
    } catch {
      /* storage locked; ignore */
    }
    return { ...DEFAULT_A11Y };
  }
}

/** Persist + apply to <html> + notify every listener (shell + iframe bridge). */
export function saveA11y(next: A11ySettings): void {
  try {
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode; classes still apply for this load */
  }
  applyA11y(next);
  try {
    window.dispatchEvent(new CustomEvent<A11ySettings>(A11Y_EVENT, { detail: { ...next } }));
  } catch {
    /* event constructor unavailable; ignore */
  }
}

/** Toggle document classes. Safe to call repeatedly / server-side (no-op). */
export function applyA11y(settings: A11ySettings): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("a11y-reduced-motion", settings.motion);
  root.classList.toggle("a11y-high-contrast", settings.contrast);
  root.classList.toggle("a11y-large-text", settings.large);
  root.classList.toggle("a11y-dyslexia", settings.dyslexia);
  root.classList.toggle("a11y-spacing", settings.spacing);
  root.classList.toggle("a11y-large-targets", settings.largeTargets);
  root.classList.toggle("a11y-dwell", settings.dwell);
  root.classList.toggle("a11y-head-pointer", settings.headPointer);
  root.classList.toggle("a11y-switch-scan", settings.switchScan);
  for (const mode of COLORBLIND_MODES) {
    if (mode.id !== "none") root.classList.toggle(`a11y-cb-${mode.id}`, settings.colorblind === mode.id);
  }
  root.dataset.a11yColorblind = settings.colorblind;
}

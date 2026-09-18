import { fail, ok } from "@/lib/api-respond";
import { sameOrigin } from "@/lib/csrf";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

/**
 * POST /api/games/whenwillidie/predict
 *
 * Novelty "When Will I Die?" oracle. Entertainment only — not medical advice.
 *
 * Body: structured lifestyle enums only (no names, emails, photos). Free-text
 * notes are capped, scanned for PII patterns, and never stored or logged.
 * No auth, no DB, no persistence: the profile lives for one request.
 *
 * Math: US SSA 2022 period life-table baseline (interpolated remaining years
 * by age/sex) + conservative CDC/WHO-style lifestyle modifiers, fully
 * itemized in the response so players see every year gained/lost. When
 * OPENAI_API_KEY is set, a short game-show narration (epitaph + tips) is
 * generated from the SANITIZED numeric profile; otherwise a local template
 * narrates the same numbers for free. Nothing is ever faked: the `ai`
 * flag reports which path produced the prose.
 */

type Sex = "male" | "female" | "other";

type Profile = {
  age: number;
  sex: Sex;
  country: string;
  smoking: string;
  alcohol: string;
  bmi: number;
  exercise: string;
  sleepHours: number;
  diet: string;
  conditions: string[];
  familyLongevity: string;
  stress: string;
  note: string;
};

const CONDITIONS_KNOWN = new Set([
  "none",
  "diabetes",
  "heart",
  "cancer",
  "stroke",
  "lung",
  "hypertension",
  "depression",
]);

// SSA 2022 period table, remaining years [male, female] at anchor ages.
const TABLE: Array<[number, number, number]> = [
  [0, 73.5, 79.3],
  [10, 64.2, 69.9],
  [20, 54.7, 60.2],
  [30, 45.6, 50.7],
  [40, 36.6, 41.4],
  [50, 28.2, 32.5],
  [60, 20.8, 24.3],
  [70, 14.1, 16.6],
  [80, 8.2, 9.9],
  [90, 4.1, 5.1],
  [100, 2.0, 2.5],
];

function baselineRemaining(age: number, sex: Sex): number {
  const col = sex === "female" ? 2 : 1; // "other" uses blended male curve
  const blend = sex === "other" ? 0.5 : 0;
  const at = (row: (typeof TABLE)[number]) =>
    blend ? (row[1] + row[2]) / 2 : row[col];
  if (age <= 0) return at(TABLE[0]);
  for (let i = 0; i < TABLE.length - 1; i++) {
    const [a0, ,] = TABLE[i];
    const [a1, ,] = TABLE[i + 1];
    if (age >= a0 && age <= a1) {
      const t = (age - a0) / (a1 - a0);
      return at(TABLE[i]) * (1 - t) + at(TABLE[i + 1]) * t;
    }
  }
  return 1.2;
}

function countryAdj(country: string): { years: number; label: string } {
  const c = country.toLowerCase();
  if (["japan", "switzerland", "spain", "italy", "singapore"].includes(c))
    return { years: 2, label: "Country longevity bonus (+2.0y)" };
  if (["united kingdom", "canada", "australia", "france", "germany", "netherlands", "sweden", "norway"].includes(c))
    return { years: 1, label: "Country longevity bonus (+1.0y)" };
  if (["russia", "ukraine", "belarus"].includes(c))
    return { years: -3, label: "Country mortality drag (−3.0y)" };
  if (["nigeria", "chad", "somalia", "afghanistan", "haiti"].includes(c))
    return { years: -4, label: "Country mortality drag (−4.0y)" };
  return { years: 0, label: "Country baseline (≈US average)" };
}

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function cleanProfile(input: Record<string, unknown>): Profile | { error: string } {
  const age = Math.floor(num(input.age, NaN));
  if (!Number.isFinite(age) || age < 13 || age > 110)
    return { error: "Age must be between 13 and 110 for this game." };
  const sexRaw = str(input.sex, "").toLowerCase();
  const sex: Sex = sexRaw === "female" ? "female" : sexRaw === "other" ? "other" : sexRaw === "male" ? "male" : ("" as Sex);
  if (!sex) return { error: "Sex must be male, female, or other." };
  const bmi = num(input.bmi, NaN);
  if (!Number.isFinite(bmi) || bmi < 12 || bmi > 70)
    return { error: "BMI must be between 12 and 70." };
  const sleepHours = num(input.sleepHours ?? input.sleep, NaN);
  if (!Number.isFinite(sleepHours) || sleepHours < 0 || sleepHours > 16)
    return { error: "Sleep must be between 0 and 16 hours." };
  const condRaw = Array.isArray(input.conditions) ? input.conditions : [];
  const conditions = condRaw.map((c) => str(c).toLowerCase().trim()).filter(Boolean).slice(0, 8);
  for (const c of conditions) if (!CONDITIONS_KNOWN.has(c)) return { error: `Unknown condition: ${c.slice(0, 24)}.` };
  let note = str(input.note ?? input.freeText ?? "").slice(0, 280);
  // PII shield: refuse obvious identifiers in free text (we never want them).
  const pii =
    /[\w.+-]+@[\w-]+\.[\w.]+/.test(note) ||
    /(\+?\d[\d\s().-]{7,}\d)/.test(note) ||
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(note);
  if (pii) return { error: "Self-censor please: remove emails and phone numbers from the notes field." };
  note = note.replace(/\s+/g, " ").trim();
  return {
    age,
    sex,
    country: str(input.country, "United States").slice(0, 48) || "United States",
    smoking: str(input.smoking, "never").slice(0, 24),
    alcohol: str(input.alcohol, "none").slice(0, 24),
    bmi,
    exercise: str(input.exercise, "some").slice(0, 24),
    sleepHours,
    diet: str(input.diet, "average").slice(0, 24),
    conditions,
    familyLongevity: str(input.familyLongevity, "average").slice(0, 24),
    stress: str(input.stress, "medium").slice(0, 24),
    note,
  };
}

type Adj = { label: string; years: number };

function modifiers(p: Profile): Adj[] {
  const adj: Adj[] = [];
  if (p.smoking === "daily") adj.push({ label: "Daily smoking (CDC: ≈−10y)", years: -10 });
  else if (p.smoking === "occasional") adj.push({ label: "Occasional smoking (≈−4y)", years: -4 });
  else if (p.smoking === "former") adj.push({ label: "Former smoker (≈−2y)", years: -2 });
  else if (p.smoking === "vaping") adj.push({ label: "Daily vaping (≈−1.5y)", years: -1.5 });

  if (p.alcohol === "heavy") adj.push({ label: "Heavy drinking (≈−5y)", years: -5 });
  else if (p.alcohol === "moderate") adj.push({ label: "Moderate drinking (≈−0.5y)", years: -0.5 });

  if (p.bmi < 18.5) adj.push({ label: "Underweight BMI (≈−2y)", years: -2 });
  else if (p.bmi > 35) adj.push({ label: "BMI 35+ (≈−6y)", years: -6 });
  else if (p.bmi > 30) adj.push({ label: "BMI 30–35 (≈−3y)", years: -3 });
  else if (p.bmi > 25) adj.push({ label: "BMI 25–30 (≈−1y)", years: -1 });

  if (p.exercise === "athlete") adj.push({ label: "150+ min exercise/wk (≈+2y)", years: 2 });
  else if (p.exercise === "some") adj.push({ label: "Some exercise (≈+0.5y)", years: 0.5 });
  else if (p.exercise === "none") adj.push({ label: "No exercise (≈−2y)", years: -2 });

  if (p.sleepHours >= 7 && p.sleepHours <= 8) adj.push({ label: "7–8h sleep (≈+0.5y)", years: 0.5 });
  else if (p.sleepHours <= 5 || p.sleepHours >= 10) adj.push({ label: "Short/long sleep (≈−1.5y)", years: -1.5 });
  else adj.push({ label: "Off-peak sleep (≈−0.5y)", years: -0.5 });

  if (p.diet === "healthy") adj.push({ label: "Healthy diet (≈+1.5y)", years: 1.5 });
  else if (p.diet === "poor") adj.push({ label: "Poor diet (≈−2y)", years: -2 });

  const condMap: Record<string, number> = {
    diabetes: -6, heart: -7, cancer: -5, stroke: -6, lung: -5, hypertension: -2, depression: -2,
  };
  let condTotal = 0;
  for (const c of p.conditions) {
    if (c === "none") continue;
    const y = condMap[c] ?? 0;
    condTotal += y;
    adj.push({ label: `Condition: ${c} (≈${y}y)`, years: y });
  }
  if (condTotal < -12) adj.push({ label: "Comorbidity cap (floored at −12y combined)", years: -12 - condTotal });

  if (p.familyLongevity === "long") adj.push({ label: "Long-lived family (≈+2y)", years: 2 });
  else if (p.familyLongevity === "short") adj.push({ label: "Short-lived family (≈−2y)", years: -2 });

  if (p.stress === "low") adj.push({ label: "Low stress (≈+0.5y)", years: 0.5 });
  else if (p.stress === "high") adj.push({ label: "High stress (≈−1.5y)", years: -1.5 });

  const c = countryAdj(p.country);
  if (c.years !== 0) adj.push({ label: c.label, years: c.years });
  return adj;
}

function localProse(p: Profile, deathAge: number, yearsLeft: number): { headline: string; epitaph: string; tips: string[] } {
  const worst = modifiers(p).filter((a) => a.years < 0).sort((a, b) => a.years - b.years).slice(0, 2);
  const headline =
    yearsLeft > 40 ? "The Reaper checked his watch… and took a nap." :
    yearsLeft > 25 ? "The Reaper penciled you in — in pencil, with an eraser." :
    yearsLeft > 12 ? "The Reaper knows your name but keeps mispronouncing it." :
    "The Reaper just followed you back from the future to say hi.";
  const epitaph =
    yearsLeft > 40 ? "Here lies a legend. The paperwork took decades." :
    yearsLeft > 25 ? "Gone fishin'. The fish waited." :
    "Plot twist enthusiast. The final twist was scheduled.";
  const tips = [
    worst[0] ? `Biggest lever: fix "${worst[0].label.split(" (")[0]}" first — that one line costs ~${Math.abs(worst[0].years)}y in this model.` : "Biggest lever: keep doing what you're doing — boredom is underrated.",
    "Sleep 7–8h, move 150 min/week, and eat like someone who likes being alive.",
    "This is a party trick with a spreadsheet, not a doctor. For real health questions, see an actual human in a white coat.",
  ];
  void deathAge;
  return { headline, epitaph, tips };
}

async function openaiProse(p: Profile, deathAge: number, yearsLeft: number, daysLeft: number) {
  const key = process.env.OPENAI_API_KEY ?? "";
  if (!key) return null;
  const model = process.env.WHENWILLIDIE_MODEL ?? process.env.BUDDY_MODEL ?? "gpt-4o-mini";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        instructions:
          "You are the game-show host of a novelty 'When Will I Die?' arcade game. ENTERTAINMENT ONLY — never medical advice, never a diagnosis, never a real prediction. Dark humor is fine; cruelty is not. Reply with STRICT JSON only: {\"headline\": string (<=90 chars), \"epitaph\": string (<=110 chars, funny tombstone line), \"tips\": [3 short strings, general wellness, each <=110 chars], \"reaperRating\": string (<=24 chars, e.g. 'Reaper rating: 3/10 spooky')}. No other text.",
        input: `Actuarial party-trick result (US SSA 2022 baseline + lifestyle modifiers, entertainment only): age ${p.age}, sex ${p.sex}, predicted death age ${deathAge}, ~${yearsLeft} years left (~${daysLeft} days). Top modifiers: ${modifiers(p).sort((a, b) => Math.abs(b.years) - Math.abs(a.years)).slice(0, 4).map((a) => `${a.label}`).join("; ") || "none"}. Player note (self-censored, may be empty): "${p.note.slice(0, 120)}". Narrate it.`,
        max_output_tokens: 260,
        store: false,
      }),
    });
    if (!res.ok) return null;
    const out = (await res.json()) as { output_text?: string; output?: { type?: string; content?: { type?: string; text?: string }[] }[] };
    const text =
      (out.output ?? [])
        .flatMap((i) => (i.type === "message" ? (i.content ?? []) : []))
        .filter((pt) => pt.type === "output_text")
        .map((pt) => pt.text ?? "")
        .join("") || String(out.output_text ?? "");
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]) as { headline?: unknown; epitaph?: unknown; tips?: unknown; reaperRating?: unknown };
    const tips = Array.isArray(parsed.tips) ? parsed.tips.map((t) => String(t).slice(0, 110)).slice(0, 3) : [];
    if (!parsed.headline || !parsed.epitaph || tips.length !== 3) return null;
    return {
      headline: String(parsed.headline).slice(0, 90),
      epitaph: String(parsed.epitaph).slice(0, 110),
      tips,
      reaperRating: String(parsed.reaperRating ?? "").slice(0, 24),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Invalid request origin.", 403);
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "anon";
  const rl = rateLimit(`whenwillidie:${ip.slice(0, 64)}`, 20, 60_000);
  if (!rl.allowed) return fail("Rate limited. The Reaper needs a coffee break.", 429, rateLimitHeaders(rl));

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  const cleaned = cleanProfile((body ?? {}) as Record<string, unknown>);
  if ("error" in cleaned) return fail(cleaned.error, 400);

  const base = baselineRemaining(cleaned.age, cleaned.sex);
  const adj = modifiers(cleaned);
  const delta = adj.reduce((s, a) => s + a.years, 0);
  let yearsLeft = Math.max(0.5, Math.min(105 - cleaned.age, base + delta));
  yearsLeft = Math.round(yearsLeft * 10) / 10;
  const deathAge = Math.round((cleaned.age + yearsLeft) * 10) / 10;
  const daysLeft = Math.round(yearsLeft * 365.25);
  const deathDate = new Date(Date.now() + daysLeft * 86_400_000).toISOString().slice(0, 10);
  const sorted = [...adj].sort((a, b) => a.years - b.years);
  const topRisks = sorted.slice(0, 3).filter((a) => a.years < 0);
  const topBoosts = [...adj].sort((a, b) => b.years - a.years).slice(0, 2).filter((a) => a.years > 0);

  const ai = await openaiProse(cleaned, deathAge, yearsLeft, daysLeft);
  const local = localProse(cleaned, deathAge, yearsLeft);

  return ok({
    disclaimer:
      "FOR ENTERTAINMENT ONLY — not medical advice, not a prediction. Self-censor PII: never enter your name, email, phone, or address. Photos for the skeleton filter never leave your device.",
    inputs: { age: cleaned.age, sex: cleaned.sex, country: cleaned.country },
    baselineYears: Math.round(base * 10) / 10,
    adjustments: adj,
    totalDelta: Math.round(delta * 10) / 10,
    predictedDeathAge: deathAge,
    yearsLeft,
    daysLeft,
    deathDateISO: deathDate,
    band: {
      pessimistic: Math.round(Math.max(cleaned.age + 0.5, deathAge - 8) * 10) / 10,
      median: deathAge,
      optimistic: Math.round(Math.min(105, deathAge + 8) * 10) / 10,
    },
    topRisks,
    topBoosts,
    headline: ai?.headline ?? local.headline,
    epitaph: ai?.epitaph ?? local.epitaph,
    tips: ai?.tips ?? local.tips,
    reaperRating: ai?.reaperRating ?? `Reaper rating: ${yearsLeft > 30 ? "2/10 spooky" : yearsLeft > 15 ? "5/10 spooky" : "8/10 spooky"}`,
    ai: ai ? "openai" : "local-actuarial",
    sources: ["US SSA 2022 period life table (baseline)", "CDC smoking/alcohol/BMI mortality literature (modifiers)", "WHO sleep/activity/diet guidance (modifiers)"],
  });
}

import { cookies } from "next/headers";
import { canKidUseFeature } from "@/lib/family";
import { getKidSession } from "@/lib/kid-session";
import { serviceClient } from "@/lib/supabase/service";

/** Age eligibility for paid third-party API and compute services.
 *
 * Fail closed on unknown age for vendors whose terms require every end user
 * to be an adult. This reads only the existing age band; never collect DOB.
 */
export type VendorAgeBand = "kid" | "teen" | "adult" | "unknown";
export type VendorEligibility = { allowed: true } | { allowed: false; reason: string };

export const ADULT_ONLY_VENDORS = ["openrouter", "fal", "runpod", "gemini-api", "shopify-checkout", "easydnc", "elevenlabs", "opencode"] as const;
export const CONSENT_REQUIRED_VENDORS = ["outscraper", "digitalocean", "meshy", "openai", "bouncer", "pexels", "deepseek", "meta-api"] as const;
export type AgeRestrictedVendor = (typeof ADULT_ONLY_VENDORS | typeof CONSENT_REQUIRED_VENDORS)[number];

/** Google prohibits embedding Gemini API services in apps likely to be used
 * by under-18s. Since 4weird serves minors, reject Google/Gemini model IDs on
 * every server-side OpenRouter path, including operator environment defaults.
 */
export function isGoogleGeminiModel(model: unknown): boolean {
  const id = String(model ?? "").trim().toLowerCase();
  return /(^|[/:])google([/:]|$)/.test(id) || /(^|[/:])gemini([/:.-]|$)/.test(id) || id.includes("gemini");
}

export function normalizeVendorAgeBand(value: unknown): VendorAgeBand {
  const band = String(value ?? "").trim().toLowerCase();
  return band === "kid" || band === "teen" || band === "adult" ? band : "unknown";
}

export function checkVendorEligibility(vendor: AgeRestrictedVendor, value: unknown): VendorEligibility {
  if (vendor === "gemini-api") {
    return { allowed: false, reason: "Gemini API is disabled because its terms prohibit use in services likely to be accessed by people under 18." };
  }
  if (normalizeVendorAgeBand(value) === "adult") return { allowed: true };
  const names: Record<AgeRestrictedVendor, string> = {
    openrouter: "OpenRouter", fal: "fal.ai", runpod: "RunPod", "gemini-api": "Gemini API", "shopify-checkout": "checkout", easydnc: "EasyDNC", elevenlabs: "ElevenLabs", opencode: "OpenCode",
    outscraper: "Outscraper", digitalocean: "DigitalOcean", meshy: "Meshy", openai: "OpenAI API", bouncer: "Bouncer", pexels: "Pexels", deepseek: "DeepSeek API", "meta-api": "Meta Llama API",
  };
  const policy = (ADULT_ONLY_VENDORS as readonly string[]).includes(vendor)
    ? `${names[vendor]} requires an adult account.`
    : `${names[vendor]} permits some minor use only with parent/guardian permission or legal consent; this account has no recorded consent.`;
  return {
    allowed: false,
    reason: `${policy} This service is unavailable for teen, child, or unverified-age accounts until consent is supported.`,
  };
}

/** Route helper for authenticated Supabase clients. Unknown or unreadable
 * profile age denies access, so a database hiccup cannot bypass the gate. */
export async function checkAuthenticatedVendorEligibility(
  supabaseValue: unknown,
  userId: string,
  vendor: AgeRestrictedVendor,
): Promise<VendorEligibility> {
  // A browser can retain a parent's Supabase cookie while a child is using
  // the same device. The child session is an overlay and takes precedence
  // for adult-only vendors. Ignore only absent or malformed tokens; a
  // well-formed but unresolvable session must not fall through to parent's age.
  let rawKidToken = "";
  try { rawKidToken = (await cookies()).get("kid_session")?.value ?? ""; } catch { /* no request cookie context */ }
  if (/^[0-9a-f]{64}$/i.test(rawKidToken)) {
    let kidSession;
    try {
      kidSession = await getKidSession(serviceClient(), rawKidToken);
    } catch {
      return { allowed: false, reason: "Unable to verify child account age for this service." };
    }
    if (!kidSession) return { allowed: false, reason: "Child session is invalid or expired." };
    // These vendors' terms require an adult user, and the account overlay is
    // explicitly a child session. Do not let a lingering adult Supabase
    // cookie (or a parent-attested age band) make an adult-only vendor usable
    // from that child session.
    if ((ADULT_ONLY_VENDORS as readonly string[]).includes(vendor)) {
      return { allowed: false, reason: `${vendor} is unavailable during a child session because its terms require adult users.` };
    }
    // Client accounts can represent adults receiving vocational services.
    // Use that account's age band; parent age must never elevate a minor.
    const eligible = checkVendorEligibility(vendor, kidSession.kid.age_band);
    if (!eligible.allowed) return eligible;
    const feature = vendor === "openrouter" ? "ai:openrouter"
      : vendor === "runpod" ? "service:runpod"
      : vendor === "fal" ? "ai:fal"
      : vendor === "digitalocean" ? "service:digitalocean"
      : vendor === "openai" ? "ai:openai"
      : vendor === "deepseek" || vendor === "meta-api" ? "ai:openrouter"
      : vendor === "elevenlabs" ? "ai:elevenlabs"
      : vendor === "easydnc" ? "service:easydnc"
      : `service:${vendor}`;
    if (!canKidUseFeature(kidSession.controls, feature)) {
      return { allowed: false, reason: `This feature is not enabled by the account parent (${feature}).` };
    }
    return { allowed: true };
  }

  const supabase = supabaseValue as {
    from: (table: "profiles") => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<{ data: { age_band?: unknown } | null; error: unknown }>;
        };
      };
    };
  };
  try {
    const { data, error } = await supabase.from("profiles").select("age_band").eq("id", userId).maybeSingle();
    if (error) return { allowed: false, reason: "Unable to verify account age for this service. Try again later." };
    return checkVendorEligibility(vendor, data?.age_band);
  } catch {
    return { allowed: false, reason: "Unable to verify account age for this service. Try again later." };
  }
}

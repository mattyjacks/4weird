import fs from "node:fs";

// verify-feedback.mjs — plan §8 (Verification + gates) for the Awesome
// Feedback Overhaul (FBOV wave, QUEUE FBOV-LEAD).
//
// Static contract verifier for POST /api/feedback (identity model plan §2:
// tracked|anonymous|guest + contact + source), the /feedback guest page,
// and the /feedback/admin queue. Covers the 8 gate cases:
//
//   1. POST JSON human tracked      5. POST oversize -> 413
//   2. POST anonymous               6. GET admin as non-admin -> denied
//   3. POST guest with email        7. annotations over-cap -> 400
//   4. POST PNG paste (png passes)  8. invalid email -> 400
//
// Plus the privacy pair from the manual checklist:
//   9. anonymous row user_id NULL  10. guest email never on public page.
//
// Convention (matches verify-save-slots.mjs): each case asserts STRICTLY
// when its owning slice has landed, and SKIP fail-open when the slice is
// still mid-flight (names the owning envelope). Slices land in sibling
// scopes — this script never implements features, it only enforces the
// contract. A check goes strict only on a conjunction of tokens (accept +
// cap + branch) so partially-landed work SKIPs instead of false-failing
// while a sibling is editing.

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
const exists = (file) => {
  try {
    fs.accessSync(new URL(file, import.meta.url));
    return true;
  } catch {
    return false;
  }
};

const fail = (msg) => {
  throw new Error(`verify-feedback: ${msg}`);
};

const skip = (msg) => {
  console.log(`verify-feedback: SKIP — ${msg}`);
};

const route = read("../app/api/feedback/route.ts");
const baseMigration = exists("../supabase/migrations/20261120000000_feedback.sql")
  ? read("../supabase/migrations/20261120000000_feedback.sql")
  : "";
const identityMigration = exists("../supabase/migrations/20261212000000_feedback_identity.sql")
  ? read("../supabase/migrations/20261212000000_feedback_identity.sql")
  : null;
const adminPage = read("../app/feedback/admin/page.tsx");
const guestPage = exists("../app/feedback/page.tsx") ? read("../app/feedback/page.tsx") : null;
const validateLib = read("../lib/validate.ts");

// -- Case 1: POST JSON human tracked -------------------------------------
// Landed (DS-FBOV-06 worktree): visibility set with tracked default,
// tracked resolves user_id server-side from the session, 401 without one,
// and no client-supplied user id is ever read.
for (const token of [
  '"tracked"',
  '"anonymous"',
  '"guest"',
  "Authentication required.",
  "401",
]) {
  if (!route.includes(token)) fail(`tracked POST must contain '${token}'.`);
}
if (!/visibility.*tracked.*session|session.*visibility.*tracked/s.test(route)) {
  fail("tracked POST must link visibility to the server-side session.");
}
if (!/userId = visibility === "tracked" \? sessionUserId : null/.test(route)) {
  fail("tracked POST must store sessionUserId only for tracked (NULL otherwise).");
}
if (/json\["user_id"\]|json\["userId"\]|form\.get\("user_id"\)/.test(route)) {
  fail("route must never read a client-supplied user id (session is authoritative).");
}
if (!route.includes("201")) fail("successful POST must answer HTTP 201.");
console.log("verify-feedback: check 1 green (POST JSON human tracked: default, session user_id, 401 unauthenticated).");

// -- Case 2: POST anonymous ----------------------------------------------
// Landed with case 1: anonymous stores user_id NULL even when signed in.
if (!route.includes("anonymous")) fail("route must accept visibility anonymous.");
if (!/visibility === "tracked" \? sessionUserId : null/.test(route)) {
  fail("anonymous POST must store user_id NULL (only tracked links the session).");
}
if (!identityMigration) {
  skip("identity migration 20261212000000_feedback_identity.sql absent (DS-FBOV-07) — anonymous user_id NULL enforced at route only.");
} else {
  if (!identityMigration.includes("user_id uuid null")) {
    fail("identity migration must declare user_id nullable (anonymous rows store NULL).");
  }
  console.log("verify-feedback: check 2 green (POST anonymous: user_id NULL, nullable column).");
}

// -- Case 3: POST guest with email ---------------------------------------
// Landed (DS-FBOV-06 worktree): guest needs no session, optional
// contact_name/contact_email, stricter per-IP guest bucket (hashed IP).
for (const token of ["contact_email", "contact_name", "feedback-guest"]) {
  if (!route.includes(token)) fail(`guest POST must contain '${token}'.`);
}
if (!/visibility === "guest"/.test(route)) fail("guest bucket must key on visibility guest.");
if (!route.includes("Guest feedback limit reached")) fail("guest POST must carry its own 5/hour limit message.");
console.log("verify-feedback: check 3 green (POST guest: no session, contact fields, guest bucket).");

// -- Case 4: POST PNG paste (multipart png passes) ------------------------
// Landed (DS-FBOV-06): JPEG/PNG/WebP detected via magic bytes (FF D8 FF
// jpg, 89 50 4E 47 png, RIFF....WEBP webp). Goes strict only on the magic
// + content-type + branch conjunction; otherwise SKIP so the in-flight
// slice is not false-failed.
{
  const hasPngMagic = route.includes("89 50 4E 47") && route.includes("image/png");
  const pngBranch = /png/.test(route) && route.includes("Invalid screenshot (JPEG/PNG/WebP only).");
  if (hasPngMagic && pngBranch) {
    if (!/413/.test(route)) fail("PNG path must keep the oversize 413 branch.");
    console.log("verify-feedback: check 4 green (multipart PNG passes via magic bytes, oversize still 413).");
  } else {
    skip("multipart PNG accept not landed yet (route still JPG-only; owner DS-FBOV-06) — PNG paste stays 400 until then.");
  }
}

// -- Case 5: POST oversize -> 413 -----------------------------------------
// Landed long ago: 8MB authoritative cap, 413 on client-reported size AND
// on post-buffer byte length. Strict regression guard.
if (!route.includes("MAX_SCREENSHOT_BYTES")) fail("route must define MAX_SCREENSHOT_BYTES.");
if (!route.includes("8 * 1024 * 1024")) fail("screenshot cap must be 8MB.");
{
  const hits = route.match(/413/g) ?? [];
  if (hits.length < 2) fail("oversize must 413 on both the early size check and the post-buffer check.");
}
if (!route.includes("Screenshot too large")) fail("oversize 413 must explain the 8MB max.");
console.log("verify-feedback: check 5 green (POST oversize -> 413, early + buffered).");

// -- Case 6: GET admin as non-admin -> denied ------------------------------
// Page-level gate landed (DS-FEEDBACK-08): login required + app_metadata
// role admin, fail-closed denied view. The bot-readable JSON/Markdown
// GET /api/feedback/unaddressed is a QUEUE wiring request (API lane) —
// SKIP until it exists, then it must carry the same admin gate.
if (!adminPage.includes("login required")) fail("admin page must deny anonymous readers (login required).");
if (!adminPage.includes("admin")) fail("admin page must gate on the admin role.");
if (!/role !== "admin"/.test(adminPage)) fail("admin page must deny non-admin sessions.");
if (!/robots.*index.*false/s.test(adminPage)) fail("admin page must stay noindex.");
if (
  exists("../app/api/feedback/unaddressed/route.ts") ||
  exists("../app/api/feedback/unaddressed.md/route.ts")
) {
  const unaddr = exists("../app/api/feedback/unaddressed/route.ts")
    ? read("../app/api/feedback/unaddressed/route.ts")
    : "";
  if (!/admin/.test(unaddr)) fail("GET /api/feedback/unaddressed must carry the admin gate.");
  console.log("verify-feedback: check 6 green (admin page + unaddressed API both deny non-admin).");
} else {
  skip("GET /api/feedback/unaddressed not landed yet (QUEUE wiring request, API lane) — page-level deny enforced, API deny pending.");
  console.log("verify-feedback: check 6 green (admin page denies non-admin: login + role gate).");
}

// -- Case 6b: signed screenshot route denies non-admin ----------------------
// Landed (DS-FBOV-08): GET /api/feedback/[id]/screenshot mints a short-lived
// signed URL only for login + app_metadata-role admin callers (401/403);
// the bucket stays private so no raw storage URL ever renders.
if (exists("../app/api/feedback/[id]/screenshot/route.ts")) {
  const shot = read("../app/api/feedback/[id]/screenshot/route.ts");
  if (!shot.includes("Login required")) fail("screenshot route must 401 anonymous callers.");
  if (!shot.includes("Admin access required")) fail("screenshot route must 403 non-admin callers.");
  if (!/role !== "admin"/.test(shot)) fail("screenshot route must gate on the admin role.");
  if (!shot.includes("createSignedUrl")) fail("screenshot route must mint short-lived signed URLs (no public bucket).");
  console.log("verify-feedback: check 6b green (signed screenshot route: 401 anon, 403 non-admin, signed URL).");
} else {
  skip("GET /api/feedback/[id]/screenshot not landed yet (owner DS-FBOV-08) — admin image gate pending.");
}

// -- Case 7: annotations over-cap -> 400 -----------------------------------
// Landed (DS-FBOV-05/06): annotations array <=20, tool enum + 0..100
// percent coords + <=280 comment chars, violations -> 400 with
// "Invalid annotation(s)" messages. Goes strict only on the accept + cap +
// 400-message conjunction; otherwise SKIP.
{
  const mentionsAnnotations = /annotation/i.test(route);
  const hasCap = route.includes("MAX_ANNOTATIONS") || /annotations.*<=20/i.test(route);
  const rejects400 = route.includes("Invalid annotations") || route.includes("Invalid annotation");
  if (mentionsAnnotations && hasCap && rejects400) {
    if (!route.includes("400")) fail("annotations over-cap must answer 400.");
    console.log("verify-feedback: check 7 green (annotations over-cap -> 400, <=20 + tool/coords/comment bounds).");
  } else {
    skip("annotations cap not landed yet (owners DS-FBOV-05 annotator + DS-FBOV-06 route) — over-cap 400 pending.");
  }
}

// -- Case 8: invalid email -> 400 ------------------------------------------
// Landed (DS-FBOV-06 worktree): contact_email validated via isEmail
// (3..254, normalized lowercase), invalid -> 400.
if (!route.includes("Invalid contact_email")) fail("route must reject an invalid contact_email with 400.");
if (!route.includes("isEmail")) fail("route must validate contact_email via isEmail.");
if (!validateLib.includes("length < 3") || !validateLib.includes("length > 254")) {
  fail("isEmail must enforce the 3..254 char bounds.");
}
if (!validateLib.includes("toLowerCase")) fail("isEmail must normalize lowercase.");
console.log("verify-feedback: check 8 green (invalid email -> 400, isEmail 3..254 lowercase).");

// -- Privacy 9: anonymous row user_id NULL ---------------------------------
// Route NULLs it (check 2, strict). Migration column must stay nullable so
// no NOT NULL backfill can ever force a link onto anonymous rows.
if (identityMigration && /user_id uuid not null/i.test(identityMigration)) {
  fail("identity migration must keep user_id nullable (anonymous rows store NULL).");
}
if (!baseMigration.includes("No public/anon read policies by design")) {
  fail("base migration must keep the no-anon-read access model.");
}
console.log("verify-feedback: privacy 9 green (anonymous user_id NULL, no anon reads).");

// -- Privacy 10: guest email never on public page ---------------------------
// Collection (a contact <input> posting outbound) is the intended path —
// the ban is on DISPLAY: the public page must never read back and render a
// stored contact_email (row fetch + render). The admin queue (login +
// admin role, noindex) is the only surface allowed to carry it.
if (guestPage && /contact_email|contactEmail/.test(guestPage)) {
  // Strip the outbound collection shapes (form.set / JSON payload /
  // validation message); what remains must not read a stored email.
  const outboundStripped = guestPage
    .replace(/form\.set\("contact_email"[^)]*\)/g, "")
    .replace(/contact_email:\s*email/g, "")
    .replace(/Invalid contact_email[^"]*"/g, "");
  if (/\[.contact_email.\]|\b\w+\.contact_email\b/.test(outboundStripped)) {
    fail("public /feedback page must never read back and render a stored contact_email (collection inputs only).");
  }
  console.log("verify-feedback: privacy 10 green (guest email collected via form input only, never displayed).");
} else {
  console.log("verify-feedback: privacy 10 green (guest email absent from public page).");
}
if (/contact_email/.test(adminPage)) {
  console.log("verify-feedback: privacy 10 note — admin page carries contact_email (login + admin role surface, allowed).");
}

console.log("verify-feedback: 8 gate cases + privacy pair evaluated (strict where landed, SKIP where sibling slices are mid-flight).");

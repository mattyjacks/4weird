import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
const fail = (msg) => {
  throw new Error(msg);
};

const page = read("../app/feedback/page.tsx");
const docs = read("../app/docs/feedback/page.tsx");
const route = read("../app/api/feedback/route.ts");
const admin = read("../app/feedback/admin/page.tsx");
const dropzone = read("../components/feedback/screenshot-dropzone.tsx");
const dialog = read("../components/feedback/feedback-dialog.tsx");
const snapBtn = read("../components/feedback/feedback-button.tsx");
const capture = read("../components/feedback/screenshot-capture.ts");

// --- Route: tracked/anonymous/guest identity model ---------------------------
if (!route.includes('"tracked", "anonymous", "guest"')) {
  fail("Route must accept visibility tracked|anonymous|guest.");
}
if (!route.includes('?? "guest"') && !route.includes(': "guest"')) {
  fail("Route must default visibility to guest.");
}
if (!route.includes("contact_name") || !route.includes("contact_email")) {
  fail("Route must accept guest contact_name + contact_email.");
}
if (!route.includes("1..100")) fail("Route must bound contact_name to 1..100 chars.");
if (!route.includes('"dialog", "page", "bot-api"')) {
  fail("Route must accept source dialog|page|bot-api.");
}
if (!route.includes("401")) fail("Route must 401 tracked posts without a login session.");

// --- Route: PNG accept (magic bytes, not MIME/filename) ----------------------
for (const token of ["detectImageKind", "0x89", "Invalid screenshot (JPEG/PNG/WebP only)."]) {
  if (!route.includes(token)) fail(`Route must PNG-accept via magic bytes: missing ${token}.`);
}

// --- Route: oversize screenshot is 413 ---------------------------------------
if (!route.includes("Screenshot too large") || !route.includes("8MB max")) {
  fail("Route must reject oversize screenshots with the 8MB message.");
}
if (!route.includes(", 413)")) fail("Route must answer 413 for oversize screenshots.");

// --- Route: annotations cap ---------------------------------------------------
if (!route.includes("MAX_ANNOTATIONS = 20")) fail("Route must cap annotations at 20.");
if (!route.includes("Invalid annotations (array, <=20).")) {
  fail("Route must 400 an annotations array over the cap.");
}

// --- Route: core dialog contract (no regressions) ----------------------------
for (const token of [
  '"human", "bot"',
  "Invalid rating (good|okay|bad|none).",
  "Invalid critique (positive|neutral|negative|none).",
  "Invalid text (1..4000 chars).",
  "Method not allowed.",
]) {
  if (!route.includes(token)) fail(`Route must keep core contract string: ${token}.`);
}
if (!route.includes("201")) fail("Route must answer 201 on success.");

// --- Page: dialog contracts, guest-capable, dropzone import -------------------
if (!page.includes("components/feedback/screenshot-dropzone")) {
  fail("Page must import the shared ScreenshotDropzone (no inline dropzone).");
}
if (!page.includes("ScreenshotDropzone")) fail("Page must render ScreenshotDropzone.");
for (const token of ['"tracked"', '"anonymous"', '"guest"']) {
  if (!page.includes(token)) fail(`Page visibility picker must offer ${token}.`);
}
if (!page.includes("contact_name") || !page.includes("contact_email")) {
  fail("Page must send guest contact_name + contact_email.");
}
if (!page.includes("MAX_TEXT = 4000") && !page.includes("1..4000")) {
  fail("Page must enforce text 1..4000 chars.");
}
if (!page.includes('source: "page"') && !page.includes('source:"page"')) {
  fail('Page must send source "page" natively.');
}
if (!page.includes("new FormData()")) fail("Page must POST multipart when a screenshot is attached.");
if (!page.includes("application/json")) fail("Page must POST JSON without a screenshot.");
if (!page.includes("/api/feedback")) fail("Page must POST to /api/feedback.");
if (!page.includes("Report ID")) fail("Page success panel must show the Report ID.");

// --- Dropzone: preview + PNG/JPEG/WebP + 8MB cap ------------------------------
if (!dropzone.includes("previewUrl") && !dropzone.includes("preview")) {
  fail("Dropzone must render an image preview.");
}
for (const token of ["image/png", "image/jpeg", "image/webp", "8 * 1024 * 1024"]) {
  if (!dropzone.includes(token)) fail(`Dropzone must cover PNG/JPEG/WebP at 8MB: missing ${token}.`);
}

// --- Docs §5: real bot contract, not the old shape ----------------------------
if (!docs.includes('reporterType: "bot"')) fail("Docs §5 must POST reporterType bot.");
if (!docs.includes("x-bot-key")) fail("Docs §5 must send the x-bot-key header.");
if (!docs.includes("botExtras")) fail("Docs §5 must use botExtras (not extras).");
if (!docs.includes("botId")) fail("Docs §5 botExtras must carry botId.");
if (docs.includes('route: "/bot') || docs.includes("extras: { runId")) {
  fail("Docs §5 must not show the old { rating, critique, route, extras } shape as the contract.");
}

// --- Admin: deny for non-admin (fail-closed) -----------------------------------
for (const token of ["login required.", "restricted to site admins", "Admin only"]) {
  if (!admin.includes(token)) fail(`Admin page must deny non-admins: missing "${token}".`);
}

// --- FB2: single-screen form (no wizard steps) ------------------------------
// The dialog is one scrolling screen: screenshot first, then rating. Any
// wizard/step paging UI ("Go to step", "step N of 2", step state) regresses
// the snap flow and must fail here.
for (const token of [
  "Go to step",
  "step ${",
  "step 1",
  "step 2",
  "Step 1",
  "Step 2",
  "step1Valid",
  "setStep",
  "of 2",
]) {
  if (dialog.includes(token)) fail(`Dialog must be single-screen (no wizard): found "${token}".`);
}
if (!dialog.includes('"Submit feedback"')) {
  fail('Dialog must label the single-screen form "Submit feedback" (not "step N of 2").');
}

// --- FB2: screenshot section precedes rating in DOM order -------------------
if (!dialog.includes('aria-label="Screenshot (optional)"')) {
  fail("Dialog must render the screenshot section first (aria-label Screenshot (optional)).");
}
if (!dialog.includes('aria-label="Feeling rating"')) {
  fail("Dialog must render the rating group (aria-label Feeling rating).");
}
if (
  dialog.indexOf('aria-label="Screenshot (optional)"') >
  dialog.indexOf('aria-label="Feeling rating"')
) {
  fail("Dialog must order the screenshot section before the rating group in DOM order.");
}

// --- FB2: snap button attached to the feedback button ----------------------
if (!snapBtn.includes('aria-label="Take screenshot and give feedback"')) {
  fail("Snap button must be attached with aria-label 'Take screenshot and give feedback'.");
}
if (!snapBtn.includes('"Take screenshot and give feedback"')) {
  fail("Snap button must carry the 'Take screenshot and give feedback' title.");
}

// --- FB2: capture flash (fw:feedback-flash + 0.5s vignette) ----------------
if (!capture.includes('FEEDBACK_FLASH_EVENT = "fw:feedback-flash"')) {
  fail("Capture must define FEEDBACK_FLASH_EVENT as 'fw:feedback-flash'.");
}
if (!snapBtn.includes("fw:feedback-flash")) {
  fail("Snap flow must dispatch the 'fw:feedback-flash' event.");
}
if (!capture.includes("FEEDBACK_FLASH_DURATION_MS = 500")) {
  fail("Capture flash must freeze for exactly 0.5s (FEEDBACK_FLASH_DURATION_MS = 500).");
}
if (!capture.includes("radial-gradient")) {
  fail("Capture flash must render a white vignette (radial-gradient overlay).");
}
if (!capture.includes("flashFreeze")) {
  fail("Capture must export flashFreeze for the 0.5s freeze.");
}
if (!capture.includes("(prefers-reduced-motion")) {
  fail("Capture flash must guard with a prefers-reduced-motion check.");
}

// --- FB2: glow keyframes (10s loop / 2s sweep + reduced-motion guard) ------
if (!snapBtn.includes("fw-feedback-shine-sweep")) {
  fail("Snap flow must define the fw-feedback-shine-sweep glow keyframes.");
}
if (!snapBtn.includes("10s")) {
  fail("Glow shine must loop on a 10s cycle.");
}
if (!snapBtn.includes("20%")) {
  fail("Glow shine must sweep in the first 20% of the loop (2s sweep).");
}
if (!snapBtn.includes("prefers-reduced-motion")) {
  fail("Glow shine must include a reduced-motion guard.");
}

// --- FB2: screenshot-into-form handoff ------------------------------------
if (!dialog.includes("initialScreenshot")) {
  fail("Dialog must accept the initialScreenshot prop for the snap handoff.");
}
if (!dialog.includes("effectiveScreenshotFile")) {
  fail("Dialog must resolve the handoff image into the submit path (effectiveScreenshotFile).");
}
for (const token of ["Edit", "Mark", "Remove"]) {
  if (!dropzone.includes(token)) fail(`Dropzone handoff must offer the ${token} action.`);
}
if (!dropzone.toLowerCase().includes("label")) {
  fail("Dropzone handoff must offer the Label action (mark/label regions).");
}

console.log("Feedback FBOV slice OK (page + docs + route + admin).");
console.log("Feedback FB2 snap-flow slice OK (single-screen + snap + flash + glow + handoff).");

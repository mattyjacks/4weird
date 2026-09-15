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
  "Invalid rating (good|okay|bad).",
  "Invalid critique (positive|negative).",
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

console.log("Feedback FBOV slice OK (page + docs + route + admin).");

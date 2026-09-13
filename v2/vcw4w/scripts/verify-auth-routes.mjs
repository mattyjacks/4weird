import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
const login = read("../components/login-form.tsx");
const signup = read("../components/sign-up-form.tsx");
const update = read("../components/update-password-form.tsx");
const signupSuccess = read("../app/auth/sign-up-success/page.tsx");
const config = read("../next.config.ts");
const proxy = read("../lib/supabase/proxy.ts");

if (!login.includes("router.push(next")) throw new Error("Login must land on /account or a safe requested path.");
if (!login.includes(' : "/account"') && !login.includes("safeNext")) throw new Error("Login must fall back to /account on unsafe next paths.");
// Hardened helper (mirrors GET /auth/confirm): single leading slash only,
// no protocol-relative //evil, no backslashes, no control chars.
if (login.includes("safeNext") && (!login.includes('startsWith("//")') || !login.includes("\\"))) throw new Error("Login safeNext must block protocol-relative and backslash targets.");
if (login.includes('router.push("/protected")')) throw new Error("Login still targets legacy /protected.");
if (!signup.includes('fetch("/api/auth/signup"')) throw new Error("Signup must use the guarded server auth route.");
if (!login.includes('fetch("/api/auth/login"')) throw new Error("Login must use the guarded server auth route.");
if (signup.includes("supabase.auth.signUp") || login.includes("supabase.auth.signInWithPassword")) throw new Error("Browser auth forms must not bypass the guarded server auth routes.");
const passwordReminder = "Password reset and email confirmation are not available yet. Please remember your password.";
if (!login.includes(passwordReminder) || !signup.includes(passwordReminder)) throw new Error("Login and signup must warn that password reset and email confirmation are unavailable.");
if (login.includes('href="/auth/forgot-password"')) throw new Error("Login must not advertise an unavailable password-reset flow.");
if (signupSuccess.includes("Check your email to confirm") || signupSuccess.includes("confirm your account before signing in")) throw new Error("Signup success must not advertise unavailable email confirmation.");
if (!update.includes('router.push("/account")')) throw new Error("Password update must land on /account.");
if (!config.includes('source: "/protected"') || !config.includes('destination: "/account"')) throw new Error("Legacy protected route redirect is missing.");
if (!proxy.includes('request.nextUrl.pathname.startsWith("/api/")') || !proxy.includes('status: 401')) throw new Error("Protected APIs must return JSON 401 responses.");

// Login-gated /my/* pages must stay reachable: redirects run before page
// routes, so a /my/:section catch-all would shadow these documented pages
// (skill.md: /my/usage/ ledger, /my/rights privacy tools) and strand users on
// /account?tab=, which honors no tab. /my and /my/ (no index page) still fold
// into /account.
if (config.includes('"/my/:section"')) throw new Error("next.config must not redirect /my/:section (shadows the live /my/usage + /my/rights pages).");
if (!config.includes('source: "/my"') || !config.includes('source: "/my/"')) throw new Error("Bare /my and /my/ must fold into /account.");
const usagePage = read("../app/my/usage/page.tsx");
const rightsPage = read("../app/my/rights/page.tsx");
if (!usagePage.includes('redirect("/auth/login?next=/my/usage/")')) throw new Error("Usage page must send signed-out visitors to login.");
if (!rightsPage.includes('redirect("/auth/login?next=/my/rights")')) throw new Error("Rights page must send signed-out visitors to login.");
for (const [name, src] of [["usage", usagePage], ["rights", rightsPage]]) {
  if (!src.includes("!hasEnvVars")) throw new Error(`${name} page must degrade gracefully without Supabase env.`);
  if (!src.includes('robots: { index: false, follow: false }')) throw new Error(`${name} page must stay noindex.`);
}

// Password rules: strength (3 of 4 classes) is enforced when a password is
// CHOSEN (signup/change), never when it is PRESENTED; login must use the
// length-shape check so pre-rule accounts are not locked out, and both
// chooser surfaces must state the rule upfront.
const validate = read("../lib/validate.ts");
if (!validate.includes("export function isLoginPassword")) throw new Error("validate must export isLoginPassword (login-shape check).");
const loginRoute = read("../app/api/auth/login/route.ts");
if (!loginRoute.includes("isLoginPassword")) throw new Error("Login must validate with isLoginPassword (no strength classes).");
if (/[^a-zA-Z]isPassword\(/.test(loginRoute)) throw new Error("Login must not enforce isPassword strength (locks out pre-rule accounts).");
const signupRoute = read("../app/api/auth/signup/route.ts");
if (!signupRoute.includes("isPassword(input.password)")) throw new Error("Signup must enforce isPassword strength.");
if (!signupRoute.includes("3 of: lowercase, UPPERCASE, digits, symbols")) throw new Error("Signup must tell the user the password rule.");
for (const [name, src] of [["sign-up", signup], ["update-password", update]]) {
  if (!src.includes("lowercase, UPPERCASE, digits, symbols")) throw new Error(`${name} form must state the password rule upfront.`);
}
// A02 (Next 16 proxy gate, steward-owned): proxy.ts is the middleware
// successor — Node runtime by default, minimal allowlist matcher, light
// direct imports. Per node_modules/next/dist/docs/.../file-conventions/proxy.md:
// Proxy defaults to Node.js; matcher values must be static constants; without
// a matcher Proxy runs on EVERY request (incl. _next/static), so the matcher
// stays a minimal allowlist and static/game/swarm-md traffic skips it by omission.
const proxyTs = read("../proxy.ts");
if (!/export\s+(async\s+)?function\s+proxy\b/.test(proxyTs) && !/export\s+default\s+function/.test(proxyTs)) throw new Error("proxy.ts must export a `proxy` function (Next 16 middleware-successor convention).");
if (/export\s+(async\s+)?function\s+middleware\b/.test(proxyTs)) throw new Error("proxy.ts must not export legacy `middleware` (renamed to `proxy` in Next 16).");
if (/runtime\s*=\s*['"]edge['"]/.test(proxyTs)) throw new Error("proxy.ts must stay on the Node.js runtime (no `runtime = 'edge'`).");
for (const token of ['"/account/:path*"', '"/auth/:path*"', '"/api/:path*"', '"/bot/:path*"']) {
  if (!proxyTs.includes(token)) throw new Error(`proxy.ts matcher must include ${token} (minimal allowlist).`);
}
if (proxyTs.includes("_next/static") || proxyTs.includes('"/:path*"') || /matcher\s*:\s*\[\s*["']\/\(\.\*\)["']/.test(proxyTs)) throw new Error("proxy.ts matcher must stay minimal (no _next/static catch-all, no global /:path*).");
for (const heavy of ["tailwind-merge", "clsx", "@supabase/supabase-js", "service_role", "serviceRole"]) {
  if (proxyTs.includes(heavy)) throw new Error(`proxy.ts must not directly import heavy dep ${heavy} (keep the proxy bundle light).`);
}
// Background work must never block the response: proxy.ts carries no floating
// fetch today; when logging/metrics land they MUST go through
// event.waitUntil()/after() (after.md: usable in Proxy). Tracked in QUEUE A02.
if (/fetch\s*\(/.test(proxyTs) && !proxyTs.includes("waitUntil") && !proxyTs.includes("after(")) throw new Error("proxy.ts background fetch must use event.waitUntil()/after().");
console.log("Auth route integrity OK.");

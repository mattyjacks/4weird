import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
const login = read("../components/login-form.tsx");
const signup = read("../components/sign-up-form.tsx");
const update = read("../components/update-password-form.tsx");
const signupSuccess = read("../app/auth/sign-up-success/page.tsx");
const config = read("../next.config.ts");
const proxy = read("../lib/supabase/proxy.ts");

if (!login.includes("router.push(next") || !login.includes(' : "/account"')) throw new Error("Login must land on /account or a safe requested path.");
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
console.log("Auth route integrity OK.");

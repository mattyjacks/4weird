import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
const login = read("../components/login-form.tsx");
const signup = read("../components/sign-up-form.tsx");
const update = read("../components/update-password-form.tsx");
const config = read("../next.config.ts");
const proxy = read("../lib/supabase/proxy.ts");

if (!login.includes("router.push(next") || !login.includes(' : "/account"')) throw new Error("Login must land on /account or a safe requested path.");
if (login.includes('router.push("/protected")')) throw new Error("Login still targets legacy /protected.");
if (!signup.includes("/auth/confirm?next=/account")) throw new Error("Signup confirmation must use /auth/confirm.");
if (signup.includes("/auth/callback")) throw new Error("Signup references missing /auth/callback.");
if (!update.includes('router.push("/account")')) throw new Error("Password update must land on /account.");
if (!config.includes('source: "/protected"') || !config.includes('destination: "/account"')) throw new Error("Legacy protected route redirect is missing.");
if (!proxy.includes('request.nextUrl.pathname.startsWith("/api/")') || !proxy.includes('status: 401')) throw new Error("Protected APIs must return JSON 401 responses.");
console.log("Auth route integrity OK.");

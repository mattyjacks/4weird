import { readFileSync } from "node:fs";
const source = readFileSync("public/sw.js", "utf8");
for (const forbidden of ["./index.html", "./account.html", "./auth/supabase-auth.js"]) {
  if (source.includes(forbidden)) throw new Error(`Service worker contains stale v1 asset: ${forbidden}`);
}
if (source.includes("./404.html")) throw new Error("Service worker contains removed v1 offline fallback.");
if (!source.includes("event.request.method !== 'GET'") || !source.includes("event.request.cache === 'no-store'")) throw new Error("Service worker must bypass non-GET and no-store requests.");
if (!source.includes("event.request.headers.has('range')")) throw new Error("Service worker must bypass range requests.");
if (!source.includes("requestUrl.pathname.startsWith('/api/')") || !source.includes("requestUrl.pathname.startsWith('/auth/')") || !source.includes("requestUrl.pathname === '/account'") || !source.includes("requestUrl.pathname.startsWith('/protected')")) throw new Error("Service worker must bypass private paths.");
if (!source.includes("requestUrl.searchParams.has('_rsc')")) throw new Error("Service worker must bypass Next.js RSC payload requests.");
if (!source.includes("return Response.error();")) throw new Error("Service worker cache misses must resolve to a Response.");
if (!/CACHE_NAME\s*=\s*['\"]4weird-v\d+-cache/.test(source)) throw new Error("Service worker cache must be versioned.");
console.log("Service-worker privacy checks OK.");

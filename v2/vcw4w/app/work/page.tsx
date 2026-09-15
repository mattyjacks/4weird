import { cacheLife } from "next/cache";
import Link from "next/link";
import { MONITORING_NOTICE } from "@/lib/it-command";

export const metadata = { title: "Work — Safe apps your IT already approved" };

const SAFE_ACTIONS = [
  { href: "/vault", icon: "V", title: "Vault", body: "Approved file home with sharing and access logs." },
  { href: "/swarm", icon: "S", title: "Swarm", body: "Run approved team workflows where every step is logged." },
  { href: "/agents", icon: "A", title: "Agents", body: "Use only the helpers IT turned on for you." },
  { href: "/desktop", icon: "D", title: "Desktop", body: "Your logged cloud desktop for day-to-day work." },
  { href: "/squads", icon: "Q", title: "Squads", body: "Team projects with membership in one place." },
  { href: "/timer", icon: "T", title: "Timer", body: "Track work time where IT can see and back it up." },
];

// Fully static (module-scope SAFE_ACTIONS + MONITORING_NOTICE const): cached
// with an hours lifetime. No cacheTag: no mutation path invalidates this copy.
export default async function WorkPage() {
  "use cache";
  cacheLife("hours");

  return (
    <main className="mx-auto max-w-4xl px-3 py-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
          Work
        </p>
        <h1 className="text-xl font-bold">
          Work — Safe apps your IT already approved
        </h1>
        <p className="w-full truncate text-xs text-neutral-600">
          Everything below is approved and logged. Stay inside these apps and
          your work is safe, shared, and backed up.
        </p>
      </div>

      {/* Slim 28px dismissible telemetry pill (CSS-only dismiss: the label
          checks the hidden box, which hides the pill via peer-checked). */}
      <input type="checkbox" id="work-mon-dismiss" className="peer sr-only" />
      <div className="mt-2 flex h-7 items-center gap-2 overflow-hidden rounded-full border border-amber-300/60 bg-amber-50 px-3 text-xs text-amber-900 peer-checked:hidden">
        <span aria-hidden="true" className="font-bold">ⓘ</span>
        <p className="truncate" title={MONITORING_NOTICE}>
          Device telemetry logged for active contracts
        </p>
        <label
          htmlFor="work-mon-dismiss"
          className="ml-auto cursor-pointer rounded-full px-1 font-bold hover:bg-amber-200"
          aria-label="Dismiss monitoring notice"
        >
          ✕
        </label>
      </div>

      {/* Dark glass 3x2 matrix */}
      <div className="mt-3 rounded-2xl bg-slate-950 p-3">
        <h2 className="px-1 text-sm font-semibold text-white">Safe actions</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SAFE_ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              title={a.body}
              className="rounded-xl border border-white/10 bg-white/[.06] p-3 backdrop-blur transition hover:border-cyan-300/50 hover:bg-white/10"
            >
              <p className="text-sm font-semibold text-white">
                <span aria-hidden="true" className="mr-1.5">{a.icon}</span>
                {a.title}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-400">{a.body}</p>
              <p className="mt-1 text-xs font-medium text-cyan-300">{a.href} →</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Interactive mini IT request form (replaces the static cURL box) */}
      <h2 className="mt-4 text-sm font-semibold">Need something else? Ask IT</h2>
      <p className="mt-1 text-xs text-neutral-600">
        Do not sign up for a new app on your own — that is shadow IT. Send one
        request and wait for approval:
      </p>
      <form
        id="work-it-request"
        className="mt-2 flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-3 sm:flex-row"
      >
        <label className="flex-1 text-xs font-semibold text-neutral-700">
          Tool / Permission Needed
          <input
            name="appName"
            required
            minLength={2}
            maxLength={80}
            placeholder="Figma"
            autoComplete="off"
            className="mt-1 w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm font-normal text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none"
          />
        </label>
        <label className="flex-[2] text-xs font-semibold text-neutral-700">
          Business Justification
          <input
            name="reason"
            required
            minLength={5}
            maxLength={500}
            placeholder="Design mockups for the spring launch"
            autoComplete="off"
            className="mt-1 w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm font-normal text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="self-end rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Submit Request →
        </button>
      </form>
      <p id="work-it-status" role="status" className="mt-1.5 text-xs text-neutral-600" />
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){var f=document.getElementById('work-it-request');var s=document.getElementById('work-it-status');if(!f||!s)return;f.addEventListener('submit',function(e){e.preventDefault();var d=new FormData(f);var appName=String(d.get('appName')||'').trim();var reason=String(d.get('reason')||'').trim();s.textContent='Sending…';fetch('/api/it/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({appName:appName,reason:reason})}).then(function(r){return r.json().then(function(b){return{ok:r.ok,body:b};});}).then(function(x){if(x.ok){s.textContent='Request sent — IT will approve or deny it in the audit log.';f.reset();}else{s.textContent='Rejected: '+((x.body&&(x.body.error||x.body.message))||('HTTP '+x.ok));}}).catch(function(){s.textContent='Network error — try again.';});});})();`,
        }}
      />
    </main>
  );
}

import Link from "next/link";
import { MONITORING_NOTICE } from "@/lib/it-command";

export const metadata = { title: "Work — Safe apps your IT already approved" };

const SAFE_ACTIONS = [
  { href: "/vault", title: "Vault", body: "Approved file home with sharing and access logs." },
  { href: "/swarm", title: "Swarm", body: "Run approved team workflows where every step is logged." },
  { href: "/agents", title: "Agents", body: "Use only the helpers IT turned on for you." },
  { href: "/desktop", title: "Desktop", body: "Your logged cloud desktop for day-to-day work." },
  { href: "/squads", title: "Squads", body: "Team projects with membership in one place." },
  { href: "/timer", title: "Timer", body: "Track work time where IT can see and back it up." },
];

export default function WorkPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
        Work
      </p>
      <h1 className="mt-2 text-3xl font-bold">
        Work — Safe apps your IT already approved
      </h1>
      <p className="mt-3 text-neutral-600">
        Everything below is approved and logged. Stay inside these apps and
        your work is safe, shared, and backed up.
      </p>

      <div
        role="note"
        aria-label="Monitoring disclosure"
        className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
      >
        <p className="font-semibold">Monitoring disclosure</p>
        <p className="mt-1">{MONITORING_NOTICE}</p>
      </div>

      <h2 className="mt-10 text-xl font-semibold">Safe actions</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SAFE_ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="rounded-lg border border-neutral-200 bg-white p-4 hover:border-neutral-400 hover:shadow-sm"
          >
            <p className="font-semibold">{a.title}</p>
            <p className="mt-1 text-sm text-neutral-600">{a.body}</p>
            <p className="mt-2 text-sm font-medium text-blue-600">{a.href} →</p>
          </Link>
        ))}
      </div>

      <h2 className="mt-10 text-xl font-semibold">Need something else? Ask IT</h2>
      <p className="mt-2 text-sm text-neutral-600">
        Do not sign up for a new app on your own — that is shadow IT. Send one
        request and wait for approval:
      </p>
      <pre className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-950 p-4 text-xs text-neutral-100">
{`POST /api/it/requests
Content-Type: application/json

{
  "appName": "Figma",
  "reason": "Design mockups for the spring launch"
}`}
      </pre>
      <p className="mt-3 text-sm text-neutral-600">
        IT will approve or deny it, and the decision shows up in the audit log.
      </p>
    </main>
  );
}

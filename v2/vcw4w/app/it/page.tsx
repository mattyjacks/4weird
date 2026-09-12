import Link from "next/link";
import { APPROVED_APPS } from "@/lib/approved-apps";
import { POLICY_TEMPLATES } from "@/lib/it-policy";

export const metadata = { title: "IT Command Center" };

export default function ItPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
        IT Admin
      </p>
      <h1 className="mt-2 text-3xl font-bold">IT Command Center</h1>
      <p className="mt-3 text-neutral-600">
        Approve apps, watch usage, stop Shadow IT
      </p>

      <h2 className="mt-10 text-xl font-semibold">Approved Apps</h2>
      <p className="mt-2 text-sm text-neutral-600">
        The team may use only these logged paths. Anything else is shadow IT —
        ask IT first.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {APPROVED_APPS.map((app) => (
          <li
            key={app.slug}
            className="rounded-lg border border-neutral-200 bg-white p-4"
          >
            <p className="font-semibold">{app.name}</p>
            <p className="mt-1 text-sm text-neutral-600">{app.path}</p>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-xl font-semibold">Policy templates</h2>
      <p className="mt-2 text-sm text-neutral-600">
        Pick one guardrail set for the whole team.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {POLICY_TEMPLATES.map((t) => (
          <li
            key={t.id}
            className="rounded-lg border border-neutral-200 bg-white p-4"
          >
            <p className="font-semibold">{t.name}</p>
            <p className="mt-1 text-sm text-neutral-600">{t.description}</p>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-xl font-semibold">Audit</h2>
      <div
        role="note"
        aria-label="Audit note"
        className="mt-4 rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-700"
      >
        <p>
          Auditors read the logs to prove the rules were followed; they change
          nothing. Open the read-only trail any time.
        </p>
        <p className="mt-2">
          <Link href="/api/it/audit" className="font-medium text-blue-600">
            /api/it/audit →
          </Link>
        </p>
      </div>

      <h2 className="mt-10 text-xl font-semibold">Requests &amp; reports</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Link
          href="/api/it/requests"
          className="rounded-lg border border-neutral-200 bg-white p-4 hover:border-neutral-400 hover:shadow-sm"
        >
          <p className="font-semibold">Access requests</p>
          <p className="mt-1 text-sm text-neutral-600">
            Review employee requests for new apps.
          </p>
          <p className="mt-2 text-sm font-medium text-blue-600">
            /api/it/requests →
          </p>
        </Link>
        <Link
          href="/api/it/reports"
          className="rounded-lg border border-neutral-200 bg-white p-4 hover:border-neutral-400 hover:shadow-sm"
        >
          <p className="font-semibold">Usage reports</p>
          <p className="mt-1 text-sm text-neutral-600">
            Watch usage and spot shadow IT early.
          </p>
          <p className="mt-2 text-sm font-medium text-blue-600">
            /api/it/reports →
          </p>
        </Link>
      </div>
    </main>
  );
}

import Link from "next/link";
import { MONITORING_NOTICE } from "@/lib/it-command";
import { SHADOW_IT_RISKS } from "@/lib/shadow-it";

export const metadata = { title: "Boss Mode — See everything, safely" };

const LINKS = [
  { href: "/it", title: "IT Console", body: "Approve apps, manage access, read audit logs." },
  { href: "/work", title: "Work", body: "Approved, logged workspace for the whole team." },
  { href: "/docs/shadow-it", title: "Shadow IT guide", body: "Plain-English explainer: what shadow IT is and why it hurts." },
  { href: "/vault", title: "Vault", body: "Approved file home with sharing and access logs." },
  { href: "/squads", title: "Squads", body: "Team projects with membership in one place." },
  { href: "/my/usage", title: "My usage", body: "See your own spend and activity in one ledger." },
];

export default function BossPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
        Boss Mode
      </p>
      <h1 className="mt-2 text-3xl font-bold">
        Boss Mode — See everything, safely
      </h1>
      <p className="mt-3 text-neutral-600">
        One safe home for work. Approve the apps your team may use, keep work
        where it is logged and backed up, and check the logs any time.
      </p>

      <div
        role="note"
        aria-label="Monitoring disclosure"
        className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
      >
        <p className="font-semibold">Monitoring disclosure</p>
        <p className="mt-1">{MONITORING_NOTICE}</p>
      </div>

      <h2 className="mt-10 text-xl font-semibold">Start here</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-lg border border-neutral-200 bg-white p-4 hover:border-neutral-400 hover:shadow-sm"
          >
            <p className="font-semibold">{l.title}</p>
            <p className="mt-1 text-sm text-neutral-600">{l.body}</p>
            <p className="mt-2 text-sm font-medium text-blue-600">{l.href} →</p>
          </Link>
        ))}
      </div>

      <h2 className="mt-10 text-xl font-semibold">
        Why unapproved apps (shadow IT) are risky
      </h2>
      <p className="mt-2 text-sm text-neutral-600">
        Shadow IT means using apps for work that your team did not approve. In
        plain English, here is what can go wrong:
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {SHADOW_IT_RISKS.map((r) => (
          <li
            key={r.id}
            className="rounded-lg border border-neutral-200 bg-white p-4"
          >
            <p className="font-semibold">{r.title}</p>
            <p className="mt-1 text-sm text-neutral-600">{r.plain}</p>
            <p className="mt-2 text-sm text-neutral-700">
              <span className="font-medium">Do instead: </span>
              {r.fix}
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-sm text-neutral-600">
        Rule of thumb: if the team cannot see it, log it, lock it, or back it
        up, do not put work in it. Ask first, then use the approved path.
      </p>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Measures library — VocRehab Pro",
  description:
    "Your own approved progress measures and rationales, copy-forward ready. Own drafts only — never cross-counselor.",
  alternates: { canonical: "/vocrehab/pro/measures" },
};

/** Minimal local shape — never import @/types/vocrehab-* here. */
interface VocrehabLibraryRow {
  id: string;
  body: string;
  status: string;
  created_at: string;
  kind?: string | null;
  client_ref?: string | null;
}

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-2xl font-bold">Measures library</h1>
        <p className="text-sm">Sign in as a counselor to view your drafts.</p>
        <Link className="text-sm underline" href="/vocrehab/pro">
          Back to Pro index
        </Link>
      </main>
    );
  }

  const [measures, rationales] = await Promise.all([
    supabase
      .from("vocrehab_progress_measures")
      .select("id,body,status,created_at,client_ref")
      .eq("counselor_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("vocrehab_rationalizations")
      .select("id,body,status,created_at,kind")
      .eq("counselor_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const measureRows = ((measures.data ?? []) as VocrehabLibraryRow[]).filter(
    (r) => r.status === "approved",
  );
  const rationaleRows = (rationales.data ?? []) as VocrehabLibraryRow[];

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <Link className="text-sm underline" href="/vocrehab/pro">
          Back to Pro index
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Measures library</h1>
        <p className="text-sm text-muted-foreground">
          Your own drafts only — never another counselor&apos;s. Approved
          measures below are copy-forward ready: select the text, copy, and
          roll the date forward in a new session. JCTS / SE / CE language is
          a template starting point — you determine need.
        </p>
      </div>

      <section aria-labelledby="vocrehab-measures-heading">
        <h2 id="vocrehab-measures-heading" className="text-lg font-bold">
          Approved progress measures ({measureRows.length})
        </h2>
        {measureRows.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            No approved measures yet. Approve one from a{" "}
            <Link className="underline" href="/vocrehab/pro/sessions">
              session review
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-2 space-y-3">
            {measureRows.map((row) => (
              <li
                key={row.id}
                className="rounded-xl border border-white/15 p-4"
              >
                <p className="text-xs text-muted-foreground">
                  Client {row.client_ref ?? "—"} · approved {row.created_at}
                </p>
                <label
                  className="mt-2 block text-sm font-medium"
                  htmlFor={`vocrehab-copy-${row.id}`}
                >
                  Copy-forward text (select, copy, roll the date)
                  <textarea
                    id={`vocrehab-copy-${row.id}`}
                    readOnly
                    rows={4}
                    value={row.body}
                    className="mt-1 block w-full rounded-md border border-white/20 bg-white/5 p-2 text-sm"
                  />
                </label>
                <Link
                  className="mt-2 inline-block text-sm underline"
                  href="/vocrehab/pro/sessions"
                >
                  Use in a new session
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="vocrehab-rationales-heading">
        <h2 id="vocrehab-rationales-heading" className="text-lg font-bold">
          Rationales ({rationaleRows.length})
        </h2>
        {rationaleRows.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            No rationales yet.
          </p>
        ) : (
          <ul className="mt-2 space-y-3">
            {rationaleRows.map((row) => (
              <li
                key={row.id}
                className="rounded-xl border border-white/15 p-4"
              >
                <p className="text-xs text-muted-foreground">
                  {row.kind ?? "SE"} · {row.status} · {row.created_at}
                </p>
                <label
                  className="mt-2 block text-sm font-medium"
                  htmlFor={`vocrehab-copy-${row.id}`}
                >
                  Copy-forward text (select, copy, roll the date)
                  <textarea
                    id={`vocrehab-copy-${row.id}`}
                    readOnly
                    rows={5}
                    value={row.body}
                    className="mt-1 block w-full rounded-md border border-white/20 bg-white/5 p-2 text-sm"
                  />
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

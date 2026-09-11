import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";
import Link from "next/link";

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const params = await searchParams;

  // Map provider error codes to generic messages — never reflect raw
  // Supabase error text (leaks provider internals).
  const GENERIC: Record<string, string> = {
    access_denied: "Access was denied.",
    expired: "This link expired. Request a new one.",
    invalid: "This link is invalid.",
  };
  const key = String(params?.error ?? "").slice(0, 64).toLowerCase();
  const message = GENERIC[key] ?? "An unspecified error occurred.";

  return (
    <>
      <p className="text-sm text-muted-foreground">{message}</p>
    </>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Sorry, something went wrong.
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense>
                <ErrorContent searchParams={searchParams} />
              </Suspense>
              <Link className="mt-5 inline-block text-sm text-cyan-300 underline" href="/auth/login">Return to login</Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

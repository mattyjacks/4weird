import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to 4weird Games to sync your saves, coins, and high scores.",
  robots: { index: false, follow: false },
};

// NOTE: no 'use cache' here — this route serves per-user session forms.
// Static shell (layout copy) prerenders; the session-bound form streams
// inside Suspense so PPR never caches personal data.
export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense
          fallback={
            <div aria-busy="true" aria-label="Loading sign-in form" className="flex flex-col gap-6 animate-pulse">
              <div className="h-10 w-32 rounded bg-white/10" />
              <div className="h-4 w-56 rounded bg-white/10" />
              <div className="h-10 w-full rounded bg-white/10" />
              <div className="h-10 w-full rounded bg-white/10" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}

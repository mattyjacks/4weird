import type { Metadata } from "next";
import { Suspense } from "react";
import { SignUpForm } from "@/components/sign-up-form";

export const metadata: Metadata = {
  title: "Sign Up Free",
  description: "Create a free 4weird Games account and pocket 100 welcome Vibe Coins.",
  robots: { index: false, follow: false },
};

// NOTE: no 'use cache' here — per-user session form. Static shell streams
// the form inside Suspense so nothing personal is cached.
export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense
          fallback={
            <div aria-busy="true" aria-label="Loading sign-up form" className="flex flex-col gap-6 animate-pulse">
              <div className="h-10 w-32 rounded bg-white/10" />
              <div className="h-4 w-56 rounded bg-white/10" />
              <div className="h-10 w-full rounded bg-white/10" />
              <div className="h-10 w-full rounded bg-white/10" />
            </div>
          }
        >
          <SignUpForm />
        </Suspense>
      </div>
    </div>
  );
}

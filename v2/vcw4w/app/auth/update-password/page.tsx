import type { Metadata } from "next";
import { Suspense } from "react";
import { UpdatePasswordForm } from "@/components/update-password-form";

export const metadata: Metadata = {
  title: "Update password",
  description: "Set a new password for your 4weird Games account.",
  alternates: { canonical: "/auth/update-password" },
};

// NOTE: no 'use cache' here — per-user session form streams in Suspense.
export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense
          fallback={
            <div aria-busy="true" aria-label="Loading password update form" className="flex flex-col gap-6 animate-pulse">
              <div className="h-10 w-40 rounded bg-white/10" />
              <div className="h-10 w-full rounded bg-white/10" />
            </div>
          }
        >
          <UpdatePasswordForm />
        </Suspense>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { SignUpForm } from "@/components/sign-up-form";

export const metadata: Metadata = {
  title: "Sign Up Free",
  description: "Create a free 4weird Games account and pocket 100 welcome Vibe Coins.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignUpForm />
      </div>
    </div>
  );
}

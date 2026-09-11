import type { Metadata } from "next";
import { KidLoginForm } from "@/components/family/kid-login-form";

export const metadata: Metadata = {
  title: "Kid & Teen Login",
  description: "Children log in with their username#1234 handle and password — no email needed.",
  robots: { index: false, follow: false },
};

export default function FamilyLoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-20">
        <h1 className="text-4xl font-black">Family login</h1>
        <p className="mt-4 text-slate-300">
          Kids and teens play on child accounts made by a parent. Grown-ups with their own account use the regular{" "}
          <a className="text-cyan-300 hover:underline" href="/auth/login">log in</a> page instead.
        </p>
        <div className="mt-8">
          <KidLoginForm next="/games" />
        </div>
      </section>
    </main>
  );
}

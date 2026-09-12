"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [ageBand, setAgeBand] = useState<"teen" | "adult" | "under13" | "">("");
  const [localConsent, setLocalConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (!ageBand) {
      setError("Choose your age band: Teen (13-17) or Adult (18+).");
      setIsLoading(false);
      return;
    }
    if (ageBand === "under13") {
      setError("Under 13 needs a parent or guardian account: have them sign up as Adult (18+), then create your Child account in Account → Family.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, age_band: ageBand, local_consent: localConsent }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Unable to create an account.");
      if (body.needsConfirmation) {
        throw new Error("Email confirmation is not available yet. Please try again later.");
      }
      router.push(body.user ? "/account" : "/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign up</CardTitle>
          <CardDescription>Create a new account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  8+ characters with 3 of: lowercase, UPPERCASE, digits, symbols.
                </p>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">Repeat Password</Label>
                </div>
                <Input
                  id="repeat-password"
                  name="repeat-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
              <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
                Password reset and email confirmation are not available yet. Please remember your password.
              </p>
              <fieldset className="grid gap-2">
                <legend className="text-sm font-medium">Age band (required)</legend>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="ageBand"
                    value="teen"
                    checked={ageBand === "teen"}
                    onChange={() => setAgeBand("teen")}
                    required
                  />
                  <span>I&apos;m 13-17 (Teen account)</span>
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="ageBand"
                    value="adult"
                    checked={ageBand === "adult"}
                    onChange={() => setAgeBand("adult")}
                  />
                  <span>I&apos;m 18 or older (Adult account)</span>
                </label>
                <label className="flex items-start gap-2 text-sm text-slate-500">
                  <input
                    type="radio"
                    name="ageBand"
                    value="under13"
                    checked={ageBand === "under13"}
                    onChange={() => setAgeBand("under13")}
                  />
                  <span>
                    I&apos;m under 13 - I need a parent/guardian to sign up (Adult), then create my Child account in
                    Account → Family. <Link href="/family/login" className="underline underline-offset-4">Child login</Link>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    name="localConsent"
                    checked={localConsent}
                    onChange={(e) => setLocalConsent(e.target.checked)}
                  />
                  <span>
                    Where my country requires it (e.g. EU under 16), I confirm I have parent/guardian permission to
                    create this account. No birth date is collected - only this band.
                  </span>
                </label>
              </fieldset>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating an account..." : "Sign up"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link href="/auth/login" className="underline underline-offset-4">
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

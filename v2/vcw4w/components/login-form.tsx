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

// Strict same-origin target, mirroring GET /auth/confirm: single leading
// slash (no protocol-relative //evil), no backslashes (some clients
// normalize /\evil to //evil), no control characters, length-capped.
// Anything else falls back to /account.
function safeNext(value: string | null): string {
  const v = String(value ?? "");
  if (!v.startsWith("/") || v.startsWith("//")) return "/account";
  if (v.includes("\\")) return "/account";
  if (v.length > 2048) return "/account";
  for (let i = 0; i < v.length; i++) {
    const code = v.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return "/account";
  }
  return v;
}

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: unknown };
      if (!response.ok) {
        // Status-aware errors: the body can be unparsable ({}), and falling
        // back to "Invalid login credentials." for every status would
        // misreport a rate-limit (429) or origin (403) block as bad
        // credentials, so the user retries the password instead of waiting.
        // All texts stay generic — never an oracle for which half was wrong.
        const serverText = typeof body.error === "string" && body.error ? body.error : null;
        if (response.status === 429) throw new Error(serverText ?? "Too many attempts. Wait a minute and retry.");
        if (response.status === 403) throw new Error(serverText ?? "Invalid request origin.");
        if (response.status >= 500) throw new Error("Login temporarily unavailable. Try again shortly.");
        throw new Error(serverText ?? "Invalid login credentials.");
      }
      // The account page is the v2 authenticated destination; /protected is a legacy starter route.
      const next = safeNext(new URLSearchParams(window.location.search).get("next"));
      router.push(next);
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
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
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
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
                Password reset and email confirmation are not available yet. Please remember your password.
              </p>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/sign-up"
                className="underline underline-offset-4"
              >
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

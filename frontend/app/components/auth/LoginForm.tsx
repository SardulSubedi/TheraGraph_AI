"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/app/lib/auth";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/vault";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn(email.trim(), password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(nextPath.startsWith("/") ? nextPath : "/vault");
    router.refresh();
  };

  return (
    <Card className="w-full max-w-md">
      <p className="micro-label text-accent">TheraGraph AI</p>
      <h1 className="mt-2 text-xl font-medium">Sign in</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Clinician access to Control Vault and patient workspaces.
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="micro-label text-text-secondary">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 outline-none focus:border-accent/50"
          />
        </label>

        <label className="block text-sm">
          <span className="micro-label text-text-secondary">Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 outline-none focus:border-accent/50"
          />
        </label>

        {error && <p className="text-xs text-danger">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        <Link href="/" className="text-accent hover:underline">
          ← Back to landing
        </Link>
      </p>
    </Card>
  );
}

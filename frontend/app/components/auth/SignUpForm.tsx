"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signUp } from "@/app/lib/auth";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/vault";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const result = await signUp(email.trim(), password, name.trim() || undefined);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.needsConfirmation) {
      setNotice(
        "Account created. Check your inbox to confirm your email, then sign in.",
      );
      setLoading(false);
      return;
    }

    router.push(nextPath.startsWith("/") ? nextPath : "/vault");
    router.refresh();
  };

  return (
    <Card className="w-full max-w-md">
      <p className="micro-label text-accent">TheraGraph AI</p>
      <h1 className="mt-2 text-xl font-medium">Create your account</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Set up clinician access to the memory console.
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="micro-label text-text-secondary">Full name</span>
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 outline-none focus:border-accent/50"
          />
        </label>

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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 outline-none focus:border-accent/50"
          />
        </label>

        <label className="block text-sm">
          <span className="micro-label text-text-secondary">
            Confirm password
          </span>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 outline-none focus:border-accent/50"
          />
        </label>

        {error && <p className="text-xs text-danger">{error}</p>}
        {notice && <p className="text-xs text-success">{notice}</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}

import { Suspense } from "react";
import { SignUpForm } from "@/app/components/auth/SignUpForm";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6">
      <Suspense
        fallback={<div className="text-sm text-text-secondary">Loading…</div>}
      >
        <SignUpForm />
      </Suspense>
    </div>
  );
}

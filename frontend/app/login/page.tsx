import { Suspense } from "react";
import { LoginForm } from "@/app/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6">
      <Suspense
        fallback={
          <div className="text-sm text-text-secondary">Loading…</div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}

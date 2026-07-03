"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/app/lib/auth";
import { Button } from "@/app/components/ui/Button";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <Button
      variant="ghost"
      onClick={() => void handleSignOut()}
      disabled={loading}
      className="text-xs"
    >
      {loading ? "Signing out…" : "Sign out"}
    </Button>
  );
}

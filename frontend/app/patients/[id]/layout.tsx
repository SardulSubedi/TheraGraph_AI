import Link from "next/link";
import { getPatient } from "@/app/lib/api";
import { PatientNav } from "@/app/components/PatientNav";
import { PatientScreenLabel } from "@/app/components/PatientScreenLabel";
import { SignOutButton } from "@/app/components/auth/SignOutButton";

export default async function PatientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = await getPatient(id);

  if (!patient) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p className="text-text-secondary">
          Patient not found or backend unavailable.
        </p>
        <Link href="/vault" className="text-accent hover:underline">
          ← Back to Control Vault
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <PatientScreenLabel patientName={patient.name} />
          <SignOutButton />
        </div>
        <div className="mt-3">
          <PatientNav patientId={id} />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

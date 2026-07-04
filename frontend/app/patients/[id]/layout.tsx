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
      <div className="theme-clinical flex min-h-screen flex-col items-center justify-center gap-4 bg-bg p-6">
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
    <div className="theme-clinical flex min-h-screen flex-col bg-bg">
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <PatientScreenLabel patientName={patient.name} />
          <div className="flex items-center gap-3">
            <span
              className="hidden items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-700 sm:inline-flex"
              title="This is a research prototype. Outputs are illustrative and must not be used for real prescribing or treatment decisions."
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
              Prototype — not for clinical use
            </span>
            <SignOutButton />
          </div>
        </div>
        <div className="mt-3">
          <PatientNav patientId={id} />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

import { getPatient } from "@/app/lib/api";
import { TherapyPageClient } from "./TherapyPageClient";

export default async function TherapyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = await getPatient(id);
  return (
    <TherapyPageClient
      patientId={id}
      patientName={patient?.name ?? "Patient"}
    />
  );
}

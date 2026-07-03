import { getPatient } from "@/app/lib/api";
import { FormulationPageClient } from "./FormulationPageClient";

export default async function FormulationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = await getPatient(id);
  return (
    <FormulationPageClient
      patientId={id}
      patientName={patient?.name ?? "Patient"}
    />
  );
}

import { getPatient } from "@/app/lib/api";
import { GraphPageClient } from "./GraphPageClient";

export default async function GraphPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = await getPatient(id);

  return (
    <GraphPageClient
      patientId={id}
      patientName={patient?.name ?? "Patient"}
    />
  );
}

import { FormulationPageClient } from "./FormulationPageClient";

export default async function FormulationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FormulationPageClient patientId={id} />;
}

import { IntakePageClient } from "./IntakePageClient";

export default async function IntakePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <IntakePageClient patientId={id} />;
}

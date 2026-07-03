import { getTimeline } from "@/app/lib/api";
import { Timeline } from "@/app/components/Timeline";

export default async function TimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const initialEntries = await getTimeline(id);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Timeline patientId={id} initialEntries={initialEntries} />
    </div>
  );
}

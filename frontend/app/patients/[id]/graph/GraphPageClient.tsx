"use client";

import { useEffect, useState } from "react";
import { getGraph } from "@/app/lib/api";
import type { GraphData } from "@/app/lib/types";
import { GraphCanvas } from "@/app/components/GraphCanvas";
import { Skeleton } from "@/app/components/ui/Skeleton";

interface GraphPageClientProps {
  patientId: string;
  patientName: string;
}

export function GraphPageClient({
  patientId,
  patientName,
}: GraphPageClientProps) {
  const [data, setData] = useState<GraphData>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const graph = await getGraph(patientId);
      setData(graph);
      setLoading(false);
    })();
  }, [patientId]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-120px)] flex-col gap-4 p-4">
        <Skeleton className="h-6 w-48 bg-surface" />
        <div className="relative flex-1 overflow-hidden rounded border border-border bg-surface">
          <Skeleton className="absolute left-1/2 top-1/2 h-16 w-32 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-border" />
          <Skeleton className="absolute left-[20%] top-[30%] h-10 w-24 rounded-lg bg-border/80" />
          <Skeleton className="absolute right-[25%] top-[25%] h-10 w-28 rounded-lg bg-border/80" />
          <Skeleton className="absolute bottom-[30%] left-[30%] h-10 w-20 rounded-lg bg-border/80" />
          <Skeleton className="absolute bottom-[25%] right-[20%] h-10 w-32 rounded-lg bg-border/80" />
        </div>
      </div>
    );
  }

  const isEmpty = data.nodes.length === 0;

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col">
      {isEmpty && (
        <div className="border-b border-border bg-surface/50 px-4 py-2 text-center text-sm text-text-secondary">
          No live graph data — showing demo topology. Ingest clinical files on
          Intake to build patient-specific recall.
        </div>
      )}
      <div className="flex-1">
        <GraphCanvas data={data} patientName={patientName} />
      </div>
    </div>
  );
}

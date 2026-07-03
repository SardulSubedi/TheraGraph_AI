"use client";

import { useMemo, useState } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
} from "@xyflow/react";
import type { GraphData, GraphNode } from "@/app/lib/types";
import { Badge } from "@/app/components/ui/Badge";

interface GraphCanvasProps {
  data: GraphData;
  patientName?: string;
}

const LEGEND_ITEMS = [
  { type: "patient", label: "Patient", color: "#A1A1AA", border: "#52525B" },
  { type: "gene", label: "Gene", color: "#06B6D4", border: "#06B6D4" },
  { type: "variant", label: "Variant", color: "#06B6D4", border: "#06B6D4" },
  { type: "phenotype", label: "Phenotype", color: "#06B6D4", border: "#06B6D4" },
  { type: "condition", label: "Condition", color: "#06B6D4", border: "#06B6D4" },
  { type: "drug", label: "Drug / Contraindication", color: "#F43F5E", border: "#F43F5E" },
] as const;

function radialLayout(
  nodes: GraphNode[],
  patientId?: string,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const centerId =
    nodes.find((n) => n.type === "patient")?.id ??
    patientId ??
    nodes[0]?.id ??
    "patient";
  positions.set(centerId, { x: 0, y: 0 });

  const others = nodes.filter((n) => n.id !== centerId);
  const radius = 220;
  others.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / Math.max(others.length, 1);
    positions.set(node.id, {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  });

  return positions;
}

function fallbackGraph(patientName?: string): GraphData {
  const label = patientName ?? "Patient";
  return {
    nodes: [
      { id: "patient", label, type: "patient" },
      { id: "gene-1", label: "CYP2D6 *4/*4", type: "gene" },
      { id: "pheno-1", label: "Poor Metabolizer", type: "phenotype" },
      { id: "drug-1", label: "Codeine contraindicated", type: "drug" },
    ],
    edges: [
      { source: "patient", target: "gene-1", label: "has" },
      { source: "gene-1", target: "pheno-1", label: "→" },
      { source: "pheno-1", target: "drug-1", label: "blocks" },
    ],
  };
}

function nodeColor(type?: string): string {
  if (type === "patient") return "#0f172a";
  if (type === "drug") return "#fef2f2";
  if (type === "gene") return "#cffafe";
  return "#ecfeff";
}

function nodeBorder(type?: string): string {
  if (type === "patient") return "#0f172a";
  if (type === "drug") return "#e11d48";
  return "#0891b2";
}

function nodeText(type?: string): string {
  if (type === "patient") return "#ffffff";
  if (type === "drug") return "#9f1239";
  return "#0f172a";
}

export function GraphCanvas({ data, patientName }: GraphCanvasProps) {
  const [hovered, setHovered] = useState<GraphNode | null>(null);
  const isDemo = data.nodes.length === 0;

  const graph = useMemo(
    () => (isDemo ? fallbackGraph(patientName) : data),
    [data, patientName, isDemo],
  );

  const positions = useMemo(
    () => radialLayout(graph.nodes, "patient"),
    [graph.nodes],
  );

  const flowNodes: Node[] = useMemo(
    () =>
      graph.nodes.map((n) => ({
        id: n.id,
        data: { label: n.label, node: n },
        position: positions.get(n.id) ?? { x: 0, y: 0 },
        style: {
          background: nodeColor(n.type),
          border: `1px solid ${nodeBorder(n.type)}`,
          borderRadius: 8,
          padding: "8px 12px",
          color: nodeText(n.type),
          fontSize: 12,
          maxWidth: 160,
          textAlign: "center" as const,
        },
      })),
    [graph.nodes, positions],
  );

  const flowEdges: Edge[] = useMemo(
    () =>
      graph.edges.map((e, i) => ({
        id: `e-${i}`,
        source: e.source,
        target: e.target,
        label: e.label,
        style: { stroke: "#cbd5e1" },
        labelStyle: { fill: "#64748b", fontSize: 10 },
      })),
    [graph.edges],
  );

  return (
    <div className="relative h-full w-full">
      {isDemo && (
        <div className="absolute left-4 top-4 z-20">
          <Badge tone="warning" className="text-sm normal-case tracking-normal">
            DEMO DATA
          </Badge>
          <p className="mt-1 max-w-[200px] text-xs text-text-secondary">
            Sample topology — ingest clinical files to populate live graph
          </p>
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-20 rounded border border-border bg-surface/95 p-3 backdrop-blur">
        <p className="micro-label text-text-secondary">Legend</p>
        <ul className="mt-2 space-y-1.5">
          {LEGEND_ITEMS.map((item) => (
            <li key={item.type} className="flex items-center gap-2 text-xs">
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-sm border"
                style={{
                  background: `${item.color}22`,
                  borderColor: item.border,
                }}
                aria-hidden
              />
              <span className="text-text-secondary">{item.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <ReactFlowProvider>
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          fitView
          onNodeMouseEnter={(_, node) => {
            const raw = node.data as { node?: GraphNode };
            if (raw.node) setHovered(raw.node);
          }}
          onNodeMouseLeave={() => setHovered(null)}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#e2e8f0" gap={16} />
          <Controls />
        </ReactFlow>
      </ReactFlowProvider>

      <aside
        className={`absolute right-0 top-0 z-10 h-full w-80 border-l border-border bg-surface/95 p-4 backdrop-blur transition-transform duration-150 motion-reduce:transition-none ${
          hovered ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!hovered}
      >
        {hovered && (
          <>
            <p className="micro-label text-accent">{hovered.type ?? "entity"}</p>
            <h3 className="mt-2 text-lg font-medium">{hovered.label}</h3>
            <p className="mt-4 text-sm leading-relaxed text-text-secondary">
              {hovered.source_text ??
                `Clinical entity linked in the patient knowledge graph. Grounded in uploaded genomic and clinical records.`}
            </p>
          </>
        )}
      </aside>
    </div>
  );
}

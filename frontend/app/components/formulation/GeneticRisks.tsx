"use client";

import type { ContraindicationDetail, GeneticRisk } from "@/app/lib/types";
import { Card } from "@/app/components/ui/Card";
import { Skeleton } from "@/app/components/ui/Skeleton";

interface GeneticRisksProps {
  risks: GeneticRisk[];
  contraindications: ContraindicationDetail[];
  loading: boolean;
  hasFormulation: boolean;
}

const SEVERITY: Record<
  string,
  { bar: string; chip: string; label: string; dot: string }
> = {
  high: {
    bar: "bg-danger",
    chip: "bg-danger/10 text-danger border-danger/30",
    label: "High risk",
    dot: "bg-danger",
  },
  moderate: {
    bar: "bg-amber-500",
    chip: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    label: "Caution",
    dot: "bg-amber-500",
  },
  info: {
    bar: "bg-accent",
    chip: "bg-accent/10 text-accent border-accent/30",
    label: "Note",
    dot: "bg-accent",
  },
};

function sev(level: string) {
  return SEVERITY[level] ?? SEVERITY.info;
}

function RiskCard({ risk }: { risk: GeneticRisk }) {
  const s = sev(risk.severity);
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-bg/50">
      <span className={`absolute inset-y-0 left-0 w-1 ${s.bar}`} aria-hidden />
      <div className="p-4 pl-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-surface px-2 py-0.5 font-mono text-sm font-semibold text-text">
            {risk.gene}
          </span>
          {risk.genotype && (
            <span className="font-mono text-xs text-text-secondary">
              {risk.genotype}
            </span>
          )}
          <span
            className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.chip}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
            {s.label}
          </span>
        </div>

        {risk.phenotype && (
          <p className="mt-2 text-sm font-medium text-text">{risk.phenotype}</p>
        )}
        <p className="mt-1 text-sm leading-relaxed text-text-secondary">
          {risk.implication}
        </p>

        {risk.affected.length > 0 && (
          <div className="mt-3">
            <p className="micro-label text-text-secondary">Affected agents</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {risk.affected.map((a) => (
                <span
                  key={a}
                  className="rounded border border-border bg-surface px-2 py-0.5 text-xs text-text-secondary"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {risk.recommendation && (
          <p className="mt-3 flex gap-2 rounded-md bg-accent/5 p-2.5 text-xs leading-relaxed text-text-secondary">
            <span className="font-semibold text-accent">Action</span>
            <span>{risk.recommendation}</span>
          </p>
        )}
      </div>
    </div>
  );
}

export function GeneticRisks({
  risks,
  contraindications,
  loading,
  hasFormulation,
}: GeneticRisksProps) {
  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <p className="micro-label text-text-secondary">
          Genetic risks &amp; contraindications
        </p>
        {(risks.length > 0 || contraindications.length > 0) && (
          <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
            {risks.length + contraindications.length} flagged
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-24 w-full bg-border" />
          <Skeleton className="h-24 w-full bg-border" />
        </div>
      ) : !hasFormulation ? (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
          <p className="text-sm font-medium text-text">Awaiting analysis</p>
          <p className="max-w-[220px] text-xs text-text-secondary">
            Generate a formulation to surface pharmacogenomic risks pulled from
            this patient&apos;s memory graph.
          </p>
        </div>
      ) : risks.length === 0 && contraindications.length === 0 ? (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-success/30 bg-success/5 py-10 text-center">
          <p className="text-sm font-medium text-success">No flags detected</p>
          <p className="max-w-[220px] text-xs text-text-secondary">
            No metabolizer or allergy risks were found in the patient graph for
            this indication.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3 overflow-y-auto">
          {risks.map((r) => (
            <RiskCard key={`${r.gene}-${r.phenotype}`} risk={r} />
          ))}

          {contraindications.length > 0 && (
            <div className="rounded-lg border border-danger/30 bg-danger/5 p-4">
              <p className="micro-label text-danger">
                Contraindicated — excluded from regimen
              </p>
              <ul className="mt-2 space-y-2">
                {contraindications.map((c) => (
                  <li key={c.drug} className="text-sm">
                    <span className="font-medium text-text line-through decoration-danger/50">
                      {c.drug}
                    </span>
                    <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                      {c.reason}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

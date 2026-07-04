"use client";

import Link from "next/link";
import type { MolecularTarget } from "@/app/lib/types";
import { Card } from "@/app/components/ui/Card";
import { Badge } from "@/app/components/ui/Badge";

interface TargetBriefProps {
  target: MolecularTarget;
  patientId: string;
}

const MECHANISM_LABEL: Record<string, string> = {
  splice: "Splicing defect",
  loss_of_function: "Loss of function",
  gain_of_function: "Gain of function",
  toxic_gain: "Toxic gain of function",
};

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-text-secondary/60">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-text">{value}</dd>
    </div>
  );
}

export function TargetBrief({ target, patientId }: TargetBriefProps) {
  if (!target.identified) {
    return (
      <Card className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <Badge tone="default">No n-of-1 target</Badge>
        <p className="text-base font-medium text-text">
          No monogenic target identified
        </p>
        <p className="max-w-md text-sm leading-relaxed text-text-secondary">
          {target.summary ??
            "This patient's graph has no single-gene disease driver to design an individualized therapeutic against."}
        </p>
        <Link
          href={`/patients/${patientId}/formulation`}
          className="mt-1 rounded-md border border-accent/40 px-3 py-1.5 text-sm text-accent transition-colors hover:bg-accent/5"
        >
          Go to Formulation →
        </Link>
      </Card>
    );
  }

  const mech = target.mechanism
    ? (MECHANISM_LABEL[target.mechanism] ?? target.mechanism)
    : null;

  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <p className="micro-label text-text-secondary">Molecular target</p>
        <Badge tone="accent">Monogenic</Badge>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-xl font-semibold text-text">
          {target.gene}
        </span>
        {target.variant && (
          <span className="font-mono text-sm text-text-secondary">
            {target.variant}
          </span>
        )}
      </div>
      {target.disease && (
        <p className="mt-1 text-sm text-text-secondary">{target.disease}</p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        <Field label="Mechanism" value={mech} />
        <Field label="Tissue" value={target.tissue} />
        <Field label="Inheritance" value={target.inheritance} />
        <Field label="Consequence" value={target.consequence} />
      </dl>
    </Card>
  );
}

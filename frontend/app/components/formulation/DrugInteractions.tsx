"use client";

import type { DrugInteraction } from "@/app/lib/types";
import { Card } from "@/app/components/ui/Card";

interface DrugInteractionsProps {
  interactions: DrugInteraction[];
}

const SEVERITY: Record<string, { chip: string; label: string; bar: string }> = {
  major: {
    chip: "bg-danger/10 text-danger border-danger/30",
    label: "Major",
    bar: "bg-danger",
  },
  moderate: {
    chip: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    label: "Moderate",
    bar: "bg-amber-500",
  },
  minor: {
    chip: "bg-accent/10 text-accent border-accent/30",
    label: "Minor",
    bar: "bg-accent",
  },
};

function sev(level: string) {
  return SEVERITY[level] ?? SEVERITY.moderate;
}

export function DrugInteractions({ interactions }: DrugInteractionsProps) {
  if (interactions.length === 0) return null;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <p className="micro-label text-text-secondary">
          Drug–drug interaction screening
        </p>
        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
          {interactions.length} found
        </span>
      </div>
      <p className="mt-1 text-xs text-text-secondary">
        Automated pairwise screen across the assembled regimen.
      </p>

      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {interactions.map((i) => {
          const s = sev(i.severity);
          return (
            <li
              key={`${i.drug_a}-${i.drug_b}`}
              className="relative overflow-hidden rounded-lg border border-border bg-bg/50 p-3 pl-4"
            >
              <span className={`absolute inset-y-0 left-0 w-1 ${s.bar}`} aria-hidden />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-text">
                  {i.drug_a} <span className="text-text-secondary/60">+</span>{" "}
                  {i.drug_b}
                </span>
                <span
                  className={`ml-auto rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.chip}`}
                >
                  {s.label}
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
                {i.effect}
              </p>
              <p className="mt-1.5 flex gap-1.5 text-xs leading-relaxed text-text-secondary">
                <span className="font-semibold text-accent">Manage</span>
                <span>{i.management}</span>
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

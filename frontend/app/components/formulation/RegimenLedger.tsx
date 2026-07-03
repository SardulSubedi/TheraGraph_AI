"use client";

import type { Formulation, Module } from "@/app/lib/types";
import { Card } from "@/app/components/ui/Card";
import { Badge } from "@/app/components/ui/Badge";

interface RegimenLedgerProps {
  formulation: Formulation | null;
}

const SEGMENT_COLORS = ["#0e7490", "#0891b2", "#06b6d4", "#22d3ee", "#155e75"];

function CompositionBar({ modules }: { modules: Module[] }) {
  const active = modules.filter((m) => m.ratio > 0);
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-border">
        {active.map((m, i) => (
          <div
            key={m.component_id}
            className="h-full transition-all duration-500 motion-reduce:transition-none"
            style={{
              width: `${m.ratio * 100}%`,
              background: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
            }}
            title={`${m.ingredient ?? m.component_id}: ${(m.ratio * 100).toFixed(0)}%`}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {active.map((m, i) => (
          <li
            key={m.component_id}
            className="flex items-center gap-1.5 text-xs text-text-secondary"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
              aria-hidden
            />
            {m.ingredient ?? m.name ?? m.component_id}
            <span className="text-text-secondary/60">
              {(m.ratio * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DrugCard({ module }: { module: Module }) {
  return (
    <div className="rounded-lg border border-border bg-bg/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text">
            {module.ingredient ?? module.name ?? module.component_id}
            {module.brand_examples && (
              <span className="ml-1.5 text-xs font-normal text-text-secondary">
                ({module.brand_examples})
              </span>
            )}
          </p>
          {module.drug_class && (
            <p className="mt-0.5 text-xs text-text-secondary">
              {module.drug_class}
            </p>
          )}
        </div>
        <div className="flex-none text-right">
          <p className="text-lg font-semibold text-accent">
            {module.dose_mg != null ? `${module.dose_mg} mg` : "—"}
          </p>
          {module.strength_mg != null && (
            <p className="text-[11px] text-text-secondary">
              {module.strength_mg} mg {module.form?.toLowerCase()}
            </p>
          )}
        </div>
      </div>

      {module.sig && (
        <div className="mt-3 rounded-md border border-border bg-surface px-3 py-2">
          <span className="micro-label text-accent">Sig</span>
          <p className="mt-0.5 text-sm text-text">{module.sig}</p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
        {module.route && (
          <span>
            <span className="text-text-secondary/60">Route</span> {module.route}
          </span>
        )}
        {module.daily_dose_mg != null && (
          <span>
            <span className="text-text-secondary/60">Daily</span>{" "}
            {module.daily_dose_mg} mg
            {module.max_daily_mg != null && (
              <span className="text-text-secondary/60">
                {" "}
                / max {module.max_daily_mg} mg
              </span>
            )}
          </span>
        )}
      </div>

      {module.dose_note && (
        <p className="mt-2 flex gap-2 rounded-md bg-amber-500/10 px-2.5 py-1.5 text-xs leading-relaxed text-amber-700">
          <span aria-hidden>▲</span>
          {module.dose_note}
        </p>
      )}

      {module.mechanism && (
        <p className="mt-3 text-xs leading-relaxed text-text-secondary">
          {module.mechanism}
        </p>
      )}
    </div>
  );
}

export function RegimenLedger({ formulation }: RegimenLedgerProps) {
  if (!formulation) {
    return (
      <Card className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 text-center">
        <p className="text-base font-medium text-text">No regimen yet</p>
        <p className="max-w-xs text-sm text-text-secondary">
          Enter an indication and generate a personalized regimen of named
          agents with exact doses and directions.
        </p>
      </Card>
    );
  }

  const active = formulation.modules.filter((m) => m.ratio > 0);

  return (
    <Card className="flex flex-col gap-5">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="micro-label text-text-secondary">Personalized regimen</p>
            <p className="mt-1 text-sm font-medium text-text">
              {formulation.indication}
            </p>
          </div>
          <Badge tone="accent">{active.length} agents</Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-text-secondary">
          {formulation.dosage_form && (
            <span>
              <span className="text-text-secondary/60">Form</span>{" "}
              {formulation.dosage_form}
            </span>
          )}
          {formulation.total_daily_mg != null && (
            <span>
              <span className="text-text-secondary/60">Total active</span>{" "}
              {formulation.total_daily_mg} mg/day
            </span>
          )}
        </div>
      </div>

      <div>
        <p className="micro-label text-text-secondary">
          Composition (by daily active mass)
        </p>
        <div className="mt-3">
          <CompositionBar modules={formulation.modules} />
        </div>
      </div>

      <div className="space-y-3">
        {active.map((m) => (
          <DrugCard key={m.component_id} module={m} />
        ))}
      </div>
    </Card>
  );
}

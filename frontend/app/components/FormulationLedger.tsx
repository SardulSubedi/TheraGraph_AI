"use client";

import type { Formulation, Module } from "@/app/lib/types";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Badge } from "@/app/components/ui/Badge";
import { toast } from "@/app/components/ui/Toast";

interface FormulationLedgerProps {
  formulation: Formulation | null;
}

// On-palette cyan family — distinct enough to read segments apart.
const SEGMENT_COLORS = [
  "#06b6d4",
  "#22d3ee",
  "#0891b2",
  "#67e8f9",
  "#0e7490",
];

function CompositionDonut({ modules }: { modules: Module[] }) {
  const active = modules.filter((m) => m.ratio > 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;

  const dashes = active.map((m) => m.ratio * circumference);
  const segments = active.map((m, i) => ({
    id: m.component_id,
    dash: dashes[i],
    startOffset: dashes.slice(0, i).reduce((a, b) => a + b, 0),
    color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
    pct: (m.ratio * 100).toFixed(1),
  }));

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-40 w-40 flex-none">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="16"
          />
          {segments.map((s) => (
            <circle
              key={s.id}
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth="16"
              strokeDasharray={`${s.dash} ${circumference - s.dash}`}
              strokeDashoffset={-s.startOffset}
              className="transition-all duration-500 motion-reduce:transition-none"
            >
              <title>{`${s.id}: ${s.pct}%`}</title>
            </circle>
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold text-text">
            {active.length}
          </span>
          <span className="micro-label text-text-secondary">
            {active.length === 1 ? "module" : "modules"}
          </span>
        </div>
      </div>

      <ul className="flex-1 space-y-2">
        {active.map((m, i) => (
          <li key={m.component_id} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block h-3 w-3 flex-none rounded-sm"
              style={{ background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
              aria-hidden
            />
            <span className="flex-1 truncate text-text-secondary">
              {m.name ?? m.component_id}
            </span>
            <span className="font-medium text-text">
              {(m.ratio * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ModuleCard({ module, color }: { module: Module; color: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text">
            {module.name ?? module.component_id}
          </p>
          <p className="mt-0.5 font-mono text-xs text-text-secondary">
            {module.component_id}
          </p>
        </div>
        <span
          className="flex-none rounded-md px-2 py-1 text-xs font-semibold text-bg"
          style={{ background: color }}
        >
          {(module.ratio * 100).toFixed(0)}%
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {module.drug_class && (
          <Badge tone="default">{module.drug_class}</Badge>
        )}
        <span className="text-sm font-medium text-accent">
          {module.mass_mg != null ? `${module.mass_mg} mg` : "—"}
        </span>
        {module.route && (
          <span className="text-xs text-text-secondary">· {module.route}</span>
        )}
      </div>

      {module.mechanism && (
        <p className="mt-3 text-xs leading-relaxed text-text-secondary">
          {module.mechanism}
        </p>
      )}
      {module.pathway && (
        <p className="mt-2 micro-label text-text-secondary">
          Pathway · <span className="text-text-secondary">{module.pathway}</span>
        </p>
      )}
    </div>
  );
}

export function FormulationLedger({ formulation }: FormulationLedgerProps) {
  if (!formulation) {
    return (
      <Card className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 text-center">
        <p className="text-lg font-medium text-text">No formulation yet</p>
        <p className="max-w-xs text-sm text-text-secondary">
          Enter an indication and generate a modular compound to view the
          composition, per-module mechanism, and delivery payload.
        </p>
      </Card>
    );
  }

  const payload = JSON.stringify(formulation, null, 2);
  const activeModules = formulation.modules.filter((m) => m.ratio > 0);
  const totalMass = formulation.modules.reduce(
    (sum, m) => sum + (m.mass_mg ?? 0),
    0,
  );
  const contraindications = formulation.contraindications_flagged ?? [];
  const safetyNotes = formulation.safety_notes ?? [];

  const copyPayload = async () => {
    try {
      await navigator.clipboard.writeText(payload);
      toast("JSON copied — ready for manufacturing partner", { type: "success" });
    } catch {
      toast("Copy failed", { type: "danger" });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="micro-label text-text-secondary">
              Personalized compound
            </p>
            <p className="mt-1 text-sm text-text">{formulation.indication}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-accent">
              {totalMass > 0 ? `${totalMass.toFixed(1)}` : "—"}
              {totalMass > 0 && (
                <span className="ml-1 text-sm text-text-secondary">mg</span>
              )}
            </p>
            <p className="font-mono text-[10px] text-text-secondary">
              {formulation.formulation_id}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <CompositionDonut modules={formulation.modules} />
        </div>
      </Card>

      <Card>
        <p className="micro-label text-text-secondary">Module breakdown</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {activeModules.map((m, i) => (
            <ModuleCard
              key={m.component_id}
              module={m}
              color={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
            />
          ))}
        </div>
      </Card>

      {(contraindications.length > 0 || safetyNotes.length > 0) && (
        <Card className="border-danger/30 bg-danger/5">
          <p className="micro-label text-danger">
            Safety filter · excluded from mix
          </p>
          {contraindications.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {contraindications.map((c) => (
                <li key={c}>
                  <Badge
                    tone="danger"
                    className="line-through decoration-danger/60"
                  >
                    {c}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          {safetyNotes.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {safetyNotes.map((note) => (
                <li
                  key={note}
                  className="flex gap-2 text-xs leading-relaxed text-text-secondary"
                >
                  <span className="mt-0.5 text-danger" aria-hidden>
                    ▸
                  </span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {formulation.rationale && (
        <Card>
          <p className="micro-label text-text-secondary">Clinical rationale</p>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            {formulation.rationale}
          </p>
        </Card>
      )}

      <Card>
        <p className="micro-label text-text-secondary">Delivery payload</p>
        <pre className="mt-2 max-h-48 overflow-auto rounded bg-bg p-3 font-mono text-xs leading-relaxed text-text-secondary">
          {payload}
        </pre>
        <Button className="mt-4 w-full" onClick={() => void copyPayload()}>
          Send to Manufacturing Partner
        </Button>
      </Card>
    </div>
  );
}

"use client";

import type { Formulation } from "@/app/lib/types";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Badge } from "@/app/components/ui/Badge";
import { toast } from "@/app/components/ui/Toast";

interface FormulationLedgerProps {
  formulation: Formulation | null;
}

const BAR_SHADES = [
  "bg-accent",
  "bg-accent/80",
  "bg-accent/60",
  "bg-accent/45",
  "bg-accent/30",
];

function RatioBar({ formulation }: { formulation: Formulation }) {
  const modules = formulation.modules.filter((m) => m.ratio > 0);

  return (
    <div className="mt-4">
      <p className="micro-label text-text-secondary">Composition Ratio</p>
      <div
        className="mt-2 flex h-8 w-full overflow-hidden rounded border border-border"
        role="img"
        aria-label="Module ratio composition bar"
      >
        {modules.map((m, i) => (
          <div
            key={m.component_id}
            className={`${BAR_SHADES[i % BAR_SHADES.length]} relative flex items-center justify-center transition-all duration-150 motion-reduce:transition-none`}
            style={{ width: `${m.ratio * 100}%`, minWidth: m.ratio > 0 ? "2rem" : 0 }}
            title={`${m.component_id}: ${(m.ratio * 100).toFixed(1)}%`}
          >
            {m.ratio >= 0.12 && (
              <span className="truncate px-1 text-[10px] font-medium text-bg">
                {(m.ratio * 100).toFixed(0)}%
              </span>
            )}
          </div>
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {modules.map((m, i) => (
          <li key={m.component_id} className="flex items-center gap-1.5 text-xs">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-sm ${BAR_SHADES[i % BAR_SHADES.length]}`}
              aria-hidden
            />
            <span className="text-text-secondary">
              {m.component_id}{" "}
              <span className="text-accent">{(m.ratio * 100).toFixed(1)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FormulationLedger({ formulation }: FormulationLedgerProps) {
  if (!formulation) {
    return (
      <Card className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 text-center">
        <p className="text-lg font-medium text-text">No formulation yet</p>
        <p className="max-w-xs text-sm text-text-secondary">
          Enter an indication and generate a modular compound to view the ledger,
          ratios, and delivery payload.
        </p>
      </Card>
    );
  }

  const payload = JSON.stringify(formulation, null, 2);
  const totalMass = formulation.modules.reduce(
    (sum, m) => sum + (m.mass_mg ?? 0),
    0,
  );
  const contraindications = formulation.contraindications_flagged ?? [];

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
        <p className="micro-label text-text-secondary">Modular Ledger</p>
        <p className="mt-1 text-sm text-text-secondary">{formulation.indication}</p>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="micro-label text-text-secondary">Total Mass</span>
          <span className="text-2xl font-semibold text-accent">
            {totalMass > 0 ? `${totalMass.toFixed(1)} mg` : "—"}
          </span>
        </div>

        <RatioBar formulation={formulation} />

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="micro-label pb-2 text-text-secondary">Component</th>
                <th className="micro-label pb-2 text-text-secondary">Ratio</th>
                <th className="micro-label pb-2 text-text-secondary">Mass (mg)</th>
              </tr>
            </thead>
            <tbody>
              {formulation.modules.map((m) => (
                <tr key={m.component_id} className="border-b border-border/50">
                  <td className="py-2 font-medium">{m.component_id}</td>
                  <td className="py-2 text-accent">
                    {(m.ratio * 100).toFixed(1)}%
                  </td>
                  <td className="py-2 font-medium text-text">
                    {m.mass_mg != null ? `${m.mass_mg} mg` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {contraindications.length > 0 && (
          <div className="mt-4 rounded border border-danger/30 bg-danger/5 p-3">
            <p className="micro-label text-danger">Contraindicated — excluded</p>
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
            <p className="mt-2 text-xs text-text-secondary">
              Flagged components excluded from active mix
            </p>
          </div>
        )}

        {formulation.rationale && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="micro-label text-text-secondary">Rationale</p>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              {formulation.rationale}
            </p>
          </div>
        )}
      </Card>

      <Card>
        <p className="micro-label text-text-secondary">Delivery Payload</p>
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

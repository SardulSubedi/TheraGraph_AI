"use client";

import { useState } from "react";
import type { Formulation } from "@/app/lib/types";
import { Card } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Modal } from "@/app/components/ui/Modal";
import { toast } from "@/app/components/ui/Toast";

interface ClinicalReportProps {
  formulation: Formulation | null;
  patientName: string;
}

function RationaleBlock({ text }: { text: string }) {
  // The backend formats the rationale as "Label — body" paragraphs separated by blank lines.
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  return (
    <div className="space-y-3">
      {paragraphs.map((p, i) => {
        const dashIdx = p.indexOf("—");
        const colonIdx = p.indexOf(":");
        const splitIdx =
          dashIdx > 0 && (colonIdx < 0 || dashIdx < colonIdx)
            ? dashIdx
            : colonIdx;
        if (splitIdx > 0 && splitIdx < 40) {
          return (
            <p key={i} className="text-sm leading-relaxed text-text-secondary">
              <span className="font-semibold text-text">
                {p.slice(0, splitIdx).trim()}
              </span>
              {" — "}
              {p.slice(splitIdx + 1).trim()}
            </p>
          );
        }
        return (
          <p key={i} className="text-sm leading-relaxed text-text-secondary">
            {p}
          </p>
        );
      })}
    </div>
  );
}

export function ClinicalReport({ formulation, patientName }: ClinicalReportProps) {
  const [showJson, setShowJson] = useState(false);

  if (!formulation) {
    return (
      <Card className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 text-center">
        <p className="text-base font-medium text-text">Clinical report</p>
        <p className="max-w-xs text-sm text-text-secondary">
          The clinical rationale, monitoring plan, and exportable delivery
          payload appear here after you generate a regimen.
        </p>
      </Card>
    );
  }

  const payload = JSON.stringify(formulation, null, 2);
  const generated = formulation.generated_at
    ? new Date(formulation.generated_at).toLocaleString()
    : "—";

  const copyPayload = async () => {
    try {
      await navigator.clipboard.writeText(payload);
      toast("Delivery JSON copied — ready for compounding partner", {
        type: "success",
      });
    } catch {
      toast("Copy failed", { type: "danger" });
    }
  };

  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
        <div>
          <p className="micro-label text-text-secondary">Clinical report</p>
          <h3 className="mt-1 text-base font-semibold text-text">
            {patientName}
          </h3>
        </div>
        <Button variant="secondary" onClick={() => setShowJson(true)}>
          Export
        </Button>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <dt className="text-text-secondary/60">Formulation ID</dt>
          <dd className="font-mono text-text-secondary">
            {formulation.formulation_id}
          </dd>
        </div>
        <div>
          <dt className="text-text-secondary/60">Lot</dt>
          <dd className="font-mono text-text-secondary">
            {formulation.lot_number ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-text-secondary/60">Route</dt>
          <dd className="text-text-secondary">{formulation.route ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-text-secondary/60">Generated</dt>
          <dd className="text-text-secondary">{generated}</dd>
        </div>
      </dl>

      <div className="mt-4 space-y-4 overflow-y-auto pr-1">
        <section>
          <p className="micro-label text-text-secondary">Clinical rationale</p>
          <div className="mt-2">
            <RationaleBlock text={formulation.rationale} />
          </div>
        </section>

        {formulation.modules.length > 0 && (
          <section>
            <p className="micro-label text-text-secondary">Directions (Sig)</p>
            <ul className="mt-2 space-y-1.5">
              {formulation.modules
                .filter((m) => m.ratio > 0)
                .map((m) => (
                  <li
                    key={m.component_id}
                    className="flex gap-2 text-sm text-text-secondary"
                  >
                    <span className="text-accent" aria-hidden>
                      ℞
                    </span>
                    <span>
                      <span className="font-medium text-text">
                        {m.ingredient ?? m.name}
                      </span>{" "}
                      — {m.sig}
                    </span>
                  </li>
                ))}
            </ul>
          </section>
        )}

        {formulation.monitoring && formulation.monitoring.length > 0 && (
          <section>
            <p className="micro-label text-text-secondary">Monitoring plan</p>
            <ul className="mt-2 space-y-1.5">
              {formulation.monitoring.map((m) => (
                <li
                  key={m}
                  className="flex gap-2 text-sm leading-relaxed text-text-secondary"
                >
                  <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-accent" />
                  {m}
                </li>
              ))}
            </ul>
          </section>
        )}

        {formulation.safety_notes && formulation.safety_notes.length > 0 && (
          <section className="rounded-lg border border-danger/20 bg-danger/5 p-3">
            <p className="micro-label text-danger">Safety notes</p>
            <ul className="mt-2 space-y-1.5">
              {formulation.safety_notes.map((n) => (
                <li
                  key={n}
                  className="text-xs leading-relaxed text-text-secondary"
                >
                  {n}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <p className="mt-4 border-t border-border pt-3 text-[11px] italic text-text-secondary/70">
        Prototype — not for clinical use. Generated by TheraGraph AI from the
        patient&apos;s memory graph.
      </p>

      <Modal
        open={showJson}
        onClose={() => setShowJson(false)}
        title="Delivery payload (JSON)"
      >
        <p className="text-xs text-text-secondary">
          Structured spec for a compounding pharmacy / CDMO partner.
        </p>
        <pre className="mt-3 max-h-[50vh] overflow-auto rounded bg-bg p-3 font-mono text-xs leading-relaxed text-text-secondary">
          {payload}
        </pre>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => void copyPayload()}>
            Send to manufacturing partner
          </Button>
          <Button variant="ghost" onClick={() => setShowJson(false)}>
            Close
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

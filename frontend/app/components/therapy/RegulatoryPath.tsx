"use client";

import { useState } from "react";
import type { CustomTherapy } from "@/app/lib/types";
import { Card } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Modal } from "@/app/components/ui/Modal";
import { toast } from "@/app/components/ui/Toast";

interface RegulatoryPathProps {
  therapy: CustomTherapy;
}

const STATUS: Record<string, string> = {
  addressed: "border-success/30 bg-success/10 text-success",
  partial: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  pending: "border-border bg-surface text-text-secondary",
};

export function RegulatoryPath({ therapy }: RegulatoryPathProps) {
  const [showJson, setShowJson] = useState(false);
  const payload = JSON.stringify(therapy, null, 2);

  const copyBrief = async () => {
    try {
      await navigator.clipboard.writeText(payload);
      toast("Design brief copied — ready for the manufacturing / regulatory partner", {
        type: "success",
      });
    } catch {
      toast("Copy failed", { type: "danger" });
    }
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
        <div>
          <p className="micro-label text-text-secondary">
            Regulatory & manufacturing path
          </p>
          {therapy.regulatory_framework && (
            <p className="mt-1 text-sm font-medium text-text">
              {therapy.regulatory_framework}
            </p>
          )}
        </div>
        <Button variant="secondary" onClick={() => setShowJson(true)}>
          Export brief
        </Button>
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <section>
          <p className="micro-label text-text-secondary">
            Plausible-mechanism criteria
          </p>
          <ul className="mt-2 space-y-2">
            {therapy.regulatory_criteria.map((c) => (
              <li key={c.criterion} className="text-sm">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-text">{c.criterion}</span>
                  <span
                    className={`flex-none rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${
                      STATUS[c.status] ?? STATUS.pending
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                  {c.detail}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <p className="micro-label text-text-secondary">Manufacturing plan</p>
          <ol className="mt-2 space-y-1.5">
            {therapy.manufacturing.map((m, i) => (
              <li key={m} className="flex gap-2 text-sm text-text-secondary">
                <span className="font-mono text-xs text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="leading-relaxed">{m}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {therapy.disclaimers.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="micro-label text-amber-700">Honesty guardrails</p>
          <ul className="mt-1.5 space-y-1">
            {therapy.disclaimers.map((d) => (
              <li key={d} className="text-xs leading-relaxed text-text-secondary">
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal
        open={showJson}
        onClose={() => setShowJson(false)}
        title="n-of-1 design brief (JSON)"
      >
        <p className="text-xs text-text-secondary">
          Structured, illustrative design brief — for discussion with a CDMO / regulatory
          partner. Not an orderable therapeutic.
        </p>
        <pre className="mt-3 max-h-[50vh] overflow-auto rounded bg-bg p-3 font-mono text-xs leading-relaxed text-text-secondary">
          {payload}
        </pre>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => void copyBrief()}>Copy design brief</Button>
          <Button variant="ghost" onClick={() => setShowJson(false)}>
            Close
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

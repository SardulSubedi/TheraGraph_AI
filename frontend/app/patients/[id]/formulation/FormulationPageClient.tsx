"use client";

import { useState } from "react";
import { formulate } from "@/app/lib/api";
import type { Formulation } from "@/app/lib/types";
import { GeneticRisks } from "@/app/components/formulation/GeneticRisks";
import { RegimenLedger } from "@/app/components/formulation/RegimenLedger";
import { ClinicalReport } from "@/app/components/formulation/ClinicalReport";
import { DrugInteractions } from "@/app/components/formulation/DrugInteractions";
import { PatientChat } from "@/app/components/formulation/PatientChat";
import { Card } from "@/app/components/ui/Card";
import { Skeleton } from "@/app/components/ui/Skeleton";
import { Toaster } from "@/app/components/ui/Toast";

interface FormulationPageClientProps {
  patientId: string;
  patientName: string;
}

export function FormulationPageClient({
  patientId,
  patientName,
}: FormulationPageClientProps) {
  const [indication, setIndication] = useState(
    "chronic inflammatory joint pain (rheumatoid-type)",
  );
  const [formulation, setFormulation] = useState<Formulation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await formulate(patientId, indication);
      setFormulation(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Formulation failed");
    } finally {
      setBusy(false);
    }
  };

  const risks = formulation?.genetic_risks ?? [];
  const contraindications = formulation?.contraindication_details ?? [];

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4 p-4 lg:p-6">
      <Toaster />

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="indication" className="micro-label text-text-secondary">
              Synthesis console · indication
            </label>
            <input
              id="indication"
              value={indication}
              onChange={(e) => setIndication(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void generate();
              }}
              placeholder="e.g. anticoagulation for atrial fibrillation"
              className="mt-1.5 w-full rounded-md border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none transition-colors focus:border-accent/50"
            />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void generate()}
            className="rounded-md bg-accent px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy ? "Synthesizing…" : "Generate regimen"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <GeneticRisks
          risks={risks}
          contraindications={contraindications}
          loading={busy}
          hasFormulation={formulation !== null}
        />

        {busy ? (
          <Card className="flex min-h-[320px] flex-col gap-3">
            <Skeleton className="h-4 w-32 bg-border" />
            <Skeleton className="h-3 w-full bg-border" />
            <Skeleton className="h-24 w-full bg-border" />
            <Skeleton className="h-24 w-full bg-border" />
          </Card>
        ) : (
          <RegimenLedger formulation={formulation} />
        )}

        <ClinicalReport formulation={formulation} patientName={patientName} />
      </div>

      {formulation?.drug_interactions &&
        formulation.drug_interactions.length > 0 && (
          <DrugInteractions interactions={formulation.drug_interactions} />
        )}

      <PatientChat
        patientId={patientId}
        patientName={patientName}
        indication={indication}
      />
    </div>
  );
}

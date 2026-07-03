"use client";

import { useState } from "react";
import { formulate } from "@/app/lib/api";
import type { Formulation } from "@/app/lib/types";
import { FormulationLedger } from "@/app/components/FormulationLedger";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Badge } from "@/app/components/ui/Badge";
import { Input } from "@/app/components/ui/Input";
import { Skeleton } from "@/app/components/ui/Skeleton";
import { Toaster } from "@/app/components/ui/Toast";

interface FormulationPageClientProps {
  patientId: string;
}

export function FormulationPageClient({
  patientId,
}: FormulationPageClientProps) {
  const [indication, setIndication] = useState("chronic inflammatory pain");
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

  const contraindications = formulation?.contraindications_flagged ?? [];

  return (
    <div className="grid min-h-[calc(100vh-120px)] gap-4 p-4 lg:grid-cols-3">
      <Toaster />
      <Card className="flex flex-col gap-3">
        <p className="micro-label text-text-secondary">
          Genetic Risks & Contraindications
        </p>
        {busy ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-full bg-border" />
            <Skeleton className="h-6 w-3/4 bg-border" />
          </div>
        ) : contraindications.length === 0 ? (
          <p className="text-sm text-text-secondary">
            {formulation
              ? "No contraindications flagged for this formulation."
              : "Generate a formulation to surface flagged risks from the patient graph."}
          </p>
        ) : (
          <ul className="space-y-2">
            {contraindications.map((c) => (
              <li key={c}>
                <Badge tone="danger">{c}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <p className="micro-label text-text-secondary">Synthesis Console</p>
          <div className="mt-3">
            <Input
              label="Indication"
              value={indication}
              onChange={(e) => setIndication(e.target.value)}
            />
          </div>
          <Button
            className="mt-3"
            disabled={busy}
            onClick={() => void generate()}
          >
            {busy ? "Generating…" : "Generate"}
          </Button>
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        </Card>
        {busy ? (
          <Card className="flex min-h-[320px] flex-col gap-3">
            <Skeleton className="h-4 w-32 bg-border" />
            <Skeleton className="h-8 w-24 bg-border" />
            <Skeleton className="h-6 w-full bg-border" />
            <Skeleton className="h-32 w-full bg-border" />
          </Card>
        ) : (
          <FormulationLedger formulation={formulation} />
        )}
      </div>

      <Card>
        <p className="micro-label text-text-secondary">Delivery JSON</p>
        {busy ? (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-full bg-border" />
            <Skeleton className="h-4 w-full bg-border" />
            <Skeleton className="h-4 w-5/6 bg-border" />
            <Skeleton className="h-4 w-4/6 bg-border" />
          </div>
        ) : formulation ? (
          <pre className="mt-2 max-h-[calc(100vh-200px)] overflow-auto rounded bg-bg p-3 font-mono text-xs leading-relaxed text-text-secondary">
            {JSON.stringify(formulation, null, 2)}
          </pre>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-2 text-center">
            <p className="text-lg font-medium text-text">No formulation yet</p>
            <p className="max-w-xs text-sm text-text-secondary">
              JSON payload for CDMO / compounding partner appears here after
              generation.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

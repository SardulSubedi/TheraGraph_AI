"use client";

import { useState } from "react";
import { designTherapy } from "@/app/lib/api";
import type { CustomTherapy } from "@/app/lib/types";
import { Card } from "@/app/components/ui/Card";
import { Skeleton } from "@/app/components/ui/Skeleton";
import { Toaster } from "@/app/components/ui/Toast";
import { TargetBrief } from "@/app/components/therapy/TargetBrief";
import { ReasoningTrace } from "@/app/components/therapy/ReasoningTrace";
import { ModalityCard } from "@/app/components/therapy/ModalityCard";
import { ConstructDesign } from "@/app/components/therapy/ConstructDesign";
import { DeliverySafety } from "@/app/components/therapy/DeliverySafety";
import { RegulatoryPath } from "@/app/components/therapy/RegulatoryPath";

interface TherapyPageClientProps {
  patientId: string;
  patientName: string;
}

const MODALITIES = [
  { id: "", label: "Auto (agent selects)" },
  { id: "ASO_SPLICE", label: "Splice-switching ASO" },
  { id: "ASO_GAPMER", label: "Gapmer ASO (knockdown)" },
  { id: "SIRNA", label: "GalNAc-siRNA" },
  { id: "MRNA_LNP", label: "mRNA (LNP)" },
  { id: "AAV_GENE_ADDITION", label: "AAV gene addition" },
  { id: "BASE_EDITOR", label: "CRISPR base editor" },
  { id: "PRIME_EDITOR", label: "Prime editor" },
];

export function TherapyPageClient({
  patientId,
  patientName,
}: TherapyPageClientProps) {
  const [goal, setGoal] = useState(
    "Design an n-of-1 therapy that addresses this patient's underlying genetic disease.",
  );
  const [preferred, setPreferred] = useState("");
  const [therapy, setTherapy] = useState<CustomTherapy | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const design = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await designTherapy(patientId, {
        goal,
        preferred_modality: preferred || null,
      });
      setTherapy(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Design failed");
    } finally {
      setBusy(false);
    }
  };

  const hasDesign = therapy?.target.identified && therapy.modality_name;

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4 p-4 lg:p-6">
      <Toaster />

      <Card>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="micro-label text-text-secondary">
              Custom Therapy · n-of-1 design agent
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              Designs a bespoke therapeutic for {patientName} from their molecular
              graph — a custom molecule, not a mix of existing drugs.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <div>
            <label htmlFor="goal" className="micro-label text-text-secondary">
              Therapeutic goal
            </label>
            <textarea
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={2}
              className="mt-1.5 w-full resize-none rounded-md border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none transition-colors focus:border-accent/50"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="sm:w-64">
              <label
                htmlFor="modality"
                className="micro-label text-text-secondary"
              >
                Modality preference
              </label>
              <select
                id="modality"
                value={preferred}
                onChange={(e) => setPreferred(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none transition-colors focus:border-accent/50"
              >
                {MODALITIES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void design()}
              className="rounded-md bg-accent px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40 sm:ml-auto"
            >
              {busy ? "Designing…" : "Design candidate therapy"}
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      </Card>

      {busy ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="flex min-h-[280px] flex-col gap-3">
            <Skeleton className="h-4 w-32 bg-border" />
            <Skeleton className="h-8 w-40 bg-border" />
            <Skeleton className="h-24 w-full bg-border" />
          </Card>
          <Card className="lg:col-span-2 flex min-h-[280px] flex-col gap-3">
            <Skeleton className="h-4 w-48 bg-border" />
            <Skeleton className="h-3 w-full bg-border" />
            <Skeleton className="h-3 w-5/6 bg-border" />
            <Skeleton className="h-3 w-4/6 bg-border" />
            <Skeleton className="h-3 w-full bg-border" />
          </Card>
        </div>
      ) : !therapy ? (
        <Card className="flex min-h-[280px] flex-col items-center justify-center gap-2 text-center">
          <p className="text-base font-medium text-text">
            No design yet
          </p>
          <p className="max-w-md text-sm text-text-secondary">
            Set a goal and run the agent. It reads the patient&apos;s graph,
            identifies the molecular target, and drafts a bespoke n-of-1
            therapeutic candidate — or tells you honestly if there isn&apos;t one.
          </p>
        </Card>
      ) : !hasDesign ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <TargetBrief target={therapy.target} patientId={patientId} />
          <div className="lg:col-span-2">
            <ReasoningTrace steps={therapy.reasoning} />
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <TargetBrief target={therapy.target} patientId={patientId} />
            <div className="lg:col-span-2">
              <ReasoningTrace steps={therapy.reasoning} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ModalityCard therapy={therapy} />
            <ConstructDesign
              blocks={therapy.construct_blocks}
              delivery={therapy.delivery_vector}
              route={therapy.delivery_route}
              deliveryRationale={therapy.delivery_rationale}
            />
            <DeliverySafety safety={therapy.safety} />
          </div>

          <RegulatoryPath therapy={therapy} />
        </>
      )}
    </div>
  );
}
